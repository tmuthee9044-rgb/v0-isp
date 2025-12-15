"use server"

import { getSql } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function getServicePlans() {
  try {
    const sql = await getSql()

    const plans = await sql`
      SELECT 
        sp.id,
        sp.name,
        sp.description,
        sp.speed_download,
        sp.speed_upload,
        sp.price,
        sp.status,
        sp.data_limit,
        sp.fup_limit,
        sp.fup_speed,
        sp.setup_fee,
        sp.billing_cycle,
        sp.currency,
        sp.contract_period,
        sp.created_at,
        sp.priority_level,
        sp.qos_enabled,
        sp.static_ip,
        sp.port_forwarding,
        sp.vpn_access,
        sp.is_active,
        COUNT(cs.id) as customer_count
      FROM service_plans sp
      LEFT JOIN customer_services cs ON sp.id = cs.service_plan_id AND cs.status = 'active'
      WHERE sp.is_active = true 
      GROUP BY sp.id, sp.name, sp.description, sp.speed_download, sp.speed_upload, 
               sp.price, sp.status, sp.data_limit, sp.fup_limit, sp.fup_speed,
               sp.setup_fee, sp.billing_cycle, sp.currency, sp.contract_period,
               sp.created_at, sp.priority_level, sp.qos_enabled, sp.static_ip,
               sp.port_forwarding, sp.vpn_access, sp.is_active
      ORDER BY sp.price ASC
    `

    if (!plans || !Array.isArray(plans)) {
      return { success: true, data: [] }
    }

    return { success: true, data: plans }
  } catch (error) {
    console.error("Error fetching service plans:", error)
    return { success: true, data: [] }
  }
}

export async function createServicePlan(formData: FormData) {
  try {
    const sql = await getSql()

    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const speedDownload = Number.parseInt(formData.get("speed_download") as string)
    const speedUpload = Number.parseInt(formData.get("speed_upload") as string)
    const price = Number.parseFloat(formData.get("price") as string)
    const dataLimit = formData.get("data_limit") ? Number.parseInt(formData.get("data_limit") as string) : null
    const setupFee = formData.get("setup_fee") ? Number.parseFloat(formData.get("setup_fee") as string) : 0

    const result = await sql`
      INSERT INTO service_plans (
        name, description, speed_download, speed_upload, price, status, 
        data_limit, setup_fee, is_active, created_at
      ) VALUES (
        ${name}, ${description}, ${speedDownload}, ${speedUpload}, ${price}, 'active',
        ${dataLimit}, ${setupFee}, true, NOW()
      ) RETURNING id
    `

    revalidatePath("/services")
    return { success: true, message: "Service plan created successfully", id: result[0].id }
  } catch (error) {
    console.error("Error creating service plan:", error)
    return { success: false, error: "Failed to create service plan" }
  }
}

export async function updateServicePlan(formData: FormData) {
  try {
    const sql = await getSql()

    const id = Number.parseInt(formData.get("id") as string)
    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const speedDownload = Number.parseInt(formData.get("speed_download") as string)
    const speedUpload = Number.parseInt(formData.get("speed_upload") as string)
    const price = Number.parseFloat(formData.get("price") as string)
    const dataLimit = formData.get("data_limit") ? Number.parseInt(formData.get("data_limit") as string) : null

    await sql`
      UPDATE service_plans 
      SET 
        name = ${name},
        description = ${description},
        speed_download = ${speedDownload},
        speed_upload = ${speedUpload},
        price = ${price},
        data_limit = ${dataLimit},
        updated_at = NOW()
      WHERE id = ${id}
    `

    revalidatePath("/services")
    return { success: true, message: "Service plan updated successfully" }
  } catch (error) {
    console.error("Error updating service plan:", error)
    return { success: false, error: "Failed to update service plan" }
  }
}

export async function deleteServicePlan(id: number) {
  try {
    const sql = await getSql()

    await sql`
      UPDATE service_plans 
      SET is_active = false, updated_at = NOW()
      WHERE id = ${id}
    `

    revalidatePath("/services")
    return { success: true, message: "Service plan deleted successfully" }
  } catch (error) {
    console.error("Error deleting service plan:", error)
    return { success: false, error: "Failed to delete service plan" }
  }
}
