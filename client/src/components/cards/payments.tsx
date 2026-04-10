"use client"

import {
  Gauge,
  Calendar,
  Repeat,
  RefreshCw,
  ChevronRight,
  MoreHorizontal,
} from "@/lib/icons"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { useI18n } from "@/lib/i18n/context"

export function Payments() {
  const { t } = useI18n()

  const items = [
    { icon: Gauge, titleKey: "adjustTransferLimits" as const, descKey: "adjustTransferLimitsDescription" as const },
    { icon: Calendar, titleKey: "scheduledTransfer" as const, descKey: "scheduledTransferDescription" as const },
    { icon: Repeat, titleKey: "autoDebitManagement" as const, descKey: "autoDebitManagementDescription" as const },
    { icon: RefreshCw, titleKey: "recurringPayments" as const, descKey: "recurringPaymentsDescription" as const },
  ]

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#">{t('cards.payments.home')}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon-sm" variant="ghost">
                    <MoreHorizontal />
                    <span className="sr-only">{t('cards.payments.accountOptions')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuGroup>
                    <DropdownMenuItem>{t('cards.payments.personalInfo')}</DropdownMenuItem>
                    <DropdownMenuItem>{t('cards.payments.statements')}</DropdownMenuItem>
                    <DropdownMenuItem>{t('cards.payments.documentManagement')}</DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{t('cards.payments.paymentOperations')}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </CardHeader>
      <CardContent>
        <ItemGroup>
          {items.map((item) => (
            <Item key={item.titleKey} variant="muted" asChild>
              <a href="#">
                <ItemMedia variant="icon">
                  <item.icon />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{t(`cards.payments.${item.titleKey}`)}</ItemTitle>
                  <ItemDescription>{t(`cards.payments.${item.descKey}`)}</ItemDescription>
                </ItemContent>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </a>
            </Item>
          ))}
        </ItemGroup>
      </CardContent>
    </Card>
  )
}
