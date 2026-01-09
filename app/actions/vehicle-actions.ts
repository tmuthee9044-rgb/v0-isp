"use server"

import { neon } from "@neondatabase/serverless"
import { revalidatePath } from "next/cache"

const sql = neon(process.env.DATABASE_URL!)

export async function getVehicles() {
  try {
    const vehicles = await sql`
      SELECT 
        v.*,
        COALESCE(fc.monthly_fuel_cost, 0) as fuel_cost,
        COALESCE(mc.monthly_maintenance_cost, 0) as maintenance_cost,
        (COALESCE(fc.monthly_fuel_cost, 0) + COALESCE(mc.monthly_maintenance_cost, 0)) as monthly_cost
      FROM vehicles v
      LEFT JOIN (
        SELECT 
          vehicle_id,
          SUM(cost) as monthly_fuel_cost
        FROM fuel_logs 
        WHERE DATE_TRUNC('month', log_date) = DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY vehicle_id
      ) fc ON v.id = fc.vehicle_id
      LEFT JOIN (
        SELECT 
          vehicle_id,
          SUM(cost) as monthly_maintenance_cost
        FROM maintenance_logs 
        WHERE DATE_TRUNC('month', service_date) = DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY vehicle_id
      ) mc ON v.id = mc.vehicle_id
      ORDER BY v.name
    `
    return vehicles
  } catch (error) {
    console.error("Error fetching vehicles:", error)
    return []
  }
}

export async function getVehicleStats() {
  try {
    const stats = await sql`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(*) FILTER (WHERE status = 'active') as active_vehicles,
        COUNT(*) FILTER (WHERE status = 'maintenance') as maintenance_vehicles,
        COALESCE(SUM(fc.monthly_fuel_cost), 0) as total_fuel_cost,
        COALESCE(SUM(mc.monthly_maintenance_cost), 0) as total_maintenance_cost,
        COALESCE(SUM(fc.monthly_fuel_cost), 0) + COALESCE(SUM(mc.monthly_maintenance_cost), 0) as monthly_operating_cost,
        ROUND(AVG(fuel_consumption), 1) as fuel_efficiency,
        COUNT(*) FILTER (WHERE next_service < CURRENT_DATE) as overdue_maintenance
      FROM vehicles v
      LEFT JOIN (
        SELECT 
          vehicle_id,
          SUM(cost) as monthly_fuel_cost
        FROM fuel_logs 
        WHERE DATE_TRUNC('month', log_date) = DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY vehicle_id
      ) fc ON v.id = fc.vehicle_id
      LEFT JOIN (
        SELECT 
          vehicle_id,
          SUM(cost) as monthly_maintenance_cost
        FROM maintenance_logs 
        WHERE DATE_TRUNC('month', service_date) = DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY vehicle_id
      ) mc ON v.id = mc.vehicle_id
    `
    return stats[0]
  } catch (error) {
    console.error("Error fetching vehicle stats:", error)
    return null
  }
}

