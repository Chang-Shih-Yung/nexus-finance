'use client'

import RevenueSection from '@/components/sections/RevenueSection'
import TransactionSection from '@/components/sections/TransactionSection'
import CustomerSection from '@/components/sections/CustomerSection'
import RiskSection from '@/components/sections/RiskSection'
import SystemSection from '@/components/sections/SystemSection'
import AiQuerySection from '@/components/sections/AiQuerySection'
import { Card, CardContent } from '@/components/ui/card'

export default function DashboardBento() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 items-start gap-4 -mx-4 md:-mx-8 -mt-6 -mb-6 px-4 md:px-8 pt-6 pb-6 bg-muted min-h-full">
      <RevenueSection />
      <TransactionSection />
      <CustomerSection />
      <RiskSection />
      <SystemSection />

      {/* AI Query — full width */}
      <Card className="shadow-sm overflow-hidden col-span-1 lg:col-span-3">
        <CardContent className="p-0 [&>section]:border-t-0 [&>section]:px-6 [&>section]:pt-5 [&>section]:pb-6">
          <AiQuerySection />
        </CardContent>
      </Card>
    </div>
  )
}
