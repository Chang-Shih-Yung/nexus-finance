"use client"

import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  Target,
  Wallet,
  FileBarChart,
  FileText,
  User,
  CreditCard,
  Bell,
  Shield,
  CircleHelp,
  MessageSquare,
  Activity,
} from "@/lib/icons"

import { Card } from "@/components/ui/card"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { useI18n } from "@/lib/i18n/context"

export function SidebarNav() {
  const { t } = useI18n()
  return (
    <div className="grid grid-cols-2 items-start gap-6">
      <Card className="overflow-hidden py-0">
        <SidebarProvider className="min-h-0">
          <Sidebar collapsible="none" className="w-full bg-transparent">
            <SidebarContent className="gap-0">
              <SidebarGroup className="pb-1">
                <SidebarGroupLabel>{t('cards.sidebarNav.overview')}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton isActive>
                        <LayoutDashboard />
                        {t('cards.sidebarNav.dashboard')}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton>
                        <ArrowLeftRight />
                        {t('cards.sidebarNav.transactionDetails')}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton>
                        <TrendingUp />
                        {t('cards.sidebarNav.investmentManagement')}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              <SidebarSeparator />
              <SidebarGroup className="pt-1">
                <SidebarGroupLabel>{t('cards.sidebarNav.operationsPlanning')}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton>
                        <Target />
                        {t('cards.sidebarNav.performanceTargets')}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton>
                        <Wallet />
                        {t('cards.sidebarNav.budgetManagement')}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton>
                        <FileBarChart />
                        {t('cards.sidebarNav.analyticsReports')}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton>
                        <FileText />
                        {t('cards.sidebarNav.regulatoryDocuments')}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
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
                <SidebarGroupLabel>{t('cards.sidebarNav.accountManagement')}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton>
                        <User />
                        {t('cards.sidebarNav.personalInfo')}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton isActive>
                        <CreditCard />
                        {t('cards.sidebarNav.authorizationManagement')}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton>
                        <Bell />
                        {t('cards.sidebarNav.notificationSettings')}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton>
                        <Shield />
                        {t('cards.sidebarNav.securitySettings')}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              <SidebarSeparator />
              <SidebarGroup className="pt-1">
                <SidebarGroupLabel>{t('cards.sidebarNav.support')}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton>
                        <CircleHelp />
                        {t('cards.sidebarNav.userGuide')}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton>
                        <MessageSquare />
                        {t('cards.sidebarNav.contactUs')}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton>
                        <Activity />
                        {t('cards.sidebarNav.systemStatus')}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
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
