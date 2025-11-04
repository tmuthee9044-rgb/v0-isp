import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { validateAndNormalizeCIDR, validateIPAddress } from "@/lib/cidr-utils"

const sql = neon(process.env.DATABASE_URL!)

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { name, network, cidr, gateway, dns_servers, description, status } = body
    const subnetId = Number.parseInt(params.id)

    const cidrString = `${network}/${cidr}`
    const cidrValidation = validateAndNormalizeCIDR(cidrString)

    if (!cidrValidation.isValid) {
      return NextResponse.json(
        {
          error: `Invalid CIDR: ${cidrValidation.error}`,
        },
        { status: 400 },
      )
    }

    if (gateway) {
      const gatewayValidation = validateIPAddress(gateway)
      if (!gatewayValidation.isValid) {
        return NextResponse.json(
          {
            error: `Invalid gateway IP: ${gatewayValidation.error}`,
          },
          { status: 400 },
        )
      }
    }

    const existingSubnet = await sql`
      SELECT id FROM subnets 
      WHERE network = ${cidrValidation.normalized}::cidr AND id != ${subnetId}
    `

    if (existingSubnet.length > 0) {
      return NextResponse.json(
        {
          error: "A subnet with this network already exists",
        },
        { status: 409 },
      )
    }

    const [subnet] = await sql`
      UPDATE subnets 
      SET name = ${name}, 
          network = ${cidrValidation.normalized}::cidr, 
          gateway = ${gateway}::inet, 
          dns_servers = ${dns_servers}, 
          description = ${description},
          status = ${status}
      WHERE id = ${subnetId}
      RETURNING *
    `

    if (!subnet) {
      return NextResponse.json({ error: "Subnet not found" }, { status: 404 })
    }

    return NextResponse.json(subnet)
  } catch (error) {
    console.error("Error updating subnet:", error)

    if (error.message?.includes("invalid input syntax")) {
      return NextResponse.json(
        {
          error: "Invalid CIDR or IP address format",
        },
        { status: 400 },
      )
    }

    return NextResponse.json({ error: "Failed to update subnet" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const subnetId = Number.parseInt(params.id)

    const [ipCount] = await sql`
      SELECT COUNT(*) as count FROM ip_addresses 
      WHERE subnet_id = ${subnetId} AND status = 'allocated'
    `

    if (ipCount.count > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete subnet with allocated IP addresses. Please deallocate all IPs first.",
        },
        { status: 400 },
      )
    }

    await sql`DELETE FROM ip_addresses WHERE subnet_id = ${subnetId}`

    const result = await sql`DELETE FROM subnets WHERE id = ${subnetId} RETURNING id`

    if (result.length === 0) {
      return NextResponse.json({ error: "Subnet not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Subnet deleted successfully" })
  } catch (error) {
    console.error("Error deleting subnet:", error)
    return NextResponse.json({ error: "Failed to delete subnet" }, { status: 500 })
  }
}
