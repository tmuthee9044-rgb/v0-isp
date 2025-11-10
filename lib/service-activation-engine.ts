import { getSql } from "./db"

export async function activateService(customerId: number, serviceId: number) {
  const sql = await getSql()
}

export async function deactivateService(customerId: number, serviceId: number) {
  const sql = await getSql()
}

export async function suspendService(customerId: number, serviceId: number, reason: string) {
  const sql = await getSql()
}

export async function restoreService(customerId: number, serviceId: number) {
  const sql = await getSql()
}
