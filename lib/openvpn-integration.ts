/**
 * OpenVPN Integration Library for Trust Waves ISP
 * Purpose: Manage VPN certificates, router profiles, and secure connections
 * Aligned with project rules: fast operations, accurate logging, database-backed
 */

import { getSql } from "@/lib/db"

export interface VPNProfile {
  id: number
  routerId: number
  vpnIp: string
  certificateId: number
  connectionStatus: string
  lastConnectedAt?: Date
}

export interface RouterVPNConfig {
  routerId: number
  routerName: string
  vpnIp: string
  serverIp: string
  serverPort: number
  protocol: string
  caCert: string
  clientCert: string
  clientKey: string
  cipher: string
  auth: string
}

/**
 * Generate VPN IP address for a router (sequential allocation in 10.200.0.0/16)
 */
async function generateVPNIP(): Promise<string> {
  const sql = await getSql()

  const result = await sql`
    SELECT vpn_ip FROM router_vpn_profiles 
    ORDER BY id DESC LIMIT 1
  `

  if (result.length === 0) {
    return "10.200.0.2" // Start from .2 (.1 is gateway)
  }

  const lastIP = result[0].vpn_ip
  const octets = lastIP.split(".")
  let lastOctet = Number.parseInt(octets[3])
  lastOctet++

  if (lastOctet > 254) {
    const thirdOctet = Number.parseInt(octets[2]) + 1
    return `10.200.${thirdOctet}.2`
  }

  return `10.200.${octets[2]}.${lastOctet}`
}

/**
 * Generate client certificate for a router
 * In production, this would call OpenSSL or use a proper PKI library
 */
async function generateClientCertificate(routerId: number, commonName: string) {
  // This is a placeholder. In production, you would:
  // 1. Generate a CSR using OpenSSL
  // 2. Sign it with the CA certificate
  // 3. Return the certificate and private key

  const serialNumber = `CERT-${Date.now()}-${routerId}`
  const expiresAt = new Date()
  expiresAt.setFullYear(expiresAt.getFullYear() + 2) // 2-year validity

  return {
    serialNumber,
    certificatePem: `-----BEGIN CERTIFICATE-----\nPLACEHOLDER_CLIENT_CERT_${routerId}\n-----END CERTIFICATE-----`,
    privateKeyPem: `-----BEGIN PRIVATE KEY-----\nPLACEHOLDER_CLIENT_KEY_${routerId}\n-----END PRIVATE KEY-----`,
    expiresAt,
  }
}

/**
 * Create VPN profile for a router
 * This is called when a router is added to the system or VPN is enabled
 */
export async function createRouterVPNProfile(params: {
  routerId: number
  routerName: string
  locationId?: number
}): Promise<{ success: boolean; message: string; vpnProfile?: VPNProfile }> {
  const sql = await getSql()

  try {
    console.log(`[v0] Creating VPN profile for router ${params.routerId}`)

    // Check if profile already exists
    const existing = await sql`
      SELECT id FROM router_vpn_profiles WHERE router_id = ${params.routerId}
    `

    if (existing.length > 0) {
      return {
        success: false,
        message: "VPN profile already exists for this router",
      }
    }

    // Generate VPN IP
    const vpnIp = await generateVPNIP()
    const commonName = `router-${params.routerId}-${params.routerName.replace(/[^a-zA-Z0-9]/g, "")}`

    // Generate client certificate
    const cert = await generateClientCertificate(params.routerId, commonName)

    // Insert certificate
    const certResult = await sql`
      INSERT INTO vpn_certificates (
        router_id, certificate_type, common_name, serial_number,
        certificate_pem, private_key_pem, expires_at, status
      ) VALUES (
        ${params.routerId}, 'client', ${commonName}, ${cert.serialNumber},
        ${cert.certificatePem}, ${cert.privateKeyPem}, ${cert.expiresAt}, 'active'
      ) RETURNING id
    `

    const certificateId = certResult[0].id

    // Create VPN profile
    const profileResult = await sql`
      INSERT INTO router_vpn_profiles (
        router_id, vpn_ip, certificate_id, connection_status, config_generated_at
      ) VALUES (
        ${params.routerId}, ${vpnIp}, ${certificateId}, 'pending', NOW()
      ) RETURNING id, vpn_ip, connection_status
    `

    // Update router to enable VPN
    await sql`
      UPDATE network_devices 
      SET 
        vpn_enabled = true,
        vpn_connection_method = 'openvpn',
        updated_at = NOW()
      WHERE id = ${params.routerId}
    `

    // Log activity
    await sql`
      INSERT INTO activity_logs (
        user_id, action, entity_type, entity_id, description, created_at
      ) VALUES (
        1, 'vpn_profile_created', 'router_vpn_profile', ${profileResult[0].id},
        ${`Created VPN profile for router ${params.routerId} with VPN IP ${vpnIp}`},
        NOW()
      )
    `

    console.log(`[v0] VPN profile created successfully with IP ${vpnIp}`)

    return {
      success: true,
      message: "VPN profile created successfully",
      vpnProfile: {
        id: profileResult[0].id,
        routerId: params.routerId,
        vpnIp: vpnIp,
        certificateId: certificateId,
        connectionStatus: "pending",
      },
    }
  } catch (error) {
    console.error(`[v0] Error creating VPN profile:`, error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create VPN profile",
    }
  }
}

