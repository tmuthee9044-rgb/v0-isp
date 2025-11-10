"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Navigation, Search, Copy, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface MapPickerProps {
  onLocationSelect?: (lat: number, lng: number, address?: string) => void
  initialLat?: number
  initialLng?: number
  height?: string
  title?: string
}

export function MapPicker({
  onLocationSelect,
  initialLat = -1.2921,
  initialLng = 36.8219,
  height = "400px",
  title = "Select Location",
}: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [marker, setMarker] = useState<any>(null)
  const [coordinates, setCoordinates] = useState({ lat: initialLat, lng: initialLng })
  const [address, setAddress] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const mapContainerId = useRef(`map-${Math.random().toString(36).substr(2, 9)}`)
  const { toast } = useToast()

  useEffect(() => {
    if (typeof window !== "undefined" && !leafletLoaded) {
      // Load Leaflet CSS
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      link.crossOrigin = ""
      document.head.appendChild(link)

      // Load Leaflet JS
      const script = document.createElement("script")
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      script.crossOrigin = ""
      script.onload = () => {
        setLeafletLoaded(true)
      }
      document.head.appendChild(script)

      return () => {
        try {
          document.head.removeChild(link)
          document.head.removeChild(script)
        } catch (e) {
          // Elements might already be removed
        }
      }
    }
  }, [leafletLoaded])

  useEffect(() => {
    if (leafletLoaded && mapRef.current && !map) {
      const L = (window as any).L

      if (!L) return

      // Fix for default markers
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      })

      const mapInstance = L.map(mapRef.current).setView([coordinates.lat, coordinates.lng], 13)

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapInstance)

      const markerInstance = L.marker([coordinates.lat, coordinates.lng], {
        draggable: true,
      }).addTo(mapInstance)

      markerInstance.on("dragend", (e: any) => {
        const { lat, lng } = e.target.getLatLng()
        setCoordinates({ lat, lng })
        reverseGeocode(lat, lng)
        onLocationSelect?.(lat, lng)
      })

      mapInstance.on("click", (e: any) => {
        const { lat, lng } = e.latlng
        markerInstance.setLatLng([lat, lng])
        setCoordinates({ lat, lng })
        reverseGeocode(lat, lng)
        onLocationSelect?.(lat, lng)
      })

      setMap(mapInstance)
      setMarker(markerInstance)

      // Initial reverse geocoding
      reverseGeocode(coordinates.lat, coordinates.lng)
    }

    return () => {
      if (map) {
        try {
          map.off()
          map.remove()
        } catch (e) {
          console.warn("Error cleaning up map:", e)
        }
        setMap(null)
        setMarker(null)
      }
    }
  }, [leafletLoaded])

  useEffect(() => {
    if (map && marker && (coordinates.lat !== initialLat || coordinates.lng !== initialLng)) {
      marker.setLatLng([coordinates.lat, coordinates.lng])
      map.setView([coordinates.lat, coordinates.lng], map.getZoom())
    }
  }, [coordinates.lat, coordinates.lng, map, marker])

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      )

      // Check if response is ok and content type is JSON
      if (!response.ok) {
        console.error(`Reverse geocoding failed with status: ${response.status}`)
        return
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Reverse geocoding returned non-JSON response")
        return
      }

      const data = await response.json()
      if (data.display_name) {
        setAddress(data.display_name)
      }
    } catch (error) {
      console.error("Reverse geocoding failed:", error)
      setAddress("Address lookup failed")
    }
  }

  const searchLocation = async () => {
    if (!searchQuery.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
      )

      if (!response.ok) {
        throw new Error(`Search failed with status: ${response.status}`)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Search returned non-JSON response")
      }

      const data = await response.json()

      if (data.length > 0) {
        const { lat, lon, display_name } = data[0]
        const newLat = Number.parseFloat(lat)
        const newLng = Number.parseFloat(lon)

        setCoordinates({ lat: newLat, lng: newLng })
        setAddress(display_name)

        if (map && marker) {
          map.setView([newLat, newLng], 15)
          marker.setLatLng([newLat, newLng])
        }

        onLocationSelect?.(newLat, newLng, display_name)

        toast({
          title: "Location Found",
          description: "Map updated to searched location",
        })
      } else {
        toast({
          title: "Location Not Found",
          description: "Please try a different search term",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Search Failed",
        description: "Unable to search for location",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      setIsLoading(true)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setCoordinates({ lat: latitude, lng: longitude })

          if (map && marker) {
            map.setView([latitude, longitude], 15)
            marker.setLatLng([latitude, longitude])
          }

          reverseGeocode(latitude, longitude)
          onLocationSelect?.(latitude, longitude)
          setIsLoading(false)

          toast({
            title: "Location Updated",
            description: "Map updated to your current location",
          })
        },
        (error) => {
          setIsLoading(false)
          toast({
            title: "Location Access Denied",
            description: "Please enable location access or search manually",
            variant: "destructive",
          })
        },
      )
    } else {
      toast({
        title: "Geolocation Not Supported",
        description: "Your browser doesn't support geolocation",
        variant: "destructive",
      })
    }
  }

  const copyCoordinates = async () => {
    const coordText = `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`
    try {
      await navigator.clipboard.writeText(coordText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: "Coordinates Copied",
        description: "GPS coordinates copied to clipboard",
      })
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy coordinates",
        variant: "destructive",
      })
    }
  }

  if (!leafletLoaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>Loading map...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>Click on the map or drag the marker to set GPS coordinates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Controls */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <Input
              placeholder="Search for an address or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && searchLocation()}
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={searchLocation} disabled={isLoading}>
              <Search className="h-4 w-4 mr-1" />
              Search
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={getCurrentLocation} disabled={isLoading}>
              <Navigation className="h-4 w-4 mr-1" />
              My Location
            </Button>
          </div>
        </div>

        {/* Map Container */}
        <div className="relative">
          <div ref={mapRef} id={mapContainerId.current} style={{ height }} className="w-full rounded-lg border" />
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-lg">
              <div className="bg-white p-3 rounded-lg shadow-lg">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            </div>
          )}
        </div>

        {/* Coordinates Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>GPS Coordinates</Label>
            <div className="flex items-center gap-2">
              <Input
                value={`${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`}
                readOnly
                className="font-mono text-sm"
              />
              <Button type="button" variant="outline" size="sm" onClick={copyCoordinates}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Detected Address</Label>
            <Input value={address} readOnly placeholder="Address will appear here..." className="text-sm" />
          </div>
        </div>

        {/* Manual Coordinate Input */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="manualLat">Latitude</Label>
            <Input
              id="manualLat"
              type="number"
              step="any"
              value={coordinates.lat}
              onChange={(e) => {
                const lat = Number.parseFloat(e.target.value) || 0
                setCoordinates((prev) => ({ ...prev, lat }))
                if (map && marker) {
                  map.setView([lat, coordinates.lng], map.getZoom())
                  marker.setLatLng([lat, coordinates.lng])
                }
                onLocationSelect?.(lat, coordinates.lng)
              }}
              placeholder="-1.2921"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manualLng">Longitude</Label>
            <Input
              id="manualLng"
              type="number"
              step="any"
              value={coordinates.lng}
              onChange={(e) => {
                const lng = Number.parseFloat(e.target.value) || 0
                setCoordinates((prev) => ({ ...prev, lng }))
                if (map && marker) {
                  map.setView([coordinates.lat, lng], map.getZoom())
                  marker.setLatLng([coordinates.lat, lng])
                }
                onLocationSelect?.(coordinates.lat, lng)
              }}
              placeholder="36.8219"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
