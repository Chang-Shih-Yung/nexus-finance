  import DashboardBento from '@/components/DashboardBento'
import OverviewSection from '@/components/sections/OverviewSection'
import FunnelSection from '@/components/sections/FunnelSection'
import ErrorsSection from '@/components/sections/ErrorsSection'
import MonitorSection from '@/components/sections/MonitorSection'
import AiQuerySection from '@/components/sections/AiQuerySection'

export default function DashboardPage() {
  return (
    <>
      {/* Desktop: bento grid layout */}
      <div className="hidden lg:block">
        <DashboardBento />
      </div>

      {/* Mobile: stacked sections */}
      <div className="lg:hidden">
        <OverviewSection />
        <FunnelSection />
        <ErrorsSection />
        <MonitorSection />
        <AiQuerySection />
      </div>
    </>
  )
}
