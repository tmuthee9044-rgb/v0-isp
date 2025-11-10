"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, Plus } from "lucide-react"

interface Equipment {
  id: number
  equipment_name: string
  equipment_type: string
  serial_number: string
  mac_address?: string
  ip_address?: string
  status: string
  assigned_date: string
  monthly_cost: number
}

export function CustomerEquipmentTab({ customerId }: { customerId: number }) {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEquipment()
  }, [customerId])

  const fetchEquipment = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}/equipment`)
      if (response.ok) {
        const data = await response.json()
        setEquipment(data.equipment || [])
      }
    } catch (error) {
      console.error("Error fetching equipment:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading equipment...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Assigned Equipment</h3>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Assign Equipment
        </Button>
      </div>

      {equipment.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No equipment assigned to this customer
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {equipment.map((item) => (
            <Card key={item.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Package className="h-8 w-8 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{item.equipment_name}</p>
                      <Badge variant={item.status === "active" ? "default" : "secondary"}>{item.status}</Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>Type: {item.equipment_type}</p>
                      <p>Serial: {item.serial_number}</p>
                      {item.mac_address && <p>MAC: {item.mac_address}</p>}
                      {item.ip_address && <p>IP: {item.ip_address}</p>}
                      <p>Assigned: {new Date(item.assigned_date).toLocaleDateString()}</p>
                      {item.monthly_cost > 0 && (
                        <p className="font-medium text-foreground">
                          Monthly Cost: KES {Number(item.monthly_cost).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
