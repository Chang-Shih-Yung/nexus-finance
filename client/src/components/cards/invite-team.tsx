"use client"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useRpc } from "@/hooks/useRpc"
import { useI18n } from "@/lib/i18n/context"

type ComplianceStatus = {
  category: string
  total_items: number
  compliant: number
  warning: number
  violation: number
  pending: number
  avg_score: number
}

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  AML: "cards.inviteTeam.aml",
  KYC: "cards.inviteTeam.kyc",
  capital_adequacy: "cards.inviteTeam.capitalAdequacy",
  data_privacy: "cards.inviteTeam.dataPrivacy",
  liquidity: "cards.inviteTeam.liquidity",
  reporting: "cards.inviteTeam.reporting",
}

export function InviteTeam() {
  const { t } = useI18n()
  const { data, isLoading } = useRpc<ComplianceStatus[]>(
    ["compliance-status"],
    "nf_compliance_status"
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.inviteTeam.title')}</CardTitle>
        <CardDescription>{t('cards.inviteTeam.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex max-h-[300px] flex-col gap-2 overflow-y-auto scrollbar-thin">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))
          ) : (
            (data ?? []).map((c) => (
              <div
                key={c.category}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">
                    {CATEGORY_LABEL_KEYS[c.category] ? t(CATEGORY_LABEL_KEYS[c.category]) : c.category}
                  </span>
                  <div className="flex gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      {c.compliant}/{c.total_items} {t('cards.inviteTeam.compliant')}
                    </span>
                    {c.warning > 0 && (
                      <Badge variant="secondary" className="text-[0.55rem] px-1 py-0">
                        {c.warning} {t('cards.inviteTeam.warning')}
                      </Badge>
                    )}
                    {c.violation > 0 && (
                      <Badge variant="destructive" className="text-[0.55rem] px-1 py-0">
                        {c.violation} {t('cards.inviteTeam.violation')}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold tabular-nums">
                    {c.avg_score}
                  </span>
                  <span className="text-xs text-muted-foreground"> {t('cards.inviteTeam.score')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
