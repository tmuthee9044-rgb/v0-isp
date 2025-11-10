import { getSql } from "./db"

export async function getRouterConfig(routerId: number) {
  const sql = await getSql()
}

export async function updateRouterConfig(routerId: number, config: any) {
  const sql = await getSql()
}

export async function syncAllRouters() {
  const sql = await getSql()
}
