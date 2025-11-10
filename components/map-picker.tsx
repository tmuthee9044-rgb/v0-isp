"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Navigation, Search } from "lucide-react"

interface MapPickerProps {
  title: string
  onLocationSelect: (lat: number, lng: number, address?: string) => void
  initialLat: number
  initialLng: number
  height?: string
}

export default function MapPicker({
  title,
  onLocationSelect,
  initialLat,
  initialLng,
  height = "300px",
}: MapPickerProps) {
  const [coordinates, setCoordinates] = useState({
    lat: initialLat,
    lng: initialLng,
  })
  const [address, setAddress] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setCoordinates({ lat: initialLat, lng: initialLng })
  }, [initialLat, initialLng])

  const handleCoordinateChange = (field: "lat" | "lng", value: string) => {
    const numValue = Number.parseFloat(value)
    if (!isNaN(numValue)) {
      const newCoords = { ...coordinates, [field]: numValue }
      setCoordinates(newCoords)
      onLocationSelect(newCoords.lat, newCoords.lng, address || undefined)
    }
  }

  const getCurrentLocation = () => {
    setIsLoading(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setCoordinates({ lat: latitude, lng: longitude })
          onLocationSelect(latitude, longitude, "Current Location")
          setIsLoading(false)
        },
        (error) => {
          console.error("Error getting location:", error)
          setIsLoading(false)
        },
      )
    } else {
      console.error("Geolocation is not supported by this browser")
      setIsLoading(false)
    }
  }

  const searchAddress = async () => {
    if (!address.trim()) return

    setIsLoading(true)
    try {
      // Simple geocoding simulation for Kenya locations
      // In a real implementation, you would use a geocoding service
      const kenyaLocations: { [key: string]: { lat: number; lng: number } } = {
        nairobi: { lat: -1.2921, lng: 36.8219 },
        mombasa: { lat: -4.0435, lng: 39.6682 },
        kisumu: { lat: -0.0917, lng: 34.768 },
        nakuru: { lat: -0.3031, lng: 36.08 },
        eldoret: { lat: 0.5143, lng: 35.2698 },
      }

      const searchKey = address.toLowerCase()
      const found = Object.keys(kenyaLocations).find((key) => searchKey.includes(key) || key.includes(searchKey))

      if (found) {
        const location = kenyaLocations[found]
        setCoordinates(location)
        onLocationSelect(location.lat, location.lng, address)
      }
    } catch (error) {
      console.error("Error searching address:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Address Search */}
        <div className="space-y-2">
          <Label htmlFor="address-search">Search Address</Label>
          <div className="flex gap-2">
            <Input
              id="address-search"
              placeholder="Enter city or landmark (e.g., Nairobi, Mombasa)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && searchAddress()}
            />
            <Button type="button" variant="outline" onClick={searchAddress} disabled={isLoading}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Current Location Button */}
        <Button
          type="button"
          variant="outline"
          onClick={getCurrentLocation}
          disabled={isLoading}
          className="w-full bg-transparent"
        >
          <Navigation className="mr-2 h-4 w-4" />
          {isLoading ? "Getting Location..." : "Use Current Location"}
        </Button>

        {/* Manual Coordinate Input */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              type="number"
              step="any"
              value={coordinates.lat}
              onChange={(e) => handleCoordinateChange("lat", e.target.value)}
              placeholder="-1.2921"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              type="number"
              step="any"
              value={coordinates.lng}
              onChange={(e) => handleCoordinateChange("lng", e.target.value)}
              placeholder="36.8219"
            />
          </div>
        </div>

        {/* Map Placeholder */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50"
          style={{ height }}
        >
          <div className="text-center space-y-2">
            <MapPin className="h-8 w-8 mx-auto text-gray-400" />
            <div className="text-sm text-gray-600">
              <p className="font-medium">Selected Location:</p>
              <p>Lat: {coordinates.lat.toFixed(6)}</p>
              <p>Lng: {coordinates.lng.toFixed(6)}</p>
            </div>
            <p className="text-xs text-gray-500">
              Interactive map integration available for enhanced location selection
            </p>
          </div>
        </div>

        {/* Quick Location Presets for Kenya */}
        <div className="space-y-2">
          <Label>Quick Locations (Kenya)</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { name: "Nairobi CBD", lat: -1.2921, lng: 36.8219 },
              { name: "Westlands", lat: -1.2676, lng: 36.8108 },
              { name: "Karen", lat: -1.3197, lng: 36.6859 },
              { name: "Mombasa", lat: -4.0435, lng: 39.6682 },
              { name: "Kisumu", lat: -0.0917, lng: 34.768 },
              { name: "Nakuru", lat: -0.3031, lng: 36.08 },
            ].map((location) => (
              <Button
                key={location.name}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setCoordinates({ lat: location.lat, lng: location.lng })
                  onLocationSelect(location.lat, location.lng, location.name)
                }}
                className="text-xs"
              >
                {location.name}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
