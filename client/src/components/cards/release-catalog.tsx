"use client"

import { Search } from "@/lib/icons"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Skeleton } from "@/components/ui/skeleton"
import { useRpc } from "@/hooks/useRpc"
import { useI18n } from '@/lib/i18n/context'

function formatAmount(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "TWD", maximumFractionDigits: 0 }).format(n)
}

const TIER_LABELS: Record<string, string> = {
  general: "General",
  vip: "VIP",
  premium: "Premium",
}

export function ReleaseCatalog() {
  const { t } = useI18n()
  const { data, isLoading } = useRpc<
    { dimension_value: string; metric_value: number }[]
  >(["top-errors"], "nf_top_n", {
    p_metric_key: "error_count",
    p_dimension: "error_code",
    p_n: 6,
  })

  const items = (data ?? []).map((d, i) => ({
    rank: String(i + 1).padStart(2, "0"),
    name: d.dimension_value || "Unknown",
    amount: d.metric_value.toLocaleString(),
    rawAmount: d.metric_value,
  }))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <InputGroup className="max-w-sm">
            <InputGroupAddon><Search /></InputGroupAddon>
            <InputGroupInput placeholder={t('cards.releaseCatalog.searchErrorCodes')} />
          </InputGroup>
          <ToggleGroup type="multiple" defaultValue={["critical"]} variant="outline">
            <ToggleGroupItem value="critical">{t('cards.releaseCatalog.critical')}</ToggleGroupItem>
            <ToggleGroupItem value="warning">{t('cards.releaseCatalog.warning')}</ToggleGroupItem>
            <ToggleGroupItem value="info">{t('cards.releaseCatalog.info')}</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-12 rounded-lg" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        ) : (
          <ItemGroup>
            {items.map((item) => (
              <Item key={item.name} variant="muted">
                <ItemMedia>
                  <div className="flex size-12 items-center justify-center rounded-lg border text-sm font-semibold">
                    #{item.rank}
                  </div>
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{item.name}</ItemTitle>
                  <ItemDescription className="text-xs tracking-wider uppercase">
                    #{item.rank} {t('cards.releaseCatalog.byFrequency')}
                  </ItemDescription>
                </ItemContent>
                <div className="flex shrink-0 items-center gap-6">
                  <Badge variant="destructive">{t('cards.releaseCatalog.error')}</Badge>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-xs tracking-wider text-muted-foreground uppercase">{t('cards.releaseCatalog.count')}</span>
                    <span className="font-medium tabular-nums">{item.amount}</span>
                  </div>
                </div>
              </Item>
            ))}
          </ItemGroup>
        )}
      </CardContent>
    </Card>
  )
}
