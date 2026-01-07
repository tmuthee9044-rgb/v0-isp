import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import {
  provisionRadiusUser,
  suspendRadiusUser,
  deprovisionRadiusUser,
  syncServicePlanToRadius,
} from "@/lib/radius-integration"
import { allocateIPByLocation } from "@/lib/location-ip-allocation"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sql = await getSql()
    const customerId = params.id
    const serviceData = await request.json()

    console.log("[v0] Received service data:", serviceData)

    const servicePlanId = serviceData.service_plan_id || serviceData.plan
    let ipAddress = serviceData.ip_address || serviceData.ipAddress
    const connectionType = serviceData.connection_type || serviceData.connectionType || "fiber"
    const deviceId = serviceData.device_id || serviceData.deviceId || null

    const pppoeEnabled = serviceData.pppoe_enabled === "on" || serviceData.pppoe_enabled === true
    const pppoeUsername = serviceData.pppoe_username || null
    const pppoePassword = serviceData.pppoe_password || null

    console.log("[v0] PPPoE settings:", { pppoeEnabled, pppoeUsername, hasPassword: !!pppoePassword })

    if (!ipAddress || ipAddress === "auto") {
      const allocationResult = await allocateIPByLocation(Number.parseInt(customerId))

      if (!allocationResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: allocationResult.error || "Failed to allocate IP address based on location",
          },
          { status: 400 },
        )
      }

      ipAddress = allocationResult.ip_address
      console.log(`[v0] Auto-allocated IP ${ipAddress} based on customer location`)
    }

    if (ipAddress && ipAddress !== "auto") {
      const existingIpAssignment = await sql`
        SELECT cs.id, sp.name as service_name
        FROM customer_services cs
        LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
        WHERE cs.customer_id = ${customerId} 
        AND cs.ip_address = ${ipAddress}
        AND cs.status IN ('active', 'pending', 'suspended')
        LIMIT 1
      `

      if (existingIpAssignment.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `This IP address (${ipAddress}) is already assigned to another service: ${existingIpAssignment[0].service_name || "Unknown Service"}`,
          },
          { status: 400 },
        )
      }
    }

    const [servicePlan] = await sql`
      SELECT id, price, name, download_speed, upload_speed FROM service_plans WHERE id = ${servicePlanId}
    `

    if (!servicePlan) {
      // Get count of available plans for better error message
      const availablePlans = await sql`
        SELECT id, name FROM service_plans WHERE status = 'active' ORDER BY price ASC
      `

      console.error(
        "[v0] Service plan not found. Requested ID:",
        servicePlanId,
        "Available plans:",
        availablePlans.length,
      )

      return NextResponse.json(
        {
          success: false,
          error: `Invalid service plan selected. Please select a valid service plan. (Requested: ${servicePlanId}, Available: ${availablePlans.length} plans)`,
          availablePlans: availablePlans.map((p) => ({ id: p.id, name: p.name })),
        },
        { status: 404 },
      )
    }

    console.log("[v0] Found service plan:", servicePlan)

    const monthlyFee = serviceData.monthly_fee || servicePlan.price

    const result = await sql`
      INSERT INTO customer_services (
        customer_id, service_plan_id, status, monthly_fee, 
        start_date, end_date, ip_address, device_id, 
        connection_type, config_id, mac_address, lock_to_mac,
        pppoe_username, pppoe_password, auto_renew, location_id,
        created_at
      ) VALUES (
        ${customerId}, 
        ${servicePlanId}, 
        ${serviceData.status || "active"},
        ${monthlyFee}, 
        ${serviceData.start_date || new Date().toISOString().split("T")[0]},
        ${serviceData.end_date || null},
        ${ipAddress}, 
        ${deviceId}, 
        ${connectionType},
        ${serviceData.config_id || null},
        ${serviceData.mac_address || null},
        ${serviceData.lock_to_mac === "on" || serviceData.lock_to_mac === true},
        ${pppoeUsername},
        ${pppoePassword},
        ${serviceData.auto_renew === "on" || serviceData.auto_renew === true},
        ${serviceData.location_id || null},
        NOW()
      ) RETURNING *
    `

    console.log("[v0] Service added successfully:", result[0])

    if (result[0].status === "active") {
      const [customer] = await sql`
        SELECT username, first_name, last_name, email FROM customers WHERE id = ${customerId}
      `

      if (customer) {
        const radiusUsername = pppoeEnabled && pppoeUsername ? pppoeUsername : customer.username
        const radiusPassword =
          pppoeEnabled && pppoePassword
            ? pppoePassword
            : `${customer.first_name?.toLowerCase() || "user"}${Math.floor(Math.random() * 10000)}`

        console.log("[v0] Provisioning RADIUS with username:", radiusUsername)
        console.log("[v0] Using PPPoE credentials:", {
          pppoeEnabled,
          hasUsername: !!pppoeUsername,
          hasPassword: !!pppoePassword,
        })

        if (pppoeEnabled && pppoeUsername && pppoePassword) {
          await sql`
            UPDATE customer_services
            SET pppoe_username = ${pppoeUsername}, pppoe_password = ${pppoePassword}
            WHERE id = ${result[0].id}
          `
          console.log("[v0] Saved PPPoE credentials to customer_services table")
        }

        let routerAuthMethod = "pppoe_radius" // default

        if (ipAddress && ipAddress !== "auto") {
          const routerCheck = await sql`
            SELECT nd.customer_auth_method
            FROM ip_addresses ia
            JOIN network_devices nd ON nd.id = ia.router_id
            WHERE ia.ip_address = ${ipAddress}
            LIMIT 1
          `

          if (routerCheck.length > 0) {
            routerAuthMethod = routerCheck[0].customer_auth_method || "pppoe_radius"
            console.log(`[v0] Router auth method detected: ${routerAuthMethod}`)
          }
        }

        // Only provision to RADIUS if router uses RADIUS authentication
        if (routerAuthMethod === "pppoe_radius" || routerAuthMethod === "dhcp_lease") {
          console.log("[v0] Router uses RADIUS - provisioning user to FreeRADIUS")

          const radiusResult = await provisionRadiusUser({
            username: radiusUsername,
            password: radiusPassword,
            customerId: Number.parseInt(customerId),
            serviceId: result[0].id,
            ipAddress: ipAddress !== "auto" ? ipAddress : undefined,
            downloadSpeed: servicePlan.download_speed,
            uploadSpeed: servicePlan.upload_speed,
          })

          if (radiusResult.success) {
            console.log(
              "[v0] RADIUS user provisioned successfully to FreeRADIUS tables (radcheck/radreply) for physical router authentication",
            )

            // Log activity per rule 3
            await sql`
              INSERT INTO activity_logs (action, entity_type, entity_id, details, created_at)
              VALUES (
                'create', 'customer_service', ${result[0].id},
                ${JSON.stringify({
                  customer_id: customerId,
                  service_id: result[0].id,
                  radius_username: radiusUsername,
                  pppoe_enabled: pppoeEnabled,
                  auth_method: routerAuthMethod,
                  speeds: `${servicePlan.download_speed}/${servicePlan.upload_speed}Mbps`,
                  ip_address: ipAddress,
                })},
                CURRENT_TIMESTAMP
              )
            `
          } else {
            console.error("[v0] Failed to provision RADIUS user:", radiusResult.error)
            // Don't fail the whole operation, but log the error
            await sql`
              INSERT INTO system_logs (level, category, source, message, details, created_at)
              VALUES (
                'ERROR', 'radius', 'provisioning',
                'Failed to provision RADIUS user for customer service',
                ${JSON.stringify({
                  customer_id: customerId,
                  service_id: result[0].id,
                  error: radiusResult.error,
                })},
                CURRENT_TIMESTAMP
              )
            `
          }
        } else if (routerAuthMethod === "pppoe_secrets") {
          console.log("[v0] Router uses PPPoE Secrets - skipping RADIUS provisioning")
          console.log("[v0] Credentials will be written directly to router when service is activated")

          // Log activity per rule 3
          await sql`
            INSERT INTO activity_logs (action, entity_type, entity_id, details, created_at)
            VALUES (
              'create', 'customer_service', ${result[0].id},
              ${JSON.stringify({
                customer_id: customerId,
                service_id: result[0].id,
                pppoe_username: pppoeUsername,
                pppoe_enabled: pppoeEnabled,
                auth_method: "pppoe_secrets",
                note: "Credentials stored locally on router, not in RADIUS",
                speeds: `${servicePlan.download_speed}/${servicePlan.upload_speed}Mbps`,
                ip_address: ipAddress,
              })},
              CURRENT_TIMESTAMP
            )
          `
        }
      }
    }

    return NextResponse.json({ success: true, service: result[0] })
  } catch (error) {
    console.error("[v0] Error adding service:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add service",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sql = await getSql()
    const customerId = params.id

    const services = await sql`
      SELECT 
        cs.id,
        cs.customer_id,
        cs.service_plan_id,
        cs.status,
        cs.monthly_fee,
        cs.start_date,
        cs.end_date,
        cs.ip_address,
        cs.device_id,
        cs.connection_type,
        cs.config_id,
        cs.created_at,
        cs.updated_at,
        cs.pppoe_username,
        cs.pppoe_password,
        cs.lock_to_mac,
        cs.auto_renew,
        sp.name as service_name,
        sp.description as service_description,
        sp.download_speed,
        sp.upload_speed,
        sp.data_limit,
        EXISTS(
          SELECT 1 FROM radacct ra
          WHERE ra."UserName" = c.username
          AND ra."AcctStopTime" IS NULL
          LIMIT 1
        ) as is_online,
        (
          SELECT ra."AcctStartTime"
          FROM radacct ra
          WHERE ra."UserName" = c.username
          ORDER BY ra."AcctStartTime" DESC
          LIMIT 1
        ) as last_session_at,
        EXISTS(
          SELECT 1 FROM radcheck rc
          WHERE rc."UserName" = c.username
          LIMIT 1
        ) as radius_provisioned,
        COALESCE(ab.balance, 0) as balance
      FROM customer_services cs
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      LEFT JOIN customers c ON c.id = cs.customer_id
      LEFT JOIN account_balances ab ON ab.customer_id = cs.customer_id
      WHERE cs.customer_id = ${customerId}
      ORDER BY cs.created_at DESC
    `

    return NextResponse.json({ success: true, services })
  } catch (error) {
    console.error("Error fetching services:", error)
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sql = await getSql()
    const customerId = params.id
    const { serviceId, action, ...updateData } = await request.json()

    const pppoeUsername = updateData.pppoe_username || null
    const pppoePassword = updateData.pppoe_password || null
    const pppoeEnabled = updateData.pppoe_enabled === "on" || updateData.pppoe_enabled === true

    let result

    if (action === "suspend") {
      result = await sql`
        UPDATE customer_services 
        SET status = 'suspended'
        WHERE id = ${serviceId} AND customer_id = ${customerId}
        RETURNING *
      `

      const [customer] = await sql`
        SELECT username FROM customers WHERE id = ${customerId}
      `

      if (customer?.username) {
        const radiusResult = await suspendRadiusUser({
          customerId: Number.parseInt(customerId),
          serviceId: Number.parseInt(serviceId),
          username: customer.username,
          reason: "Service suspended by admin",
        })

        console.log("[v0] RADIUS user suspended:", radiusResult)
      }
    } else if (action === "reactivate") {
      result = await sql`
        UPDATE customer_services 
        SET status = 'active'
        WHERE id = ${serviceId} AND customer_id = ${customerId}
        RETURNING *
      `

      const [customer] = await sql`
        SELECT username FROM customers WHERE id = ${customerId}
      `

      const [service] = await sql`
        SELECT cs.*, sp.download_speed, sp.upload_speed
        FROM customer_services cs
        JOIN service_plans sp ON cs.service_plan_id = sp.id
        WHERE cs.id = ${serviceId}
      `

      if (customer?.username && service) {
        const username = pppoeUsername || customer.username
        const password = pppoePassword || `${customer.username}${Math.floor(Math.random() * 10000)}`

        const radiusResult = await provisionRadiusUser({
          username,
          password,
          customerId: Number.parseInt(customerId),
          serviceId: Number.parseInt(serviceId),
          ipAddress: service.ip_address !== "auto" ? service.ip_address : undefined,
          downloadSpeed: service.download_speed,
          uploadSpeed: service.upload_speed,
        })

        console.log("[v0] RADIUS user reactivated with credentials:", radiusResult)
      }
    } else {
      const allowedFields = [
        "service_plan_id",
        "status",
        "monthly_fee",
        "start_date",
        "end_date",
        "ip_address",
        "device_id",
        "connection_type",
        "config_id",
        "pppoe_username",
        "pppoe_password",
        "lock_to_mac",
        "auto_renew",
        "mac_address",
        "location_id",
      ]
      const updateFields = []
      const updateValues = []

      Object.entries(updateData).forEach(([key, value]) => {
        if (
          value !== undefined &&
          allowedFields.includes(key) &&
          key !== "pppoe_username" &&
          key !== "pppoe_password" &&
          key !== "pppoe_enabled"
        ) {
          updateFields.push(`${key} = $${updateValues.length + 1}`)
          updateValues.push(value)
        }
      })

      if (updateFields.length > 0) {
        updateValues.push(serviceId, customerId)
        result = await sql`
          UPDATE customer_services 
          SET ${sql.unsafe(updateFields.join(", "))}
          WHERE id = $${updateValues.length - 1} AND customer_id = $${updateValues.length}
          RETURNING *
        `
      }

      if (pppoeEnabled && (pppoeUsername || pppoePassword || updateData.service_plan_id)) {
        const [customer] = await sql`
          SELECT username FROM customers WHERE id = ${customerId}
        `

        const [service] = await sql`
          SELECT cs.*, sp.download_speed, sp.upload_speed
          FROM customer_services cs
          JOIN service_plans sp ON cs.service_plan_id = sp.id
          WHERE cs.id = ${serviceId}
        `

        if (customer && service) {
          console.log("[v0] Service updated, syncing PPPoE credentials to RADIUS...")

          const username = pppoeUsername || customer.username
          const password = pppoePassword || `${customer.username}${Math.floor(Math.random() * 10000)}`

          const radiusResult = await provisionRadiusUser({
            username,
            password,
            customerId: Number.parseInt(customerId),
            serviceId: Number.parseInt(serviceId),
            ipAddress: service.ip_address !== "auto" ? service.ip_address : undefined,
            downloadSpeed: service.download_speed,
            uploadSpeed: service.upload_speed,
          })

          if (radiusResult.success) {
            console.log("[v0] RADIUS credentials updated successfully for:", username)
          } else {
            console.error("[v0] Failed to update RADIUS credentials:", radiusResult.error)
          }
        }
      } else if (updateData.service_plan_id) {
        const [customer] = await sql`
          SELECT username FROM customers WHERE id = ${customerId}
        `

        if (customer?.username) {
          console.log("[v0] Service plan changed, syncing speeds to RADIUS...")
          const radiusResult = await syncServicePlanToRadius(
            Number.parseInt(customerId),
            updateData.service_plan_id,
            customer.username,
          )

          if (radiusResult.success) {
            console.log("[v0] RADIUS speeds updated successfully for:", customer.username)
          } else {
            console.error("[v0] Failed to sync RADIUS speeds:", radiusResult.error)
          }
        }
      }
    }

    return NextResponse.json({ success: true, service: result?.[0] })
  } catch (error) {
    console.error("Error updating service:", error)
    return NextResponse.json({ error: "Failed to update service" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sql = await getSql()
    const customerId = params.id
    const { searchParams } = new URL(request.url)
    const serviceId = searchParams.get("serviceId")

    if (!serviceId) {
      return NextResponse.json({ error: "Service ID is required" }, { status: 400 })
    }

    const serviceDetails = await sql`
      SELECT cs.*, sp.name as service_name, sp.price as service_price, c.username
      FROM customer_services cs
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      LEFT JOIN customers c ON c.id = cs.customer_id
      WHERE cs.id = ${serviceId} AND cs.customer_id = ${customerId}
    `

    if (serviceDetails.length === 0) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 })
    }

    const service = serviceDetails[0]

    if (service.username) {
      const radiusResult = await deprovisionRadiusUser({
        customerId: Number.parseInt(customerId),
        serviceId: Number.parseInt(serviceId),
        username: service.username,
        reason: "Service deleted",
      })

      console.log("[v0] RADIUS user deprovisioned:", radiusResult)
    }

    const creditNoteResult = await sql`
      INSERT INTO invoices (
        customer_id,
        amount,
        subtotal,
        tax_amount,
        due_date,
        status,
        description,
        service_period_start,
        service_period_end,
        invoice_number,
        invoice_type,
        created_at
      ) VALUES (
        ${customerId},
        ${-Math.abs(service.monthly_fee || service.service_price || 0)},
        ${-Math.abs(service.monthly_fee || service.service_price || 0)},
        0,
        CURRENT_DATE,
        'paid',
        'Credit note for deleted service: ' || COALESCE(${service.service_name}, 'Unknown Service'),
        CURRENT_DATE,
        CURRENT_DATE,
        'CN-' || ${customerId} || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || ${serviceId},
        'credit_note',
        NOW()
      ) RETURNING *
    `

    await sql`
      INSERT INTO invoice_items (
        invoice_id,
        description,
        quantity,
        unit_price,
        total_amount,
        service_id
      ) VALUES (
        ${creditNoteResult[0].id},
        'Account adjustment - Service deletion credit: ' || COALESCE(${service.service_name}, 'Unknown Service'),
        1,
        ${-Math.abs(service.monthly_fee || service.service_price || 0)},
        ${-Math.abs(service.monthly_fee || service.service_price || 0)},
        ${serviceId}
      )
    `

    await sql`
      INSERT INTO account_balances (customer_id, balance, last_updated)
      VALUES (${customerId}, ${Math.abs(service.monthly_fee || service.service_price || 0)}, NOW())
      ON CONFLICT (customer_id) 
      DO UPDATE SET 
        balance = account_balances.balance + ${Math.abs(service.monthly_fee || service.service_price || 0)},
        last_updated = NOW()
    `

    await sql`
      INSERT INTO system_logs (category, message, details, created_at)
      VALUES (
        'service_deletion',
        'Service deleted with credit note issued for customer ' || ${customerId},
        jsonb_build_object(
          'customer_id', ${customerId}::integer,
          'service_id', ${serviceId}::integer,
          'credit_amount', ${Math.abs(service.monthly_fee || service.service_price || 0)},
          'credit_note_id', ${creditNoteResult[0].id}
        ),
        NOW()
      )
    `

    const result = await sql`
      DELETE FROM customer_services 
      WHERE id = ${serviceId} AND customer_id = ${customerId}
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      message: "Service deleted successfully and credit note issued",
      creditNote: creditNoteResult[0],
      creditAmount: Math.abs(service.monthly_fee || service.service_price || 0),
    })
  } catch (error) {
    console.error("Error deleting service:", error)
    return NextResponse.json({ error: "Failed to delete service" }, { status: 500 })
  }
}