export async function addVehicle(formData: FormData) {
  try {
    const name = formData.get("name") as string
    if (!name || name.trim() === "") {
      return { success: false, message: "Vehicle name is required" }
    }

    const vehicleData = {
      name: name.trim(),
      type: formData.get("type") as string,
      registration: formData.get("registration") as string,
      model: formData.get("model") as string,
      year: Number.parseInt(formData.get("year") as string) || new Date().getFullYear(),
      fuel_type: formData.get("fuel_type") as string,
      assigned_to: formData.get("assigned_to") as string,
      location: formData.get("location") as string,
      mileage: Number.parseInt(formData.get("mileage") as string) || 0,
      fuel_consumption: Number.parseFloat(formData.get("fuel_consumption") as string) || 0,
      insurance_expiry: formData.get("insurance_expiry") as string,
      license_expiry: formData.get("license_expiry") as string,
      purchase_date: formData.get("purchase_date") as string,
      purchase_cost: Number.parseFloat(formData.get("purchase_cost") as string) || 0,
      status: "active",
    }

    if (!vehicleData.type || !vehicleData.registration || !vehicleData.model) {
      return { success: false, message: "Type, registration, and model are required fields" }
    }

    await sql`
      INSERT INTO vehicles (
        name, type, registration, model, year, fuel_type, assigned_to, 
        location, mileage, fuel_consumption, insurance_expiry, license_expiry,
        purchase_date, purchase_cost, status, next_service
      ) VALUES (
        ${vehicleData.name}, ${vehicleData.type}, ${vehicleData.registration},
        ${vehicleData.model}, ${vehicleData.year}, ${vehicleData.fuel_type},
        ${vehicleData.assigned_to}, ${vehicleData.location}, ${vehicleData.mileage},
        ${vehicleData.fuel_consumption}, ${vehicleData.insurance_expiry},
        ${vehicleData.license_expiry}, ${vehicleData.purchase_date},
        ${vehicleData.purchase_cost}, ${vehicleData.status},
        CURRENT_DATE + INTERVAL '3 months'
      )
    `

    revalidatePath("/vehicles")
    return { success: true, message: "Vehicle added successfully" }
  } catch (error) {
    console.error("Error adding vehicle:", error)
    return { success: false, message: "Failed to add vehicle" }
  }
}

export async function updateVehicle(id: number, formData: FormData) {
  try {
    const updates = {
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      registration: formData.get("registration") as string,
      model: formData.get("model") as string,
      year: Number.parseInt(formData.get("year") as string) || new Date().getFullYear(),
      fuel_type: formData.get("fuel_type") as string,
      assigned_to: formData.get("assigned_to") as string,
      location: formData.get("location") as string,
      mileage: Number.parseInt(formData.get("mileage") as string) || 0,
      fuel_consumption: Number.parseFloat(formData.get("fuel_consumption") as string) || 0,
      insurance_expiry: formData.get("insurance_expiry") as string,
      license_expiry: formData.get("license_expiry") as string,
      status: formData.get("status") as string,
    }

    await sql`
      UPDATE vehicles SET
        name = ${updates.name},
        type = ${updates.type},
        registration = ${updates.registration},
        model = ${updates.model},
        year = ${updates.year},
        fuel_type = ${updates.fuel_type},
        assigned_to = ${updates.assigned_to},
        location = ${updates.location},
        mileage = ${updates.mileage},
        fuel_consumption = ${updates.fuel_consumption},
        insurance_expiry = ${updates.insurance_expiry},
        license_expiry = ${updates.license_expiry},
        status = ${updates.status},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `

    revalidatePath("/vehicles")
    return { success: true, message: "Vehicle updated successfully" }
  } catch (error) {
    console.error("Error updating vehicle:", error)
    return { success: false, message: "Failed to update vehicle" }
  }
}

export async function addFuelLog(formData: FormData) {
  try {
    const fuelData = {
      vehicle_id: Number.parseInt(formData.get("vehicle_id") as string),
      log_date: formData.get("log_date") as string,
      fuel_type: formData.get("fuel_type") as string,
      quantity: Number.parseFloat(formData.get("quantity") as string),
      cost: Number.parseFloat(formData.get("cost") as string),
      odometer_reading: Number.parseInt(formData.get("odometer_reading") as string),
      location: formData.get("location") as string,
      notes: formData.get("notes") as string,
    }

    await sql`
      INSERT INTO fuel_logs (
        vehicle_id, log_date, fuel_type, quantity, cost, 
        odometer_reading, location, notes
      ) VALUES (
        ${fuelData.vehicle_id}, ${fuelData.log_date}, ${fuelData.fuel_type},
        ${fuelData.quantity}, ${fuelData.cost}, ${fuelData.odometer_reading},
        ${fuelData.location}, ${fuelData.notes}
      )
    `

    // Update vehicle mileage
    await sql`
      UPDATE vehicles 
      SET mileage = ${fuelData.odometer_reading},
          last_fuel_date = ${fuelData.log_date}
      WHERE id = ${fuelData.vehicle_id}
    `

    revalidatePath("/vehicles")
    return { success: true, message: "Fuel log added successfully" }
  } catch (error) {
    console.error("Error adding fuel log:", error)
    return { success: false, message: "Failed to add fuel log" }
  }
}

