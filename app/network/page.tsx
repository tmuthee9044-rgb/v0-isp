import { Suspense } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NetworkOverview } from "@/components/network/network-overview"
import { RouterManagement } from "@/components/network/router-management"
import { SubnetManagement } from "@/components/network/subnet-management"
import { SyncStatus } from "@/components/network/sync-status"
import { Skeleton } from "@/components/ui/skeleton"

export default function NetworkPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Network Management</h2>
      </div>

      <Suspense fallback={<NetworkOverviewSkeleton />}>
        <NetworkOverview />
      </Suspense>

      <Tabs defaultValue="routers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="routers">Routers</TabsTrigger>
          <TabsTrigger value="subnets">IP Subnets</TabsTrigger>
          <TabsTrigger value="sync">Sync Status</TabsTrigger>
        </TabsList>

        <TabsContent value="routers" className="space-y-4">
          <Suspense fallback={<ManagementSkeleton />}>
            <RouterManagement />
          </Suspense>
        </TabsContent>

        <TabsContent value="subnets" className="space-y-4">
          <Suspense fallback={<ManagementSkeleton />}>
            <SubnetManagement />
          </Suspense>
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          <Suspense fallback={<ManagementSkeleton />}>
            <SyncStatus />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function NetworkOverviewSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-[60px] mb-2" />
            <Skeleton className="h-3 w-[120px]" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ManagementSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-[200px]" />
        <Skeleton className="h-4 w-[300px]" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
