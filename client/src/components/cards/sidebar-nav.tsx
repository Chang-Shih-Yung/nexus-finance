"use client"

import { LayoutDashboard, ArrowLeftRight, TrendingUp, Target, Wallet, FileBarChart, FileText, User, CreditCard, Bell, Shield, CircleHelp, MessageSquare, Activity } from "@/lib/icons"

import { Card } from "@/components/ui/card"
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarSeparator,
} from "@/components/ui/sidebar"

export function SidebarNav() {
  return (
    <div className="grid grid-cols-2 items-start gap-6">
      <Card className="overflow-hidden py-0">
        <SidebarProvider className="min-h-0">
          <Sidebar collapsible="none" className="w-full bg-transparent">
            <SidebarContent className="gap-0">
              <SidebarGroup className="pb-1">
                <SidebarGroupLabel>Overview</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem><SidebarMenuButton isActive><LayoutDashboard />Dashboard</SidebarMenuButton></SidebarMenuItem>
                    <SidebarMenuItem><SidebarMenuButton><ArrowLeftRight />Transactions</SidebarMenuButton></SidebarMenuItem>
                    <SidebarMenuItem><SidebarMenuButton><TrendingUp />Investments</SidebarMenuButton></SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              <SidebarSeparator />
              <SidebarGroup className="pt-1">
                <SidebarGroupLabel>Planning</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem><SidebarMenuButton><Target />Goals</SidebarMenuButton></SidebarMenuItem>
                    <SidebarMenuItem><SidebarMenuButton><Wallet />Budget</SidebarMenuButton></SidebarMenuItem>
                    <SidebarMenuItem><SidebarMenuButton><FileBarChart />Reports</SidebarMenuButton></SidebarMenuItem>
                    <SidebarMenuItem><SidebarMenuButton><FileText />Documents</SidebarMenuButton></SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      </Card>
      <Card className="overflow-hidden py-0">
        <SidebarProvider className="min-h-0">
          <Sidebar collapsible="none" className="w-full bg-transparent">
            <SidebarContent className="gap-0">
              <SidebarGroup className="pb-1">
                <SidebarGroupLabel>Account</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem><SidebarMenuButton><User />Profile</SidebarMenuButton></SidebarMenuItem>
                    <SidebarMenuItem><SidebarMenuButton isActive><CreditCard />Billing</SidebarMenuButton></SidebarMenuItem>
                    <SidebarMenuItem><SidebarMenuButton><Bell />Notifications</SidebarMenuButton></SidebarMenuItem>
                    <SidebarMenuItem><SidebarMenuButton><Shield />Security</SidebarMenuButton></SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              <SidebarSeparator />
              <SidebarGroup className="pt-1">
                <SidebarGroupLabel>Support</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem><SidebarMenuButton><CircleHelp />Help Center</SidebarMenuButton></SidebarMenuItem>
                    <SidebarMenuItem><SidebarMenuButton><MessageSquare />Contact Us</SidebarMenuButton></SidebarMenuItem>
                    <SidebarMenuItem><SidebarMenuButton><Activity />Status</SidebarMenuButton></SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      </Card>
    </div>
  )
}
