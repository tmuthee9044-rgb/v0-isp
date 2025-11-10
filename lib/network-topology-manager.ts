import { getSql } from "./db"

export async function getNetworkTopology() {
  const sql = await getSql()
}

export async function updateNetworkDevice(deviceId: number, data: any) {
  const sql = await getSql()
}

export async function addNetworkDevice(data: any) {
  const sql = await getSql()
}

export async function removeNetworkDevice(deviceId: number) {
  const sql = await getSql()
}
