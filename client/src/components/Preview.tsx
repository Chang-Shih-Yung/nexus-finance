import { ActivateAgentDialog } from "@/components/cards/activate-agent-dialog"
import { AnalyticsCard } from "@/components/cards/analytics-card"
import { AnomalyAlert } from "@/components/cards/anomaly-alert"
import { BarChartCard } from "@/components/cards/bar-chart-card"
import { BookAppointment } from "@/components/cards/book-appointment"
import { CodespacesCard } from "@/components/cards/codespaces-card"
import { ContributionsActivity } from "@/components/cards/contributions-activity"
import { Contributors } from "@/components/cards/contributors"
import { EnvironmentVariables } from "@/components/cards/environment-variables"
import { FeedbackForm } from "@/components/cards/feedback-form"
import { FileUpload } from "@/components/cards/file-upload"
import { GithubProfile } from "@/components/cards/github-profile"
import { IconPreviewGrid } from "@/components/cards/icon-preview-grid"
import { InviteTeam } from "@/components/cards/invite-team"
import { Invoice } from "@/components/cards/invoice"
import { LiveWaveformCard } from "@/components/cards/live-waveform"
import { NoTeamMembers } from "@/components/cards/no-team-members"
import { NotFound } from "@/components/cards/not-found"
import { ObservabilityCard } from "@/components/cards/observability-card"
import { PieChartCard } from "@/components/cards/pie-chart-card"
import { ReportBug } from "@/components/cards/report-bug"
import { ShippingAddress } from "@/components/cards/shipping-address"
import { Shortcuts } from "@/components/cards/shortcuts"
import { SkeletonLoading } from "@/components/cards/skeleton-loading"
import { SleepReport } from "@/components/cards/sleep-report"
import { StyleOverview } from "@/components/cards/style-overview"
import { TypographySpecimen } from "@/components/cards/typography-specimen"
import { UIElements } from "@/components/cards/ui-elements"
import { UsageCard } from "@/components/cards/usage-card"
import { Visitors } from "@/components/cards/visitors"
import { WeeklyFitnessSummary } from "@/components/cards/weekly-fitness-summary"

export default function Preview() {
  return (
    <div className="overflow-x-auto overflow-y-hidden bg-muted contain-[paint] [--gap:--spacing(4)] md:[--gap:--spacing(10)] dark:bg-background">
      <div className="flex w-full min-w-max justify-center">
        <div
          className="grid w-[2400px] grid-cols-7 items-start gap-(--gap) bg-muted p-(--gap) md:w-[3000px] dark:bg-background *:[div]:gap-(--gap)"
          data-slot="capture-target"
        >
          <div className="flex flex-col p-px [contain-intrinsic-size:380px_1200px] [content-visibility:auto]">
            <StyleOverview />
            <TypographySpecimen />
            <div className="md:hidden">
              <UIElements />
            </div>
            <CodespacesCard />
            <Invoice />
          </div>
          <div className="flex flex-col p-px [contain-intrinsic-size:380px_1200px] [content-visibility:auto]">
            <IconPreviewGrid />
            <div className="hidden w-full md:flex">
              <UIElements />
            </div>
            <ObservabilityCard />
            <ShippingAddress />
          </div>
          <div className="flex flex-col p-px [contain-intrinsic-size:380px_1200px] [content-visibility:auto]">
            <EnvironmentVariables />
            <BarChartCard />
            <InviteTeam />
            <ActivateAgentDialog />
          </div>
          <div className="flex flex-col p-px [contain-intrinsic-size:380px_1200px] [content-visibility:auto]">
            <SkeletonLoading />
            <PieChartCard />
            <NoTeamMembers />
            <ReportBug />
            <Contributors />
          </div>
          <div className="flex flex-col p-px [contain-intrinsic-size:380px_1200px] [content-visibility:auto]">
            <FeedbackForm />
            <BookAppointment />
            <SleepReport />
            <GithubProfile />
          </div>
          <div className="flex flex-col p-px [contain-intrinsic-size:380px_1200px] [content-visibility:auto]">
            <WeeklyFitnessSummary />
            <FileUpload />
            <AnalyticsCard />
            <UsageCard />
            <Shortcuts />
          </div>
          <div className="flex flex-col p-px [contain-intrinsic-size:380px_1200px] [content-visibility:auto]">
            <AnomalyAlert />
            <LiveWaveformCard />
            <Visitors />
            <ContributionsActivity />
            <NotFound />
          </div>
        </div>
      </div>
    </div>
  )
}