/**
 * Generate OpenVPN client configuration for RouterOS
 * Returns a complete RouterOS script that can be pasted into the router
 */
export async function generateRouterOSConfig(routerId: number): Promise<{
  success: boolean
  config?: string
  message: string
}> {
  const sql = await getSql()

  try {
    const profile = await sql`
      SELECT 
        rvp.id, rvp.router_id, rvp.vpn_ip, rvp.vpn_protocol, rvp.vpn_port,
        rvp.cipher, rvp.auth_algorithm,
        vc.certificate_pem, vc.private_key_pem,
        nd.name as router_name, nd.location,
        vsc.server_ip, vsc.server_port, vsc.protocol as server_protocol
      FROM router_vpn_profiles rvp
      JOIN vpn_certificates vc ON rvp.certificate_id = vc.id
      JOIN network_devices nd ON rvp.router_id = nd.id
      CROSS JOIN vpn_server_config vsc
      WHERE rvp.router_id = ${routerId}
      AND vc.status = 'active'
      AND vsc.status = 'active'
      LIMIT 1
    `

    if (profile.length === 0) {
      return {
        success: false,
        message: "VPN profile not found for this router",
      }
    }

    const p = profile[0]

    // Get CA certificate
    const ca = await sql`
      SELECT certificate_pem FROM vpn_certificates 
      WHERE certificate_type = 'ca' AND status = 'active'
      ORDER BY created_at DESC LIMIT 1
    `

    if (ca.length === 0) {
      return {
        success: false,
        message: "CA certificate not found",
      }
    }

    const config = `# ========================================
# Trust Waves ISP - OpenVPN Client Configuration
# Router: ${p.router_name}
# Location: ${p.location || "N/A"}
# VPN IP: ${p.vpn_ip}
# Generated: ${new Date().toISOString()}
# ========================================

# Step 1: Upload certificates to router
# Save these certificates as files on your computer, then upload via Files menu:
# - ca.crt
# - client.crt  
# - client.key

# Step 2: Create certificate objects in RouterOS
/certificate
add name=ca.crt common-name=Trust-Waves-CA
add name=client.crt common-name=router-${routerId}

# Step 3: Import certificates (after uploading files)
/certificate import file-name=ca.crt passphrase=""
/certificate import file-name=client.crt passphrase=""
/certificate import file-name=client.key passphrase=""

# Step 4: Create OpenVPN client interface
/interface ovpn-client
add name=ovpn-trustwaves \\
    connect-to=${p.server_ip} \\
    port=${p.server_port} \\
    mode=ip \\
    protocol=${p.server_protocol} \\
    cipher=${p.cipher} \\
    auth=${p.auth_algorithm} \\
    certificate=client.crt \\
    user="" \\
    password="" \\
    add-default-route=no \\
    comment="Trust Waves Management VPN - Router ID ${routerId}"

# Step 5: Add firewall rule to allow management traffic from VPN
/ip firewall filter
add chain=input protocol=tcp dst-port=8728,8729,22,80,443 \\
    src-address=10.200.0.0/16 \\
    action=accept \\
    comment="Allow Trust Waves management via VPN" \\
    place-before=0

# Step 6: Enable interface (automatic reconnect)
/interface ovpn-client enable ovpn-trustwaves

# Step 7: Verify connection
# Run these commands to check status:
# /interface ovpn-client print
# /interface ovpn-client monitor ovpn-trustwaves once
# /ping 10.200.0.1 count=5

# ========================================
# Certificate Files Content (save these separately)
# ========================================

# File: ca.crt
${ca[0].certificate_pem}

# File: client.crt
${p.certificate_pem}

# File: client.key
${p.private_key_pem}

# ========================================
# Troubleshooting
# ========================================
# 1. Check if interface is running: /interface print where name=ovpn-trustwaves
# 2. Check logs: /log print where topics~"ovpn"
# 3. Verify certificates imported: /certificate print
# 4. Test connectivity to VPN server: /ping ${p.server_ip} count=10
# 5. Contact support: support@trustwaves.com

# ========================================
# IMPORTANT SECURITY NOTES
# ========================================
# - Keep private key (client.key) secure and never share it
# - Only allow management access from VPN subnet (10.200.0.0/16)
# - Regularly update RouterOS to latest stable version
# - Monitor connection logs for suspicious activity
`

    // Update config_downloaded_at timestamp
    await sql`
      UPDATE router_vpn_profiles 
      SET config_downloaded_at = NOW(), updated_at = NOW()
      WHERE router_id = ${routerId}
    `

    // Log download
    await sql`
      INSERT INTO activity_logs (
        user_id, action, entity_type, entity_id, description, created_at
      ) VALUES (
        1, 'vpn_config_downloaded', 'router_vpn_profile', ${p.id},
        ${`Downloaded OpenVPN config for router ${routerId} (${p.router_name})`},
        NOW()
      )
    `

    return {
      success: true,
      config: config,
      message: "Configuration generated successfully",
    }
  } catch (error) {
    console.error(`[v0] Error generating config:`, error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to generate configuration",
    }
  }
}

