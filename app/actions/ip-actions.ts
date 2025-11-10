"use server"

import { revalidatePath } from "next/cache"

export async function createSubnet(formData: FormData) {
  try {
    const name = formData.get("name")?.toString() || ""
    const network = formData.get("network")?.toString() || ""
    const cidrValue = formData.get("cidr")?.toString()
    const cidr = cidrValue ? Number.parseInt(cidrValue) : 0
    const type = (formData.get("type")?.toString() || "ipv4") as "ipv4" | "ipv6"
    const gateway = formData.get("gateway")?.toString() || ""
    const dns_primary = formData.get("dns_primary")?.toString() || ""
    const dns_secondary = formData.get("dns_secondary")?.toString() || ""
    const description = formData.get("description")?.toString() || ""
    const routerIdValue = formData.get("router_id")?.toString()
    const router_id = routerIdValue ? Number.parseInt(routerIdValue) : null
    const dhcp_enabled = formData.get("dhcp_enabled") === "on"
    const dhcp_start = formData.get("dhcp_start")?.toString() || ""
    const dhcp_end = formData.get("dhcp_end")?.toString() || ""
    const vlan_id = formData.get("vlan_id")?.toString()
      ? Number.parseInt(formData.get("vlan_id")?.toString() || "0")
      : null

    const dns_servers = [dns_primary]
    if (dns_secondary) {
      dns_servers.push(dns_secondary)
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/subnets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        network,
        cidr,
        type,
        gateway,
        dns_servers,
        description,
        router_id,
        dhcp_enabled,
        dhcp_start: dhcp_enabled ? dhcp_start : null,
        dhcp_end: dhcp_enabled ? dhcp_end : null,
        vlan_id,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, message: error.error || "Failed to create subnet" }
    }

    const subnet = await response.json()
    revalidatePath("/network/ip-config")
    return { success: true, message: "Subnet created successfully", data: subnet }
  } catch (error) {
    console.error("Error creating subnet:", error)
    return { success: false, message: "Failed to create subnet" }
  }
}

export async function updateSubnet(id: number, formData: FormData) {
  try {
    const name = formData.get("name")?.toString() || ""
    const network = formData.get("network")?.toString() || ""
    const cidrValue = formData.get("cidr")?.toString()
    const cidr = cidrValue ? Number.parseInt(cidrValue) : 0
    const gateway = formData.get("gateway")?.toString() || ""
    const dns_primary = formData.get("dns_primary")?.toString() || ""
    const dns_secondary = formData.get("dns_secondary")?.toString() || ""
    const description = formData.get("description")?.toString() || ""
    const status = (formData.get("status")?.toString() || "active") as "active" | "inactive"
    const routerIdValue = formData.get("router_id")?.toString()
    const router_id = routerIdValue ? Number.parseInt(routerIdValue) : null
    const dhcp_enabled = formData.get("dhcp_enabled") === "on"
    const dhcp_start = formData.get("dhcp_start")?.toString() || ""
    const dhcp_end = formData.get("dhcp_end")?.toString() || ""
    const vlan_id = formData.get("vlan_id")?.toString()
      ? Number.parseInt(formData.get("vlan_id")?.toString() || "0")
      : null

    const dns_servers = [dns_primary]
    if (dns_secondary) {
      dns_servers.push(dns_secondary)
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/subnets/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        network,
        cidr,
        gateway,
        dns_servers,
        description,
        status,
        router_id,
        dhcp_enabled,
        dhcp_start: dhcp_enabled ? dhcp_start : null,
        dhcp_end: dhcp_enabled ? dhcp_end : null,
        vlan_id,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, message: error.error || "Failed to update subnet" }
    }

    const subnet = await response.json()
    revalidatePath("/network/ip-config")
    return { success: true, message: "Subnet updated successfully", data: subnet }
  } catch (error) {
    console.error("Error updating subnet:", error)
    return { success: false, message: "Failed to update subnet" }
  }
}

export async function deleteSubnet(id: number) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/subnets/${id}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, message: error.error || "Failed to delete subnet" }
    }

    revalidatePath("/network/ip-config")
    return { success: true, message: "Subnet deleted successfully" }
  } catch (error) {
    console.error("Error deleting subnet:", error)
    return { success: false, message: "Failed to delete subnet" }
  }
}

export async function allocateIP(formData: FormData) {
  try {
    const subnetIdValue = formData.get("subnet_id")?.toString()
    const subnet_id = subnetIdValue ? Number.parseInt(subnetIdValue) : 0
    const ip_address = formData.get("ip_address")?.toString() || ""
    const customerIdValue = formData.get("customer_id")?.toString()
    const customer_id = customerIdValue ? Number.parseInt(customerIdValue) : undefined

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/ip-allocations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subnet_id,
        ip_address,
        customer_id,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, message: error.error || "Failed to allocate IP" }
    }

    const allocation = await response.json()
    revalidatePath("/network/ip-config")
    return { success: true, message: "IP allocated successfully", data: allocation }
  } catch (error) {
    console.error("Error allocating IP:", error)
    return { success: false, message: "Failed to allocate IP" }
  }
}
