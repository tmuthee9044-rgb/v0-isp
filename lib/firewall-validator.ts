/**
 * Firewall Validation Module
 * Validates carrier-grade firewall rules on ISP routers
 * Ensures RADIUS, CoA, DNS, and management access rules are properly configured
 */

export interface FirewallValidationResult {
  isValid: boolean
  missingRules: string[]
  incorrectRules: string[]
  recommendations: string[]
  criticalIssues: string[]
}

export interface FirewallRule {
  chain: string
  protocol?: string
  dstPort?: string
  srcAddress?: string
  action: string
  comment?: string
}

/**
 * Validate MikroTik firewall rules
 */
export async function validateMikroTikFirewall(
  radiusServer: string,
  mgmtIp: string,
  routerRules: FirewallRule[]
): Promise<FirewallValidationResult> {
  const result: FirewallValidationResult = {
    isValid: true,
    missingRules: [],
    incorrectRules: [],
    recommendations: [],
    criticalIssues: [],
  }

  // Required firewall rules for carrier-grade ISP
  const requiredRules = [
    {
      name: "RADIUS Auth/Acct Access",
      check: () =>
        routerRules.some(
          (r) =>
            r.chain === "input" &&
            r.protocol === "udp" &&
            r.dstPort?.includes("1812") &&
            r.dstPort?.includes("1813") &&
            r.srcAddress === radiusServer &&
            r.action === "accept"
        ),
      critical: true,
      recommendation:
        "Add RADIUS access rule: /ip firewall filter add chain=input protocol=udp dst-port=1812,1813 src-address=RADIUS_IP action=accept comment=ISP_MANAGED:RADIUS",
    },
    {
      name: "RADIUS CoA Access",
      check: () =>
        routerRules.some(
          (r) =>
            r.chain === "input" &&
            r.protocol === "udp" &&
            r.dstPort === "3799" &&
            r.srcAddress === radiusServer &&
            r.action === "accept"
        ),
      critical: true,
      recommendation:
        "Add CoA access rule: /ip firewall filter add chain=input protocol=udp dst-port=3799 src-address=RADIUS_IP action=accept comment=ISP_MANAGED:COA",
    },
    {
      name: "Established/Related State Tracking",
      check: () =>
        routerRules.some(
          (r) =>
            r.chain === "input" &&
            r.comment?.includes("STATE") &&
            r.action === "accept"
        ),
      critical: false,
      recommendation:
        "Add state tracking: /ip firewall filter add chain=input connection-state=established,related action=accept comment=ISP_MANAGED:STATE",
    },
    {
      name: "Management Access Protection",
      check: () =>
        routerRules.some(
          (r) =>
            r.chain === "input" &&
            r.protocol === "tcp" &&
            r.dstPort?.includes("22") &&
            r.srcAddress === mgmtIp &&
            r.action === "accept"
        ),
      critical: false,
      recommendation: `Add management access: /ip firewall filter add chain=input protocol=tcp dst-port=22,8728,443 src-address=${mgmtIp} action=accept comment=ISP_MANAGED:MGMT`,
    },
    {
      name: "FastTrack Safety (excludes RADIUS clients)",
      check: () =>
        routerRules.some(
          (r) =>
            r.chain === "forward" &&
            r.comment?.includes("FASTTRACK") &&
            r.action === "fasttrack-connection"
        ),
      critical: true,
      recommendation:
        "Add FastTrack safety: /ip firewall filter add chain=forward connection-state=established,related src-address-list=!radius_clients action=fasttrack-connection comment=ISP_MANAGED:FASTTRACK_SAFE",
    },
    {
      name: "Default Drop Rule",
      check: () =>
        routerRules.some(
          (r) =>
            r.chain === "input" &&
            r.action === "drop" &&
            r.comment?.includes("DROP")
        ),
      critical: false,
      recommendation:
        "Add default drop: /ip firewall filter add chain=input action=drop comment=ISP_MANAGED:DROP",
    },
  ]

  // Check each required rule
  for (const rule of requiredRules) {
    if (!rule.check()) {
      if (rule.critical) {
        result.criticalIssues.push(rule.name)
        result.isValid = false
      } else {
        result.missingRules.push(rule.name)
      }
      result.recommendations.push(rule.recommendation)
    }
  }

  // Check for ISP_MANAGED tags
  const managedRulesCount = routerRules.filter((r) =>
    r.comment?.includes("ISP_MANAGED")
  ).length

  if (managedRulesCount === 0) {
    result.recommendations.push(
      "No ISP_MANAGED tags found. Apply auto-provisioning script to add carrier-grade firewall rules."
    )
  }

  return result
}