/**
 * Record VPN session when router connects
 */
export async function recordVPNSession(params: {
  routerId: number
  sessionId: string
  publicIp: string
  publicPort: number
}): Promise<void> {
  const sql = await getSql()

  try {
    const profile = await sql`
      SELECT id, vpn_ip FROM router_vpn_profiles WHERE router_id = ${params.routerId}
    `

    if (profile.length === 0) {
      console.error(`[v0] No VPN profile found for router ${params.routerId}`)
      return
    }

    await sql`
      INSERT INTO vpn_sessions (
        router_id, vpn_profile_id, session_id, vpn_ip, public_ip, public_port, status
      ) VALUES (
        ${params.routerId}, ${profile[0].id}, ${params.sessionId},
        ${profile[0].vpn_ip}, ${params.publicIp}, ${params.publicPort}, 'active'
      )
    `

    await sql`
      UPDATE router_vpn_profiles 
      SET 
        connection_status = 'connected',
        last_connected_at = NOW(),
        public_ip = ${params.publicIp},
        updated_at = NOW()
      WHERE router_id = ${params.routerId}
    `

    await sql`
      UPDATE network_devices
      SET vpn_last_seen = NOW(), last_seen = NOW()
      WHERE id = ${params.routerId}
    `

    console.log(`[v0] VPN session recorded for router ${params.routerId}`)
  } catch (error) {
    console.error(`[v0] Error recording VPN session:`, error)
  }
}

/**
 * Close VPN session when router disconnects
 */
export async function closeVPNSession(sessionId: string, reason?: string): Promise<void> {
  const sql = await getSql()

  try {
    await sql`
      UPDATE vpn_sessions
      SET 
        status = 'disconnected',
        disconnected_at = NOW(),
        disconnect_reason = ${reason || "Normal disconnect"},
        connection_duration = EXTRACT(EPOCH FROM (NOW() - connected_at))::INTEGER,
        updated_at = NOW()
      WHERE session_id = ${sessionId} AND status = 'active'
    `

    const session = await sql`
      SELECT router_id FROM vpn_sessions WHERE session_id = ${sessionId}
    `

    if (session.length > 0) {
      await sql`
        UPDATE router_vpn_profiles
        SET connection_status = 'disconnected', updated_at = NOW()
        WHERE router_id = ${session[0].router_id}
      `
    }

    console.log(`[v0] VPN session ${sessionId} closed`)
  } catch (error) {
    console.error(`[v0] Error closing VPN session:`, error)
  }
}

/**
 * Revoke router certificate (e.g., when router is compromised or decommissioned)
 */
export async function revokeCertificate(params: {
  routerId: number
  reason: string
  revokedBy: number
}): Promise<{ success: boolean; message: string }> {
  const sql = await getSql()

  try {
    const cert = await sql`
      SELECT id, serial_number FROM vpn_certificates
      WHERE router_id = ${params.routerId} AND status = 'active'
    `

    if (cert.length === 0) {
      return { success: false, message: "No active certificate found" }
    }

    await sql`
      UPDATE vpn_certificates
      SET 
        status = 'revoked',
        revoked_at = NOW(),
        revocation_reason = ${params.reason},
        updated_at = NOW()
      WHERE id = ${cert[0].id}
    `

    await sql`
      INSERT INTO vpn_revocations (certificate_id, serial_number, revoked_by, reason)
      VALUES (${cert[0].id}, ${cert[0].serial_number}, ${params.revokedBy}, ${params.reason})
    `

    await sql`
      UPDATE router_vpn_profiles
      SET connection_status = 'error', updated_at = NOW()
      WHERE router_id = ${params.routerId}
    `

    return { success: true, message: "Certificate revoked successfully" }
  } catch (error) {
    console.error(`[v0] Error revoking certificate:`, error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to revoke certificate",
    }
  }
}

/**
 * Get all VPN-enabled routers with their connection status
 */
export async function getVPNRouters(): Promise<any[]> {
  const sql = await getSql()

  const routers = await sql`
    SELECT 
      nd.id as router_id,
      nd.name as router_name,
      nd.location,
      l.name as location_name,
      rvp.vpn_ip,
      rvp.connection_status,
      rvp.last_connected_at,
      rvp.public_ip,
      vs.session_id,
      vs.bytes_sent,
      vs.bytes_received,
      vs.connected_at as current_session_start,
      vc.expires_at as cert_expires_at,
      vc.status as cert_status
    FROM network_devices nd
    JOIN router_vpn_profiles rvp ON nd.id = rvp.router_id
    LEFT JOIN locations l ON nd.location_id = l.id
    LEFT JOIN vpn_certificates vc ON rvp.certificate_id = vc.id
    LEFT JOIN vpn_sessions vs ON nd.id = vs.router_id AND vs.status = 'active'
    WHERE nd.vpn_enabled = true
    ORDER BY rvp.connection_status, nd.name
  `

  return routers
}
