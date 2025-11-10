import { getSql } from "./db"

export async function connectToRouter(routerId: number) {
  const sql = await getSql()
}

export async function executeRouterCommand(routerId: number, command: string) {
  const sql = await getSql()
}

export async function syncRouterData(routerId: number) {
  const sql = await getSql()
}