/**
 * Validate Ubiquiti firewall rules
 */
export async function validateUbiquitiFirewall(
  radiusServer: string,
  routerRules: any[]
): Promise<FirewallValidationResult> {
  const result: FirewallValidationResult = {
    isValid: true,
    missingRules: [],
    incorrectRules: [],
    recommendations: [],
    criticalIssues: [],
  }

  // Check for ISP-IN firewall group
  const hasIspInGroup = routerRules.some((r) => r.name === "ISP-IN")

  if (!hasIspInGroup) {
    result.criticalIssues.push("ISP-IN firewall group not configured")
    result.isValid = false
    result.recommendations.push(
      "Create ISP-IN firewall group with RADIUS and CoA access rules"
    )
  }

  // Check RADIUS access (rule 10)
  const hasRadiusRule = routerRules.some(
    (r) =>
      r.protocol === "udp" &&
      r.destinationPort?.includes("1812") &&
      r.sourceAddress === radiusServer
  )

  if (!hasRadiusRule) {
    result.criticalIssues.push("RADIUS access rule missing")
    result.isValid = false
    result.recommendations.push(
      "Add RADIUS rule: set firewall name ISP-IN rule 10 protocol udp destination port 1812,1813 source address RADIUS_IP"
    )
  }

  // Check CoA access (rule 20)
  const hasCoaRule = routerRules.some(
    (r) =>
      r.protocol === "udp" &&
      r.destinationPort === "3799" &&
      r.sourceAddress === radiusServer
  )

  if (!hasCoaRule) {
    result.criticalIssues.push("CoA access rule missing")
    result.isValid = false
    result.recommendations.push(
      "Add CoA rule: set firewall name ISP-IN rule 20 protocol udp destination port 3799 source address RADIUS_IP"
    )
  }

  return result
}

/**
 * Validate Juniper firewall policies
 */
export async function validateJuniperFirewall(
  routerPolicies: any[]
): Promise<FirewallValidationResult> {
  const result: FirewallValidationResult = {
    isValid: true,
    missingRules: [],
    incorrectRules: [],
    recommendations: [],
    criticalIssues: [],
  }

  // Check RADIUS policy
  const hasRadiusPolicy = routerPolicies.some(
    (p) => p.name === "RADIUS" && p.application === "junos-radius"
  )

  if (!hasRadiusPolicy) {
    result.criticalIssues.push("RADIUS security policy missing")
    result.isValid = false
    result.recommendations.push(
      "Add RADIUS policy: set security policies from-zone trust to-zone trust policy RADIUS match application junos-radius"
    )
  }

  // Check CoA application
  const hasCoaApp = routerPolicies.some(
    (p) => p.name === "radius-coa" && p.protocol === "udp" && p.port === "3799"
  )

  if (!hasCoaApp) {
    result.criticalIssues.push("CoA application not configured")
    result.isValid = false
    result.recommendations.push(
      "Add CoA application: set applications application radius-coa protocol udp destination-port 3799"
    )
  }

  return result
}

/**
 * Generate firewall validation report
 */
export function generateFirewallReport(
  validation: FirewallValidationResult
): string {
  let report = "# Firewall Validation Report\n\n"

  if (validation.isValid) {
    report += "✅ **Status**: PASS - All critical firewall rules are in place\n\n"
  } else {
    report += "❌ **Status**: FAIL - Critical firewall rules missing\n\n"
  }

  if (validation.criticalIssues.length > 0) {
    report += "## 🚨 Critical Issues\n"
    for (const issue of validation.criticalIssues) {
      report += `- ${issue}\n`
    }
    report += "\n"
  }

  if (validation.missingRules.length > 0) {
    report += "## ⚠️ Missing Rules (Non-Critical)\n"
    for (const rule of validation.missingRules) {
      report += `- ${rule}\n`
    }
    report += "\n"
  }

  if (validation.recommendations.length > 0) {
    report += "## 💡 Recommendations\n"
    for (const rec of validation.recommendations) {
      report += `- ${rec}\n`
    }
    report += "\n"
  }

  return report
}
