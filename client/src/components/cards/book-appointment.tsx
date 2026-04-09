"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { useRpc } from "@/hooks/useRpc"
import { useI18n } from '@/lib/i18n/context'

interface DormantUser {
  user_name: string
  tier: string
  last_login_at: string
  inactive_days: number
}

const TIER_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  premium: "default",
  vip: "secondary",
  general: "outline",
}

export function BookAppointment() {
  const { t } = useI18n()
  const { data, isLoading } = useRpc<DormantUser[]>(
    ["dormant-users"], "nf_ai_dormant_users", { p_days: 7, p_limit: 6 },
  )

  const users = data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.bookAppointment.title')}</CardTitle>
        <CardDescription>{t('cards.bookAppointment.description')} · {isLoading ? "..." : users.length} {t('common.accounts')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <ItemGroup className="max-h-[200px] overflow-y-auto scrollbar-thin">
            {users.map((u) => (
              <Item key={u.user_name} variant="muted">
                <ItemContent>
                  <ItemTitle>{u.user_name}</ItemTitle>
                  <ItemDescription>
                    {u.inactive_days} {t('common.daysAgo')} · {new Date(u.last_login_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </ItemDescription>
                </ItemContent>
                <Badge variant={TIER_COLORS[u.tier] ?? "outline"} className="capitalize">{u.tier}</Badge>
              </Item>
            ))}
          </ItemGroup>
        )}
        {!isLoading && users.some(u => u.tier === "vip" || u.tier === "premium") && (
          <Alert>
            <AlertTitle>{t('cards.bookAppointment.highValueAtRisk')}</AlertTitle>
            <AlertDescription>
              {users.filter(u => u.tier === "vip" || u.tier === "premium").length} {t('cards.bookAppointment.vipPremiumWarning')}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button className="w-full">{t('cards.bookAppointment.sendCampaign')}</Button>
      </CardFooter>
    </Card>
  )
}
