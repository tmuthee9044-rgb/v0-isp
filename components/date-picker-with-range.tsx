"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import {
  format,
  subDays,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
} from "date-fns"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerWithRangeProps {
  date: { from: Date; to: Date }
  setDate: (date: { from: Date; to: Date }) => void
  className?: string
}

const presets = [
  {
    label: "Today",
    getValue: () => ({ from: new Date(), to: new Date() }),
  },
  {
    label: "Last 7 Days",
    getValue: () => ({ from: subDays(new Date(), 6), to: new Date() }),
  },
  {
    label: "Last 30 Days",
    getValue: () => ({ from: subDays(new Date(), 29), to: new Date() }),
  },
  {
    label: "Last 90 Days",
    getValue: () => ({ from: subDays(new Date(), 89), to: new Date() }),
  },
  {
    label: "This Month",
    getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
  },
  {
    label: "Last Month",
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1)
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
    },
  },
  {
    label: "This Quarter",
    getValue: () => ({ from: startOfQuarter(new Date()), to: endOfQuarter(new Date()) }),
  },
  {
    label: "This Year",
    getValue: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }),
  },
]

export default function DatePickerWithRange({ date, setDate, className }: DatePickerWithRangeProps) {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: date.from,
    to: date.to,
  })
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      setDate({ from: dateRange.from, to: dateRange.to })
    }
  }, [dateRange, setDate])

  const handlePresetClick = (preset: { from: Date; to: Date }) => {
    setDateRange({ from: preset.from, to: preset.to })
    setDate(preset)
    setIsOpen(false)
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn("justify-start text-left font-normal h-9 px-3", !dateRange && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}
                  </>
                ) : (
                  format(dateRange.from, "MMM dd, yyyy")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="flex">
            {/* Preset buttons sidebar */}
            <div className="flex flex-col gap-1 border-r p-3 bg-muted/30">
              <div className="text-xs font-semibold text-muted-foreground mb-1 px-2">Quick Select</div>
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="justify-start font-normal h-8 px-2 text-xs"
                  onClick={() => handlePresetClick(preset.getValue())}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            {/* Calendar */}
            <div className="p-3">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
              <div className="flex justify-end gap-2 pt-3 border-t mt-3">
                <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (dateRange?.from && dateRange?.to) {
                      setDate({ from: dateRange.from, to: dateRange.to })
                    }
                    setIsOpen(false)
                  }}
                  disabled={!dateRange?.from || !dateRange?.to}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
