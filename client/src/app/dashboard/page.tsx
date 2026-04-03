import OverviewSection from '@/components/sections/OverviewSection'
import FunnelSection from '@/components/sections/FunnelSection'
import ErrorsSection from '@/components/sections/ErrorsSection'
import MonitorSection from '@/components/sections/MonitorSection'
import AiQuerySection from '@/components/sections/AiQuerySection'

export default function DashboardPage() {
  return (
    <div>
      <OverviewSection />
      <FunnelSection />
      <ErrorsSection />
      <MonitorSection />
      <AiQuerySection />
    </div>
  )
}
