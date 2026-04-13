'use client'

import { DollarSign, ArrowLeftRight, User, AlertTriangle, Activity, Bot } from '@/lib/icons'
import { Card, CardContent } from '@/components/ui/card'
import { useI18n } from '@/lib/i18n/context'

import RevenueSection from '@/components/sections/RevenueSection'
import TransactionSection from '@/components/sections/TransactionSection'
import CustomerSection from '@/components/sections/CustomerSection'
import RiskSection from '@/components/sections/RiskSection'
import SystemSection from '@/components/sections/SystemSection'
import AiQuerySection from '@/components/sections/AiQuerySection'

interface SectionWrapperProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  children: React.ReactNode
}

function SectionWrapper({ icon: Icon, title, description, children }: SectionWrapperProps) {
  return (
    <section className="col-span-1 lg:col-span-3 space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-3 pt-2">
        <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
          <Icon className="size-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex-1 h-px bg-border ml-2" />
      </div>

      {/* Section cards in the bento grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {children}
      </div>
    </section>
  )
}

export default function Preview03() {
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-6 -mx-4 md:-mx-8 -mt-6 -mb-6 px-4 md:px-8 pt-6 pb-6 bg-muted min-h-full">
      {/* ─── Revenue & P&L ─── */}
      <SectionWrapper
        icon={DollarSign}
        title={t('dashboard.sections.revenue')}
        description={t('dashboard.sections.revenueDesc')}
      >
        <RevenueSection />
      </SectionWrapper>

      {/* ─── Transaction Analytics ─── */}
      <SectionWrapper
        icon={ArrowLeftRight}
        title={t('dashboard.sections.transactions')}
        description={t('dashboard.sections.transactionsDesc')}
      >
        <TransactionSection />
      </SectionWrapper>

      {/* ─── Customer Insights ─── */}
      <SectionWrapper
        icon={User}
        title={t('dashboard.sections.customers')}
        description={t('dashboard.sections.customersDesc')}
      >
        <CustomerSection />
      </SectionWrapper>

      {/* ─── Risk & Compliance ─── */}
      <SectionWrapper
        icon={AlertTriangle}
        title={t('dashboard.sections.risk')}
        description={t('dashboard.sections.riskDesc')}
      >
        <RiskSection />
      </SectionWrapper>

      {/* ─── System Health ─── */}
      <SectionWrapper
        icon={Activity}
        title={t('dashboard.sections.system')}
        description={t('dashboard.sections.systemDesc')}
      >
        <SystemSection />
      </SectionWrapper>

      {/* ─── AI Query — full width ─── */}
      <section className="space-y-3">
        <div className="flex items-center gap-3 pt-2">
          <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
            <Bot className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">{t('dashboard.sections.ai')}</h2>
            <p className="text-xs text-muted-foreground">{t('dashboard.sections.aiDesc')}</p>
          </div>
          <div className="flex-1 h-px bg-border ml-2" />
        </div>
        <Card className="shadow-sm overflow-hidden">
          <CardContent className="p-0 [&>section]:border-t-0 [&>section]:px-6 [&>section]:pt-5 [&>section]:pb-6">
            <AiQuerySection />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
