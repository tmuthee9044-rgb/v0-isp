"use client"

import type * as React from "react"
import {
  AudioWaveform,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
  Users,
  CreditCard,
  HeadphonesIcon,
  BarChart3,
  MessageSquare,
  Router,
  Network,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar"

// This is sample data.
const data = {
  user: {
    name: "ISP Admin",
    email: "admin@techconnect.co.ke",
    avatar: "/placeholder.svg?height=150&width=150",
  },
  teams: [
    {
      name: "TechConnect ISP",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Customer Support",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Business Operations",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Platform",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "Dashboard",
          url: "/",
        },
        {
          title: "Overview",
          url: "/overview",
        },
      ],
    },
    {
      title: "Customer Management",
      url: "#",
      icon: Users,
      items: [
        {
          title: "All Customers",
          url: "/customers",
        },
        {
          title: "Add Customer",
          url: "/customers/add",
        },
      ],
    },
    {
      title: "Billing & Finance",
      url: "#",
      icon: CreditCard,
      items: [
        {
          title: "Billing Overview",
          url: "/billing",
        },
        {
          title: "Payments",
          url: "/billing/payments",
        },
        {
          title: "Overdue Accounts",
          url: "/billing/overdue",
        },
        {
          title: "Finance Management",
          url: "/finance",
        },
      ],
    },
    {
      title: "Hotspot Management",
      url: "#",
      icon: Router,
      items: [
        {
          title: "All Hotspots",
          url: "/hotspots",
        },
        {
          title: "Add Hotspot",
          url: "/hotspots/add",
        },
        {
          title: "User Management",
          url: "/hotspots/users",
        },
        {
          title: "Voucher System",
          url: "/hotspots/vouchers",
        },
      ],
    },
    {
      title: "Network Management",
      url: "#",
      icon: Network,
      items: [
        {
          title: "Routers",
          url: "/network/routers",
        },
        {
          title: "IP Subnets",
          url: "/network/subnets",
        },
        {
          title: "Sync Status",
          url: "/network/sync",
        },
        {
          title: "Network Reports",
          url: "/network/reports",
        },
      ],
    },
    {
      title: "Support & Services",
      url: "#",
      icon: HeadphonesIcon,
      items: [
        {
          title: "Support Tickets",
          url: "/support",
        },
        {
          title: "Knowledge Base",
          url: "/support/kb",
        },
        {
          title: "Service Plans",
          url: "/services",
        },
        {
          title: "Add Service",
          url: "/services/add",
        },
      ],
    },
    {
      title: "General Operations",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "Human Resources",
          url: "/hr",
        },
        {
          title: "Vehicle Management",
          url: "/vehicles",
        },
        {
          title: "Task Management",
          url: "/tasks",
        },
        {
          title: "Inventory Dashboard",
          url: "/inventory",
        },
        {
          title: "Suppliers",
          url: "/suppliers",
        },
        {
          title: "Purchase Orders",
          url: "/purchase-orders",
        },
        {
          title: "Warehouses",
          url: "/warehouses",
        },
        {
          title: "Stock Operations",
          url: "/inventory/operations",
        },
        {
          title: "Inventory Reports",
          url: "/inventory/reports",
        },
      ],
    },
    {
      title: "Reports & Analytics",
      url: "#",
      icon: BarChart3,
      items: [
        {
          title: "Reports Overview",
          url: "/reports",
        },
        {
          title: "Customer Reports",
          url: "/reports/customers",
        },
        {
          title: "Revenue Reports",
          url: "/reports/revenue",
        },
        {
          title: "Usage Analytics",
          url: "/reports/usage",
        },
      ],
    },
    {
      title: "Communication",
      url: "#",
      icon: MessageSquare,
      items: [
        {
          title: "Messages",
          url: "/messages",
        },
        {
          title: "Message History",
          url: "/messages/history",
        },
        {
          title: "Automation",
          url: "/automation",
        },
      ],
    },
    {
      title: "System",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "Settings",
          url: "/settings",
        },
        {
          title: "System Logs",
          url: "/logs",
        },
        {
          title: "Customer Portal",
          url: "/portal",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Security Center",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Business Analytics",
      url: "#",
      icon: Frame,
    },
    {
      name: "Customer Portal",
      url: "#",
      icon: Map,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
