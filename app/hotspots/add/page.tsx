"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { ArrowLeft, Wifi } from "lucide-react"
import Link from "next/link"

export default function AddHotspotPage() {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get("name"),
      location: formData.get("location"),
      address: formData.get("address"),
      latitude: formData.get("latitude") ? Number.parseFloat(formData.get("latitude") as string) : null,
      longitude: formData.get("longitude") ? Number.parseFloat(formData.get("longitude") as string) : null,
      ssid: formData.get("ssid"),
      password: formData.get("password"),
      security_type: formData.get("security_type"),
      bandwidth_limit: formData.get("bandwidth_limit")
        ? Number.parseInt(formData.get("bandwidth_limit") as string)
        : null,
      user_limit: formData.get("user_limit") ? Number.parseInt(formData.get("user_limit") as string) : 50,
      device_mac: formData.get("device_mac"),
      device_model: formData.get("device_model"),
      ip_address: formData.get("ip_address"),
    }

    try {
      const response = await fetch("/api/hotspots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Hotspot created successfully",
        })
        router.push("/hotspots")
      } else {
        throw new Error("Failed to create hotspot")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create hotspot",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/hotspots">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add New Hotspot</h1>
          <p className="text-gray-600">Create a new WiFi hotspot location</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Hotspot Configuration
          </CardTitle>
          <CardDescription>Configure the basic settings for your new hotspot</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Hotspot Name *</Label>
                <Input id="name" name="name" placeholder="e.g., Main Office WiFi" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input id="location" name="location" placeholder="e.g., Main Office" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" name="address" placeholder="Full address of the hotspot location" rows={2} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input id="latitude" name="latitude" type="number" step="any" placeholder="e.g., -1.2921" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input id="longitude" name="longitude" type="number" step="any" placeholder="e.g., 36.8219" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="ssid">SSID (Network Name) *</Label>
                <Input id="ssid" name="ssid" placeholder="e.g., TechConnect_WiFi" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">WiFi Password</Label>
                <Input id="password" name="password" type="password" placeholder="Network password" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="security_type">Security Type</Label>
                <Select name="security_type" defaultValue="WPA2">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WPA2">WPA2</SelectItem>
                    <SelectItem value="WPA3">WPA3</SelectItem>
                    <SelectItem value="Open">Open</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bandwidth_limit">Bandwidth Limit (Mbps)</Label>
                <Input id="bandwidth_limit" name="bandwidth_limit" type="number" placeholder="e.g., 100" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user_limit">User Limit</Label>
                <Input
                  id="user_limit"
                  name="user_limit"
                  type="number"
                  defaultValue="50"
                  placeholder="Maximum concurrent users"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="device_mac">Device MAC Address</Label>
                <Input id="device_mac" name="device_mac" placeholder="e.g., 00:11:22:33:44:55" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="device_model">Device Model</Label>
                <Input id="device_model" name="device_model" placeholder="e.g., Ubiquiti UniFi AP" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ip_address">IP Address</Label>
                <Input id="ip_address" name="ip_address" placeholder="e.g., 192.168.1.100" />
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Hotspot"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/hotspots">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
