/**
 * Router API Worker - Executes provisioning scripts on physical routers
 * Supports MikroTik (RouterOS API), Ubiquiti (SSH), and Juniper (NETCONF)
 */

import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export interface RouterConnection {
  ip: string
  username: string
  password: string
  vendor: "mikrotik" | "ubiquiti" | "juniper"
  port?: number
}

export interface ExecutionResult {
  success: boolean
  output?: string
  error?: string
  timestamp: Date
}

/**
 * Execute provisioning script on router
 */
export async function executeProvisionScript(
  connection: RouterConnection,
  script: string,
): Promise<ExecutionResult> {
  const timestamp = new Date()

  try {
    console.log(`[v0] Executing provision script on ${connection.vendor} router ${connection.ip}`)

    let result: ExecutionResult

    switch (connection.vendor) {
      case "mikrotik":
        result = await executeMikroTik(connection, script)
        break
      case "ubiquiti":
        result = await executeUbiquiti(connection, script)
        break
      case "juniper":
        result = await executeJuniper(connection, script)
        break
      default:
        throw new Error(`Unsupported vendor: ${connection.vendor}`)
    }

    return { ...result, timestamp }
  } catch (error) {
    console.error(`[v0] Router execution error:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp,
    }
  }
}

/**
 * MikroTik RouterOS - via REST API (no SSH dependencies)
 */
async function executeMikroTik(connection: RouterConnection, script: string): Promise<ExecutionResult> {
  try {
    const { MikroTikAPI } = await import("./mikrotik-api")
    
    console.log("[v0] Connecting to MikroTik via REST API...")
    const mikrotik = new MikroTikAPI({
      host: connection.ip,
      port: connection.port || 8728,
      username: connection.username,
      password: connection.password,
    })

    await mikrotik.connect()

    // Parse script into individual commands
    const commands = script
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.length > 0)

    console.log(`[v0] Executing ${commands.length} commands on MikroTik router`)

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Execute commands sequentially
    for (const command of commands) {
      try {
        await mikrotik.executeCommand(command)
        successCount++
      } catch (error) {
        errorCount++
        const errorMsg = error instanceof Error ? error.message : String(error)
        errors.push(`${command}: ${errorMsg}`)
        console.error("[v0] Command failed:", command, errorMsg)
      }
    }

    await mikrotik.disconnect()

    return {
      success: errorCount === 0,
      output: `Executed ${successCount}/${commands.length} commands successfully${errorCount > 0 ? `\nErrors:\n${errors.join("\n")}` : ""}`,
      error: errorCount > 0 ? `${errorCount} commands failed` : undefined,
      timestamp: new Date(),
    }
  } catch (error) {
    return {
      success: false,
      error: `MikroTik execution failed: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date(),
    }
  }
}

/**
 * Ubiquiti EdgeOS - via SSH
 */
async function executeUbiquiti(connection: RouterConnection, script: string): Promise<ExecutionResult> {
  try {
    // Write script to temp file
    const scriptFile = `/tmp/ubiquiti-provision-${Date.now()}.sh`
    const fs = require("fs")
    fs.writeFileSync(scriptFile, script)

    // Execute via SSH
    const sshCommand = `sshpass -p '${connection.password}' ssh -o StrictHostKeyChecking=no ${connection.username}@${connection.ip} "source /opt/vyatta/etc/functions/script-template; $(cat ${scriptFile})"`

    const { stdout, stderr } = await execAsync(sshCommand, { timeout: 60000 })

    // Clean up temp file
    fs.unlinkSync(scriptFile)

    if (stderr && (stderr.includes("error") || stderr.includes("failed"))) {
      return { success: false, error: stderr, timestamp: new Date() }
    }

    return { success: true, output: stdout, timestamp: new Date() }
  } catch (error) {
    return {
      success: false,
      error: `Ubiquiti execution failed: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date(),
    }
  }
}

/**
 * Juniper JunOS - via SSH with commit confirmed
 */
async function executeJuniper(connection: RouterConnection, script: string): Promise<ExecutionResult> {
  try {
    // Write script to temp file
    const scriptFile = `/tmp/juniper-provision-${Date.now()}.txt`
    const fs = require("fs")
    
    // Add commit confirmed for safety (auto-rollback in 5 minutes if connection lost)
    const safeScript = `${script}\ncommit confirmed 5\ncommit\n`
    fs.writeFileSync(scriptFile, safeScript)

    // Execute via SSH
    const sshCommand = `sshpass -p '${connection.password}' ssh -o StrictHostKeyChecking=no ${connection.username}@${connection.ip} < ${scriptFile}`

    const { stdout, stderr } = await execAsync(sshCommand, { timeout: 60000 })

    // Clean up temp file
    fs.unlinkSync(scriptFile)

    if (stderr && (stderr.includes("error") || stderr.includes("syntax"))) {
      return { success: false, error: stderr, timestamp: new Date() }
    }

    return { success: true, output: stdout, timestamp: new Date() }
  } catch (error) {
    return {
      success: false,
      error: `Juniper execution failed: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date(),
    }
  }
}

/**
 * Test router connectivity before provisioning
 */
export async function testRouterConnection(connection: RouterConnection): Promise<boolean> {
  try {
    // Simple ping test
    const { stdout } = await execAsync(`ping -c 1 -W 2 ${connection.ip}`)
    return stdout.includes("1 received")
  } catch (error) {
    console.error(`[v0] Router connectivity test failed:`, error)
    return false
  }
}

/**
 * Check if router already has ISP_MANAGED rules
 */
export async function checkExistingProvision(connection: RouterConnection): Promise<boolean> {
  try {
    let checkCommand: string

    switch (connection.vendor) {
      case "mikrotik":
        checkCommand = `sshpass -p '${connection.password}' ssh ${connection.username}@${connection.ip} "/ip firewall filter print where comment~\\"ISP_MANAGED\\""`
        break
      case "ubiquiti":
        checkCommand = `sshpass -p '${connection.password}' ssh ${connection.username}@${connection.ip} "show configuration | grep ISP_MANAGED"`
        break
      case "juniper":
        checkCommand = `sshpass -p '${connection.password}' ssh ${connection.username}@${connection.ip} "show configuration | match ISP_MANAGED"`
        break
      default:
        return false
    }

    const { stdout } = await execAsync(checkCommand, { timeout: 10000 })
    return stdout.includes("ISP_MANAGED")
  } catch (error) {
    return false
  }
}
