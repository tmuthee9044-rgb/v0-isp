"use client"

import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useIsMobile } from "@/components/ui/use-mobile"
import { MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface ResponsiveTableProps {
  data: any[]
  columns: {
    key: string
    label: string
    render?: (value: any, item: any) => React.ReactNode
    mobileHide?: boolean
  }[]
  actions?: {
    label: string
    onClick: (item: any) => void
    variant?: "default" | "destructive"
  }[]
  emptyMessage?: string
  onRowClick?: (item: any) => void
}

export function ResponsiveTable({
  data,
  columns,
  actions = [],
  emptyMessage = "No data available",
  onRowClick,
}: ResponsiveTableProps) {
  const isMobile = useIsMobile()

  if (data.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </Card>
    )
  }

  if (isMobile) {
    return (
      <div className="space-y-3">
        {data.map((item, index) => (
          <Card
            key={index}
            className={`p-4 ${onRowClick ? "cursor-pointer hover:bg-accent" : ""}`}
            onClick={() => onRowClick?.(item)}
          >
            <CardContent className="p-0">
              <div className="space-y-2">
                {columns
                  .filter((col) => !col.mobileHide)
                  .map((column) => (
                    <div key={column.key} className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-medium">{column.label}:</span>
                      <span className="text-right">
                        {column.render ? column.render(item[column.key], item) : item[column.key]}
                      </span>
                    </div>
                  ))}
                {actions.length > 0 && (
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    {actions.map((action, actionIndex) => (
                      <Button
                        key={actionIndex}
                        size="sm"
                        variant={action.variant || "outline"}
                        onClick={(e) => {
                          e.stopPropagation()
                          action.onClick(item)
                        }}
                        className="flex-1 text-xs"
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key}>{column.label}</TableHead>
            ))}
            {actions.length > 0 && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => (
            <TableRow key={index} className={onRowClick ? "cursor-pointer" : ""} onClick={() => onRowClick?.(item)}>
              {columns.map((column) => (
                <TableCell key={column.key}>
                  {column.render ? column.render(item[column.key], item) : item[column.key]}
                </TableCell>
              ))}
              {actions.length > 0 && (
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {actions.map((action, actionIndex) => (
                        <DropdownMenuItem
                          key={actionIndex}
                          onClick={(e) => {
                            e.stopPropagation()
                            action.onClick(item)
                          }}
                          className={action.variant === "destructive" ? "text-red-600" : ""}
                        >
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
