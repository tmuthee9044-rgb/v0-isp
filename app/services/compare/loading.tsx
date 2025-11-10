import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function ServiceComparisonLoading() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="space-y-2">
          <Skeleton className="h-8 w-80" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-4" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Content */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Table Header */}
            <div className="flex gap-4">
              <Skeleton className="h-10 w-48" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-32" />
              ))}
            </div>
            {/* Table Rows */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-8 w-48" />
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-8 w-32" />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 border rounded-lg space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-full" />
                <div className="space-y-1">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
