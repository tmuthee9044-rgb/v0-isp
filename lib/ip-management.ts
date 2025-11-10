import { getSql } from "./db"

export async function allocateIPAddress(customerId: number, poolId?: number) {
  const sql = await getSql()
}

export async function releaseIPAddress(ipAddress: string) {
  const sql = await getSql()
}

export async function getAvailableIPs(poolId?: number) {
  const sql = await getSql()
}

export async function createIPPool(name: string, startIP: string, endIP: string, gateway: string, subnet: string) {
  const sql = await getSql()
}
