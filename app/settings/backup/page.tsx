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
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  Database,
  HardDrive,
  Cloud,
  Shield,
  Clock,
  Download,
  Settings,
  CheckCircle,
  AlertCircle,
  Calendar,
  FileText,
  Server,
  Archive,
  RefreshCw,
  RotateCcw,
} from "lucide-react"
import {
  createBackupJob,
  getBackupHistory,
  testBackupConnection,
  restoreFromBackup,
} from "@/app/actions/backup-actions"

export default function BackupSettingsPage() {
  const [isPending, setIsPending] = useState(false)
  const [backupHistory, setBackupHistory] = useState([])
  const [backupProgress, setBackupProgress] = useState(0)
  const [isBackupRunning, setIsBackupRunning] = useState(false)
  const [activeTab, setActiveTab] = useState("settings")

  useEffect(() => {
    loadBackupHistory()
  }, [])

  const loadBackupHistory = async () => {
    const result = await getBackupHistory()
    if (result.success) {
      setBackupHistory(result.data)
    }
  }

  const handleSaveSettings = async () => {
    setIsPending(true)
    // Simulate save operation
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsPending(false)
  }

  const handleTestConnection = async (type: string) => {
    setIsPending(true)
    const result = await testBackupConnection(type)
    setIsPending(false)
    alert(result.success ? result.message : result.error)
  }

  const handleCreateBackup = async () => {
    setIsBackupRunning(true)
    setBackupProgress(0)

    // Simulate backup progress
    const interval = setInterval(() => {
      setBackupProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsBackupRunning(false)
          loadBackupHistory()
          return 100
        }
        return prev + 10
      })
    }, 500)

    await createBackupJob({
      type: "full",
      description: "Manual full backup",
    })
  }

  const handleRestore = async (backupId: string) => {
    if (confirm("Are you sure you want to restore from this backup? This will overwrite current data.")) {
      setIsPending(true)
      const result = await restoreFromBackup(backupId)
      setIsPending(false)
      alert(result.success ? "Restore completed successfully" : result.error)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Backup</h2>
          <p className="text-muted-foreground">Configure automated backups and manage system data protection</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleCreateBackup} disabled={isBackupRunning} className="flex items-center space-x-2">
            {isBackupRunning ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Creating Backup...</span>
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" />
                <span>Create Backup Now</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {isBackupRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Backup Progress</Label>
                <span className="text-sm text-muted-foreground">{backupProgress}%</span>
              </div>
              <Progress value={backupProgress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Schedule</span>
          </TabsTrigger>
          <TabsTrigger value="storage" className="flex items-center space-x-2">
            <Cloud className="h-4 w-4" />
            <span>Storage</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Database Backup</span>
                </CardTitle>
                <CardDescription>Configure database backup settings and retention</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Enable Database Backup</Label>
                    <div className="text-sm text-muted-foreground">Automatically backup all database tables</div>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="db-retention">Retention Period (days)</Label>
                  <Input id="db-retention" placeholder="30" defaultValue="30" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="db-compression">Compression Level</Label>
                  <Select defaultValue="medium">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <Label className="text-base">Backup Components</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch id="customers" defaultChecked />
                      <Label htmlFor="customers">Customer Data</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="billing" defaultChecked />
                      <Label htmlFor="billing">Billing Records</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="network" defaultChecked />
                      <Label htmlFor="network">Network Configuration</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="logs" />
                      <Label htmlFor="logs">System Logs</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="settings" defaultChecked />
                      <Label htmlFor="settings">System Settings</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <HardDrive className="h-5 w-5" />
                  <span>File System Backup</span>
                </CardTitle>
                <CardDescription>Configure file system and configuration backups</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Enable File Backup</Label>
                    <div className="text-sm text-muted-foreground">Backup configuration files and uploads</div>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file-retention">Retention Period (days)</Label>
                  <Input id="file-retention" placeholder="14" defaultValue="14" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backup-paths">Backup Paths</Label>
                  <Textarea
                    id="backup-paths"
                    placeholder="/etc/config&#10;/var/uploads&#10;/opt/certificates"
                    defaultValue="/etc/config&#10;/var/uploads&#10;/opt/certificates"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exclude-patterns">Exclude Patterns</Label>
                  <Textarea
                    id="exclude-patterns"
                    placeholder="*.tmp&#10;*.log&#10;cache/*"
                    defaultValue="*.tmp&#10;*.log&#10;cache/*"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security & Encryption</span>
              </CardTitle>
              <CardDescription>Configure backup encryption and security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable Encryption</Label>
                  <div className="text-sm text-muted-foreground">Encrypt backups using AES-256</div>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="encryption-key">Encryption Key</Label>
                  <Input id="encryption-key" type="password" placeholder="Enter encryption key" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-key">Confirm Key</Label>
                  <Input id="confirm-key" type="password" placeholder="Confirm encryption key" />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base">Security Options</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch id="integrity-check" defaultChecked />
                    <Label htmlFor="integrity-check">Integrity Verification</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="secure-delete" />
                    <Label htmlFor="secure-delete">Secure Delete Old Backups</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="access-logging" defaultChecked />
                    <Label htmlFor="access-logging">Log Backup Access</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="notification" defaultChecked />
                    <Label htmlFor="notification">Email Notifications</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} disabled={isPending}>
              {isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Backup Schedule</span>
              </CardTitle>
              <CardDescription>Configure automated backup schedules and timing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable Scheduled Backups</Label>
                  <div className="text-sm text-muted-foreground">Automatically create backups on schedule</div>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-medium">Full Backup Schedule</h4>
                  <div className="space-y-2">
                    <Label htmlFor="full-frequency">Frequency</Label>
                    <Select defaultValue="weekly">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="full-time">Time</Label>
                    <Input id="full-time" type="time" defaultValue="02:00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="full-day">Day of Week</Label>
                    <Select defaultValue="sunday">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sunday">Sunday</SelectItem>
                        <SelectItem value="monday">Monday</SelectItem>
                        <SelectItem value="tuesday">Tuesday</SelectItem>
                        <SelectItem value="wednesday">Wednesday</SelectItem>
                        <SelectItem value="thursday">Thursday</SelectItem>
                        <SelectItem value="friday">Friday</SelectItem>
                        <SelectItem value="saturday">Saturday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Incremental Backup Schedule</h4>
                  <div className="space-y-2">
                    <Label htmlFor="inc-frequency">Frequency</Label>
                    <Select defaultValue="daily">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inc-time">Time</Label>
                    <Input id="inc-time" type="time" defaultValue="01:00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inc-interval">Interval (hours)</Label>
                    <Input id="inc-interval" placeholder="6" defaultValue="6" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Maintenance Window</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-start">Start Time</Label>
                    <Input id="maintenance-start" type="time" defaultValue="01:00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-end">End Time</Label>
                    <Input id="maintenance-end" type="time" defaultValue="05:00" />
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Backups will only run during this maintenance window to minimize system impact
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <HardDrive className="h-5 w-5" />
                  <span>Local Storage</span>
                </CardTitle>
                <CardDescription>Configure local backup storage settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Enable Local Storage</Label>
                    <div className="text-sm text-muted-foreground">Store backups on local filesystem</div>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="local-path">Storage Path</Label>
                  <Input id="local-path" placeholder="/var/backups" defaultValue="/var/backups" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="local-quota">Storage Quota (GB)</Label>
                  <Input id="local-quota" placeholder="100" defaultValue="100" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="local-cleanup">Auto Cleanup</Label>
                  <Select defaultValue="size">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="age">By Age</SelectItem>
                      <SelectItem value="size">By Size</SelectItem>
                      <SelectItem value="count">By Count</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button variant="outline" onClick={() => handleTestConnection("local")} className="w-full">
                  Test Local Storage
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Cloud className="h-5 w-5" />
                  <span>Cloud Storage</span>
                </CardTitle>
                <CardDescription>Configure cloud backup storage providers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Enable Cloud Storage</Label>
                    <div className="text-sm text-muted-foreground">Store backups in cloud storage</div>
                  </div>
                  <Switch />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cloud-provider">Provider</Label>
                  <Select defaultValue="aws">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aws">Amazon S3</SelectItem>
                      <SelectItem value="gcp">Google Cloud Storage</SelectItem>
                      <SelectItem value="azure">Azure Blob Storage</SelectItem>
                      <SelectItem value="dropbox">Dropbox</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cloud-bucket">Bucket/Container</Label>
                  <Input id="cloud-bucket" placeholder="isp-backups" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cloud-region">Region</Label>
                  <Input id="cloud-region" placeholder="us-east-1" />
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="access-key">Access Key</Label>
                    <Input id="access-key" type="password" placeholder="Enter access key" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secret-key">Secret Key</Label>
                    <Input id="secret-key" type="password" placeholder="Enter secret key" />
                  </div>
                </div>

                <Button variant="outline" onClick={() => handleTestConnection("cloud")} className="w-full" disabled>
                  Test Cloud Connection
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Server className="h-5 w-5" />
                <span>Remote Storage</span>
              </CardTitle>
              <CardDescription>Configure remote server backup storage via FTP/SFTP</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable Remote Storage</Label>
                  <div className="text-sm text-muted-foreground">Store backups on remote servers</div>
                </div>
                <Switch />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="remote-protocol">Protocol</Label>
                  <Select defaultValue="sftp">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ftp">FTP</SelectItem>
                      <SelectItem value="sftp">SFTP</SelectItem>
                      <SelectItem value="scp">SCP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remote-host">Host</Label>
                  <Input id="remote-host" placeholder="backup.example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remote-port">Port</Label>
                  <Input id="remote-port" placeholder="22" defaultValue="22" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remote-path">Remote Path</Label>
                  <Input id="remote-path" placeholder="/backups/isp" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remote-username">Username</Label>
                  <Input id="remote-username" placeholder="backup-user" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remote-password">Password</Label>
                  <Input id="remote-password" type="password" placeholder="Enter password" />
                </div>
              </div>

              <Button variant="outline" onClick={() => handleTestConnection("remote")} className="w-full" disabled>
                Test Remote Connection
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Backup History</span>
              </CardTitle>
              <CardDescription>View and manage backup history and restore points</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Sample backup history data */}
                {[
                  {
                    id: "1",
                    type: "Full",
                    date: "2024-01-15 02:00:00",
                    size: "2.4 GB",
                    status: "Completed",
                    duration: "45 minutes",
                  },
                  {
                    id: "2",
                    type: "Incremental",
                    date: "2024-01-14 01:00:00",
                    size: "156 MB",
                    status: "Completed",
                    duration: "8 minutes",
                  },
                  {
                    id: "3",
                    type: "Full",
                    date: "2024-01-08 02:00:00",
                    size: "2.3 GB",
                    status: "Completed",
                    duration: "42 minutes",
                  },
                  {
                    id: "4",
                    type: "Incremental",
                    date: "2024-01-07 01:00:00",
                    size: "89 MB",
                    status: "Failed",
                    duration: "N/A",
                  },
                ].map((backup) => (
                  <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {backup.status === "Completed" ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <div className="font-medium">{backup.type} Backup</div>
                          <div className="text-sm text-muted-foreground">{backup.date}</div>
                        </div>
                      </div>
                      <div className="text-sm">
                        <div>Size: {backup.size}</div>
                        <div>Duration: {backup.duration}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={backup.status === "Completed" ? "default" : "destructive"}>{backup.status}</Badge>
                      {backup.status === "Completed" && (
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestore(backup.id)}
                            className="flex items-center space-x-1"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Restore</span>
                          </Button>
                          <Button size="sm" variant="outline" className="flex items-center space-x-1 bg-transparent">
                            <Download className="h-3 w-3" />
                            <span>Download</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
