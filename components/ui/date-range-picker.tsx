"use client"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerWithRangeProps {
  className?: string
  date?: DateRange
  setDate?: (date: DateRange) => void
}

export function DatePickerWithRange({ className, date, setDate }: DatePickerWithRangeProps) {
  const presets = [
    {
      label: "Today",
      range: { from: new Date(), to: new Date() },
    },
    {
      label: "Yesterday",
      range: { from: new Date(Date.now() - 24 * 60 * 60 * 1000), to: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    {
      label: "Last 7 days",
      range: { from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), to: new Date() },
    },
    {
      label: "Last 30 days",
      range: { from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), to: new Date() },
    },
    {
      label: "This month",
      range: { from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), to: new Date() },
    },
    {
      label: "Last month",
      range: {
        from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
        to: new Date(new Date().getFullYear(), new Date().getMonth(), 0),
      },
    },
    {
      label: "This year",
      range: { from: new Date(new Date().getFullYear(), 0, 1), to: new Date() },
    },
  ]

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn("w-[300px] justify-start text-left font-normal", !date && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {date.from.toLocaleDateString()} - {date.to.toLocaleDateString()}
                </>
              ) : (
                date.from.toLocaleDateString()
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <div className="flex flex-col gap-1 p-3 border-r">
              <div className="text-sm font-medium mb-2">Quick Select</div>
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="justify-start text-left h-8"
                  onClick={() => setDate?.(preset.range)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={(range) => setDate?.(range as DateRange)}
              numberOfMonths={2}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