export async function addMaintenanceLog(formData: FormData) {
  try {
    const maintenanceData = {
      vehicle_id: Number.parseInt(formData.get("vehicle_id") as string),
      service_date: formData.get("service_date") as string,
      service_type: formData.get("service_type") as string,
      description: formData.get("description") as string,
      cost: Number.parseFloat(formData.get("cost") as string),
      odometer_reading: Number.parseInt(formData.get("odometer_reading") as string),
      next_service_date: formData.get("next_service_date") as string,
      service_provider: formData.get("service_provider") as string,
      parts_replaced: formData.get("parts_replaced") as string,
    }

    await sql`
      INSERT INTO maintenance_logs (
        vehicle_id, service_date, service_type, description, cost,
        odometer_reading, next_service_date, service_provider, parts_replaced
      ) VALUES (
        ${maintenanceData.vehicle_id}, ${maintenanceData.service_date},
        ${maintenanceData.service_type}, ${maintenanceData.description},
        ${maintenanceData.cost}, ${maintenanceData.odometer_reading},
        ${maintenanceData.next_service_date}, ${maintenanceData.service_provider},
        ${maintenanceData.parts_replaced}
      )
    `

    // Update vehicle service dates
    await sql`
      UPDATE vehicles 
      SET last_service = ${maintenanceData.service_date},
          next_service = ${maintenanceData.next_service_date},
          mileage = ${maintenanceData.odometer_reading}
      WHERE id = ${maintenanceData.vehicle_id}
    `

    revalidatePath("/vehicles")
    return { success: true, message: "Maintenance log added successfully" }
  } catch (error) {
    console.error("Error adding maintenance log:", error)
    return { success: false, message: "Failed to add maintenance log" }
  }
}

export async function addBusFareRecord(formData: FormData) {
  try {
    const busFareData = {
      employee_name: formData.get("employee_name") as string,
      employee_id: formData.get("employee_id") as string,
      travel_date: formData.get("travel_date") as string,
      from_location: formData.get("from_location") as string,
      to_location: formData.get("to_location") as string,
      purpose: formData.get("purpose") as string,
      amount: Number.parseFloat(formData.get("amount") as string),
      receipt_number: formData.get("receipt_number") as string,
      approved_by: formData.get("approved_by") as string,
    }

    await sql`
      INSERT INTO bus_fare_records (
        employee_name, employee_id, travel_date, from_location, to_location,
        purpose, amount, receipt_number, approved_by, status
      ) VALUES (
        ${busFareData.employee_name}, ${busFareData.employee_id},
        ${busFareData.travel_date}, ${busFareData.from_location},
        ${busFareData.to_location}, ${busFareData.purpose},
        ${busFareData.amount}, ${busFareData.receipt_number},
        ${busFareData.approved_by}, 'approved'
      )
    `

    revalidatePath("/vehicles")
    return { success: true, message: "Bus fare record added successfully" }
  } catch (error) {
    console.error("Error adding bus fare record:", error)
    return { success: false, message: "Failed to add bus fare record" }
  }
}

export async function getFuelStats() {
  try {
    const stats = await sql`
      SELECT 
        SUM(cost) as total_fuel_cost,
        AVG(cost/quantity) as avg_fuel_price,
        SUM(quantity) as total_fuel_consumed
      FROM fuel_logs 
      WHERE DATE_TRUNC('month', log_date) = DATE_TRUNC('month', CURRENT_DATE)
    `
    return stats[0]
  } catch (error) {
    console.error("Error fetching fuel stats:", error)
    return null
  }
}

export async function getMaintenanceStats() {
  try {
    const stats = await sql`
      SELECT 
        SUM(cost) as total_maintenance_cost,
        COUNT(*) as total_services,
        COUNT(DISTINCT vehicle_id) as vehicles_serviced
      FROM maintenance_logs 
      WHERE DATE_TRUNC('month', service_date) = DATE_TRUNC('month', CURRENT_DATE)
    `
    return stats[0]
  } catch (error) {
    console.error("Error fetching maintenance stats:", error)
    return null
  }
}
