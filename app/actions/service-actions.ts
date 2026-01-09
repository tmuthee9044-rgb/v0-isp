"use server"

import { sql } from "@/lib/database"
import { revalidatePath } from "next/cache"

export async function getServicePlans() {
  try {
    const plans = await sql`
      SELECT 
        sp.id,
        sp.name,
        sp.description,
        sp.download_speed,
        sp.upload_speed,
        sp.price,
        sp.status,
        sp.category,
        sp.data_limit,
        sp.features,
        sp.created_at,
        COUNT(cs.id) as customer_count
      FROM service_plans sp
      LEFT JOIN customer_services cs ON sp.id = cs.service_plan_id AND cs.status = 'active'
      WHERE sp.status = 'active' 
      GROUP BY sp.id
      ORDER BY sp.price ASC
    `

    const plansWithDefaults = plans.map((plan) => ({
      ...plan,
      throttled_speed: null, // Default value since column doesn't exist
    }))

    return { success: true, data: plansWithDefaults }
  } catch (error) {
    console.error("Error fetching service plans:", error)
    return { success: false, error: "Failed to fetch service plans", data: [] }
  }
}

export async function createServicePlan(formData: FormData) {
  try {
    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const category = formData.get("category") as string
    const downloadSpeed = Number.parseInt(formData.get("download_speed") as string)
    const uploadSpeed = Number.parseInt(formData.get("upload_speed") as string)
    const price = Number.parseFloat(formData.get("price") as string)
    const dataLimit = formData.get("data_limit") ? Number.parseInt(formData.get("data_limit") as string) : null
    const features = formData.get("features") as string

    const result = await sql`
      INSERT INTO service_plans (
        name, description, download_speed, upload_speed, price, status, category, 
        data_limit, features, created_at
      ) VALUES (
        ${name}, ${description}, ${downloadSpeed}, ${uploadSpeed}, ${price}, 'active', ${category},
        ${dataLimit}, ${features}, NOW()
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
    const id = Number.parseInt(formData.get("id") as string)
    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const downloadSpeed = Number.parseInt(formData.get("download_speed") as string)
    const uploadSpeed = Number.parseInt(formData.get("upload_speed") as string)
    const price = Number.parseFloat(formData.get("price") as string)
    const dataLimit = formData.get("data_limit") ? Number.parseInt(formData.get("data_limit") as string) : null

    await sql`
      UPDATE service_plans 
      SET 
        name = ${name},
        description = ${description},
        download_speed = ${downloadSpeed},
        upload_speed = ${uploadSpeed},
        price = ${price},
        data_limit = ${dataLimit}
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
    await sql`
      UPDATE service_plans 
      SET status = 'inactive', updated_at = NOW()
      WHERE id = ${id}
    `

    revalidatePath("/services")
    return { success: true, message: "Service plan deleted successfully" }
  } catch (error) {
    console.error("Error deleting service plan:", error)
    return { success: false, error: "Failed to delete service plan" }
  }
}
