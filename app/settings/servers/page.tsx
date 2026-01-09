"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Server, Shield, Network, Activity, CheckCircle, AlertCircle, Wifi, Router, Database } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ServerConfigurationPage() {
  const { toast } = useToast()
  const [isPending, setIsPending] = useState(false)
  const [activeNetworkTab, setActiveNetworkTab] = useState("configuration")
  const [serverConfig, setServerConfig] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchServerConfig()
  }, [])

  const fetchServerConfig = async () => {
    try {
      const response = await fetch("/api/server-settings")
      const data = await response.json()
      setServerConfig(data)
    } catch (error) {
      console.error("Error fetching server config:", error)
      toast({
        title: "Error",
        description: "Failed to load server configuration",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (type: string, settings: any) => {
    setIsPending(true)
    try {
      const response = await fetch("/api/server-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, settings }),
      })

      if (response.ok) {
        toast({
          title: "Settings saved",
          description: `${type.toUpperCase()} configuration has been updated and applied to network devices.`,
        })
        await fetchServerConfig()
      } else {
        throw new Error("Failed to save settings")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save server settings",
        variant: "destructive",
      })
    } finally {
      setIsPending(false)
    }
  }

  const handleTestConnection = async (type: string, config: any) => {
    try {
      const response = await fetch("/api/server-settings/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: type.toLowerCase(), config }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Connection successful",
          description: result.message,
        })
      } else {
        toast({
          title: "Connection failed",
          description: result.message || "Connection test failed",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to test connection",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return <div className="flex-1 p-8">Loading server configuration...</div>
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Server Configuration</h2>
          <p className="text-muted-foreground">Configure RADIUS, OpenVPN, and network infrastructure settings</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Connected
          </Badge>
          <Button onClick={() => handleSave("all", serverConfig)} disabled={isPending}>
            {isPending ? "Saving..." : "Save All Changes"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="radius" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="radius" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>RADIUS Server</span>
          </TabsTrigger>
          <TabsTrigger value="openvpn" className="flex items-center space-x-2">
            <Server className="h-4 w-4" />
            <span>OpenVPN</span>
          </TabsTrigger>
          <TabsTrigger value="network" className="flex items-center space-x-2">
            <Network className="h-4 w-4" />
            <span>Network</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="radius" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>RADIUS Server Configuration</span>
              </CardTitle>
              <CardDescription>Configure RADIUS authentication and accounting settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable RADIUS Server</Label>
                  <div className="text-sm text-muted-foreground">
                    Enable RADIUS authentication for network access control
                  </div>
                </div>
                <Switch
                  checked={serverConfig?.radius?.enabled || false}
                  onCheckedChange={(checked) =>
                    setServerConfig((prev) => ({
                      ...prev,
                      radius: { ...prev.radius, enabled: checked },
                    }))
                  }
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="radius-host">RADIUS Server Host *</Label>
                  <Input
                    id="radius-host"
                    placeholder="Enter RADIUS server IP"
                    value={serverConfig?.radius?.host || ""}
                    onChange={(e) =>
                      setServerConfig((prev) => ({
                        ...prev,
                        radius: { ...prev.radius, host: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-port">Authentication Port</Label>
                  <Input
                    id="auth-port"
                    placeholder="1812"
                    value={serverConfig?.radius?.authPort || "1812"}
                    onChange={(e) =>
                      setServerConfig((prev) => ({
                        ...prev,
                        radius: { ...prev.radius, authPort: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="acct-port">Accounting Port</Label>
                  <Input
                    id="acct-port"
                    placeholder="1813"
                    value={serverConfig?.radius?.acctPort || "1813"}
                    onChange={(e) =>
                      setServerConfig((prev) => ({
                        ...prev,
                        radius: { ...prev.radius, acctPort: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeout">Timeout (seconds)</Label>
                  <Input
                    id="timeout"
                    placeholder="30"
                    value={serverConfig?.radius?.timeout || "30"}
                    onChange={(e) =>
                      setServerConfig((prev) => ({
                        ...prev,
                        radius: { ...prev.radius, timeout: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shared-secret">Shared Secret *</Label>
                <Input
                  id="shared-secret"
                  type="password"
                  placeholder="Enter RADIUS shared secret"
                  value={serverConfig?.radius?.sharedSecret || ""}
                  onChange={(e) =>
                    setServerConfig((prev) => ({
                      ...prev,
                      radius: { ...prev.radius, sharedSecret: e.target.value },
                    }))
                  }
                />
              </div>

              <div className="space-y-4">
                <Label className="text-base">Authentication Methods</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="pap"
                      checked={serverConfig?.radius?.authMethods?.pap || false}
                      onCheckedChange={(checked) =>
                        setServerConfig((prev) => ({
                          ...prev,
                          radius: {
                            ...prev.radius,
                            authMethods: { ...prev.radius.authMethods, pap: checked },
                          },
                        }))
                      }
                    />
                    <Label htmlFor="pap">PAP</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="chap"
                      checked={serverConfig?.radius?.authMethods?.chap || false}
                      onCheckedChange={(checked) =>
                        setServerConfig((prev) => ({
                          ...prev,
                          radius: {
                            ...prev.radius,
                            authMethods: { ...prev.radius.authMethods, chap: checked },
                          },
                        }))
                      }
                    />
                    <Label htmlFor="chap">CHAP</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="mschap"
                      checked={serverConfig?.radius?.authMethods?.mschap || false}
                      onCheckedChange={(checked) =>
                        setServerConfig((prev) => ({
                          ...prev,
                          radius: {
                            ...prev.radius,
                            authMethods: { ...prev.radius.authMethods, mschap: checked },
                          },
                        }))
                      }
                    />
                    <Label htmlFor="mschap">MS-CHAP</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="mschapv2"
                      checked={serverConfig?.radius?.authMethods?.mschapv2 || false}
                      onCheckedChange={(checked) =>
                        setServerConfig((prev) => ({
                          ...prev,
                          radius: {
                            ...prev.radius,
                            authMethods: { ...prev.radius.authMethods, mschapv2: checked },
                          },
                        }))
                      }
                    />
                    <Label htmlFor="mschapv2">MS-CHAPv2</Label>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => handleTestConnection("RADIUS", serverConfig?.radius)}
                  className="flex items-center space-x-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Test Connection</span>
                </Button>
                <Button onClick={() => handleSave("radius", serverConfig?.radius)} disabled={isPending}>
                  Save RADIUS Config
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="openvpn" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Server className="h-5 w-5" />
                <span>OpenVPN Server Configuration</span>
              </CardTitle>
              <CardDescription>Configure OpenVPN server settings and client access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable OpenVPN Server</Label>
                  <div className="text-sm text-muted-foreground">Enable VPN server for remote access</div>
                </div>
                <Switch
                  checked={serverConfig?.openvpn?.enabled || false}
                  onCheckedChange={(checked) =>
                    setServerConfig((prev) => ({
                      ...prev,
                      openvpn: { ...prev.openvpn, enabled: checked },
                    }))
                  }
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vpn-server-ip">Server IP Address</Label>
                  <Input
                    id="vpn-server-ip"
                    placeholder="Enter VPN server IP"
                    value={serverConfig?.openvpn?.serverIp || ""}
                    onChange={(e) =>
                      setServerConfig((prev) => ({
                        ...prev,
                        openvpn: { ...prev.openvpn, serverIp: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vpn-port">Port</Label>
                  <Input
                    id="vpn-port"
                    placeholder="1194"
                    value={serverConfig?.openvpn?.port || "1194"}
                    onChange={(e) =>
                      setServerConfig((prev) => ({
                        ...prev,
                        openvpn: { ...prev.openvpn, port: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vpn-protocol">Protocol</Label>
                  <Select
                    defaultValue={serverConfig?.openvpn?.protocol || "udp"}
                    onValueChange={(value) =>
                      setServerConfig((prev) => ({
                        ...prev,
                        openvpn: { ...prev.openvpn, protocol: value },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="udp">UDP</SelectItem>
                      <SelectItem value="tcp">TCP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vpn-cipher">Cipher</Label>
                  <Select
                    defaultValue={serverConfig?.openvpn?.cipher || "aes-256-cbc"}
                    onValueChange={(value) =>
                      setServerConfig((prev) => ({
                        ...prev,
                        openvpn: { ...prev.openvpn, cipher: value },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aes-256-cbc">AES-256-CBC</SelectItem>
                      <SelectItem value="aes-128-cbc">AES-128-CBC</SelectItem>
                      <SelectItem value="blowfish">Blowfish</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vpn-network">VPN Network</Label>
                <Input
                  id="vpn-network"
                  placeholder="10.8.0.0/24"
                  value={serverConfig?.openvpn?.network || "10.8.0.0/24"}
                  onChange={(e) =>
                    setServerConfig((prev) => ({
                      ...prev,
                      openvpn: { ...prev.openvpn, network: e.target.value },
                    }))
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary-dns">Primary DNS</Label>
                  <Input
                    id="primary-dns"
                    placeholder="8.8.8.8"
                    value={serverConfig?.openvpn?.primaryDns || "8.8.8.8"}
                    onChange={(e) =>
                      setServerConfig((prev) => ({
                        ...prev,
                        openvpn: { ...prev.openvpn, primaryDns: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondary-dns">Secondary DNS</Label>
                  <Input
                    id="secondary-dns"
                    placeholder="8.8.4.4"
                    value={serverConfig?.openvpn?.secondaryDns || "8.8.4.4"}
                    onChange={(e) =>
                      setServerConfig((prev) => ({
                        ...prev,
                        openvpn: { ...prev.openvpn, secondaryDns: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base">Security Options</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="tls-auth"
                      checked={serverConfig?.openvpn?.tlsAuth || false}
                      onCheckedChange={(checked) =>
                        setServerConfig((prev) => ({
                          ...prev,
                          openvpn: { ...prev.openvpn, tlsAuth: checked },
                        }))
                      }
                    />
                    <Label htmlFor="tls-auth">TLS Authentication</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="client-to-client"
                      checked={serverConfig?.openvpn?.clientToClient || false}
                      onCheckedChange={(checked) =>
                        setServerConfig((prev) => ({
                          ...prev,
                          openvpn: { ...prev.openvpn, clientToClient: checked },
                        }))
                      }
                    />
                    <Label htmlFor="client-to-client">Client-to-Client</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="duplicate-cn"
                      checked={serverConfig?.openvpn?.duplicateCn || false}
                      onCheckedChange={(checked) =>
                        setServerConfig((prev) => ({
                          ...prev,
                          openvpn: { ...prev.openvpn, duplicateCn: checked },
                        }))
                      }
                    />
                    <Label htmlFor="duplicate-cn">Duplicate CN</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="compression"
                      checked={serverConfig?.openvpn?.compression || false}
                      onCheckedChange={(checked) =>
                        setServerConfig((prev) => ({
                          ...prev,
                          openvpn: { ...prev.openvpn, compression: checked },
                        }))
                      }
                    />
                    <Label htmlFor="compression">Compression</Label>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => handleTestConnection("OpenVPN", serverConfig?.openvpn)}
                  className="flex items-center space-x-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Test Configuration</span>
                </Button>
                <Button onClick={() => handleSave("openvpn", serverConfig?.openvpn)} disabled={isPending}>
                  Save OpenVPN Config
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="network" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Network className="h-5 w-5" />
                <span>Network Management</span>
              </CardTitle>
              <CardDescription>Configure network infrastructure and monitoring settings</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeNetworkTab} onValueChange={setActiveNetworkTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="configuration" className="flex items-center space-x-2">
                    <Router className="h-4 w-4" />
                    <span>Network Configuration</span>
                  </TabsTrigger>
                  <TabsTrigger value="monitoring" className="flex items-center space-x-2">
                    <Activity className="h-4 w-4" />
                    <span>Monitoring</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="configuration" className="space-y-6 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gateway">Default Gateway</Label>
                      <Input
                        id="gateway"
                        placeholder="Enter gateway IP"
                        value={serverConfig?.network?.gateway || ""}
                        onChange={(e) =>
                          setServerConfig((prev) => ({
                            ...prev,
                            network: { ...prev.network, gateway: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subnet-mask">Subnet Mask</Label>
                      <Input
                        id="subnet-mask"
                        placeholder="255.255.255.0"
                        value={serverConfig?.network?.subnetMask || "255.255.255.0"}
                        onChange={(e) =>
                          setServerConfig((prev) => ({
                            ...prev,
                            network: { ...prev.network, subnetMask: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="management-vlan">Management VLAN</Label>
                      <Input
                        id="management-vlan"
                        placeholder="Enter VLAN ID"
                        value={serverConfig?.network?.managementVlan || ""}
                        onChange={(e) =>
                          setServerConfig((prev) => ({
                            ...prev,
                            network: { ...prev.network, managementVlan: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer-vlan">Customer VLAN Range</Label>
                      <Input
                        id="customer-vlan"
                        placeholder="200-299"
                        value={serverConfig?.network?.customerVlan || ""}
                        onChange={(e) =>
                          setServerConfig((prev) => ({
                            ...prev,
                            network: { ...prev.network, customerVlan: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="snmp-community">SNMP Community</Label>
                    <Input
                      id="snmp-community"
                      placeholder="public"
                      value={serverConfig?.network?.snmpCommunity || "public"}
                      onChange={(e) =>
                        setServerConfig((prev) => ({
                          ...prev,
                          network: { ...prev.network, snmpCommunity: e.target.value },
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ntp-server">NTP Server</Label>
                    <Input
                      id="ntp-server"
                      placeholder="pool.ntp.org"
                      value={serverConfig?.network?.ntpServer || "pool.ntp.org"}
                      onChange={(e) =>
                        setServerConfig((prev) => ({
                          ...prev,
                          network: { ...prev.network, ntpServer: e.target.value },
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base">Network Features</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="firewall"
                          checked={serverConfig?.network?.features?.firewall || false}
                          onCheckedChange={(checked) =>
                            setServerConfig((prev) => ({
                              ...prev,
                              network: {
                                ...prev.network,
                                features: { ...prev.network.features, firewall: checked },
                              },
                            }))
                          }
                        />
                        <Label htmlFor="firewall">Firewall</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="ddos-protection"
                          checked={serverConfig?.network?.features?.ddosProtection || false}
                          onCheckedChange={(checked) =>
                            setServerConfig((prev) => ({
                              ...prev,
                              network: {
                                ...prev.network,
                                features: { ...prev.network.features, ddosProtection: checked },
                              },
                            }))
                          }
                        />
                        <Label htmlFor="ddos-protection">DDoS Protection</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="port-scan"
                          checked={serverConfig?.network?.features?.portScan || false}
                          onCheckedChange={(checked) =>
                            setServerConfig((prev) => ({
                              ...prev,
                              network: {
                                ...prev.network,
                                features: { ...prev.network.features, portScan: checked },
                              },
                            }))
                          }
                        />
                        <Label htmlFor="port-scan">Port Scan Detection</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="intrusion-detection"
                          checked={serverConfig?.network?.features?.intrusionDetection || false}
                          onCheckedChange={(checked) =>
                            setServerConfig((prev) => ({
                              ...prev,
                              network: {
                                ...prev.network,
                                features: { ...prev.network.features, intrusionDetection: checked },
                              },
                            }))
                          }
                        />
                        <Label htmlFor="intrusion-detection">Intrusion Detection</Label>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="upload-limit">Default Upload Limit (Mbps)</Label>
                      <Input
                        id="upload-limit"
                        placeholder="10"
                        value={serverConfig?.network?.uploadLimit || "10"}
                        onChange={(e) =>
                          setServerConfig((prev) => ({
                            ...prev,
                            network: { ...prev.network, uploadLimit: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="download-limit">Default Download Limit (Mbps)</Label>
                      <Input
                        id="download-limit"
                        placeholder="50"
                        value={serverConfig?.network?.downloadLimit || "50"}
                        onChange={(e) =>
                          setServerConfig((prev) => ({
                            ...prev,
                            network: { ...prev.network, downloadLimit: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="burst-ratio">Burst Ratio</Label>
                      <Input
                        id="burst-ratio"
                        placeholder="1.5"
                        value={serverConfig?.network?.burstRatio || "1.5"}
                        onChange={(e) =>
                          setServerConfig((prev) => ({
                            ...prev,
                            network: { ...prev.network, burstRatio: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="monitoring" className="space-y-6 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Network Status</CardTitle>
                        <Wifi className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Online</span>
                        </div>
                        <p className="text-xs text-muted-foreground">All systems operational</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">1,234</div>
                        <p className="text-xs text-muted-foreground">+12% from last hour</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Bandwidth Usage</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">67%</div>
                        <p className="text-xs text-muted-foreground">of total capacity</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Alerts</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">3</div>
                        <p className="text-xs text-muted-foreground">2 warnings, 1 critical</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base">Monitoring Settings</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="snmp-monitoring"
                          checked={serverConfig?.network?.monitoring?.snmpMonitoring || false}
                          onCheckedChange={(checked) =>
                            setServerConfig((prev) => ({
                              ...prev,
                              network: {
                                ...prev.network,
                                monitoring: { ...prev.network.monitoring, snmpMonitoring: checked },
                              },
                            }))
                          }
                        />
                        <Label htmlFor="snmp-monitoring">SNMP Monitoring</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="bandwidth-monitoring"
                          checked={serverConfig?.network?.monitoring?.bandwidthMonitoring || false}
                          onCheckedChange={(checked) =>
                            setServerConfig((prev) => ({
                              ...prev,
                              network: {
                                ...prev.network,
                                monitoring: { ...prev.network.monitoring, bandwidthMonitoring: checked },
                              },
                            }))
                          }
                        />
                        <Label htmlFor="bandwidth-monitoring">Bandwidth Monitoring</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="uptime-monitoring"
                          checked={serverConfig?.network?.monitoring?.uptimeMonitoring || false}
                          onCheckedChange={(checked) =>
                            setServerConfig((prev) => ({
                              ...prev,
                              network: {
                                ...prev.network,
                                monitoring: { ...prev.network.monitoring, uptimeMonitoring: checked },
                              },
                            }))
                          }
                        />
                        <Label htmlFor="uptime-monitoring">Uptime Monitoring</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="alert-notifications"
                          checked={serverConfig?.network?.monitoring?.alertNotifications || false}
                          onCheckedChange={(checked) =>
                            setServerConfig((prev) => ({
                              ...prev,
                              network: {
                                ...prev.network,
                                monitoring: { ...prev.network.monitoring, alertNotifications: checked },
                              },
                            }))
                          }
                        />
                        <Label htmlFor="alert-notifications">Alert Notifications</Label>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="monitoring-interval">Monitoring Interval (minutes)</Label>
                      <Input
                        id="monitoring-interval"
                        placeholder="5"
                        value={serverConfig?.network?.monitoringInterval || "5"}
                        onChange={(e) =>
                          setServerConfig((prev) => ({
                            ...prev,
                            network: { ...prev.network, monitoringInterval: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alert-threshold">Alert Threshold (%)</Label>
                      <Input
                        id="alert-threshold"
                        placeholder="80"
                        value={serverConfig?.network?.alertThreshold || "80"}
                        onChange={(e) =>
                          setServerConfig((prev) => ({
                            ...prev,
                            network: { ...prev.network, alertThreshold: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
