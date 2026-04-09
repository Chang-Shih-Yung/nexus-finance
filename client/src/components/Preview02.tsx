import { AccountAccess } from "@/components/cards/account-access"
import { CardOverview } from "@/components/cards/card-overview"
import { ClaimableBalance } from "@/components/cards/claimable-balance"
import { ContributionHistory } from "@/components/cards/contribution-history"
import { CoverArt } from "@/components/cards/cover-art"
import { DividendIncome } from "@/components/cards/dividend-income"
import { EmptyConnectBank } from "@/components/cards/empty-connect-bank"
import { EmptyDistributeTrack } from "@/components/cards/empty-distribute-track"
import { EmptyExploreCatalog } from "@/components/cards/empty-explore-catalog"
import { Faq } from "@/components/cards/faq"
import { FrontDoor } from "@/components/cards/front-door"
import { IndexInvesting } from "@/components/cards/index-investing"
import { KitchenIsland } from "@/components/cards/kitchen-island"
import { LoadingCard } from "@/components/cards/loading-card"
import { NewMilestone } from "@/components/cards/new-milestone"
import { NotificationSettings } from "@/components/cards/notification-settings"
import { Payments } from "@/components/cards/payments"
import { PayoutThreshold } from "@/components/cards/payout-threshold"
import { PowerUsage } from "@/components/cards/power-usage"
import { Preferences } from "@/components/cards/preferences"
import { QrConnect } from "@/components/cards/qr-connect"
import { ReceivingMethod } from "@/components/cards/receiving-method"
import { RecentTransactions } from "@/components/cards/recent-transactions"
import { ReleaseCatalog } from "@/components/cards/release-catalog"
import { RollerShades } from "@/components/cards/roller-shades"
import { SavingsProgress } from "@/components/cards/savings-progress"
import { SavingsTargets } from "@/components/cards/savings-targets"
import { SidebarNav } from "@/components/cards/sidebar-nav"
import { SocialLinks } from "@/components/cards/social-links"
import { StockPerformance } from "@/components/cards/stock-performance"
import { SyncingState } from "@/components/cards/syncing-state"
import { TransferFunds } from "@/components/cards/transfer-funds"
import { UpcomingPayments } from "@/components/cards/upcoming-payments"

export default function Preview02() {
  return (
    <div className="overflow-x-auto overflow-y-hidden bg-muted contain-[paint] [--gap:--spacing(4)] md:[--gap:--spacing(10)] dark:bg-background">
      <div className="flex w-full min-w-max justify-center">
        <div
          className="grid w-[2400px] grid-cols-7 items-start gap-(--gap) bg-muted p-(--gap) md:w-[3000px] dark:bg-background *:[div]:gap-(--gap)"
          data-slot="capture-target"
        >
          <div className="flex flex-col gap-(--gap) p-1">
            <ContributionHistory />
            <EmptyDistributeTrack />
            <QrConnect />
            <DividendIncome />
            <IndexInvesting />
            <SyncingState />
          </div>
          <div className="flex flex-col gap-(--gap) p-1">
            <PayoutThreshold />
            <ClaimableBalance />
            <Preferences />
            <SavingsProgress />
            <KitchenIsland />
          </div>
          <div className="col-span-2 flex flex-col gap-(--gap) p-1">
            <SavingsTargets />
            <RecentTransactions />
            <div className="grid grid-cols-2 items-start gap-(--gap)">
              <div className="flex flex-col gap-(--gap)">
                <SidebarNav />
                <Faq />
              </div>
              <div className="flex flex-col gap-(--gap)">
                <Payments />
                <FrontDoor />
              </div>
            </div>
            <ReleaseCatalog />
          </div>
          <div className="flex flex-col gap-(--gap) p-1">
            <AccountAccess />
            <CardOverview />
            <TransferFunds />
            <CoverArt />
            <LoadingCard />
          </div>
          <div className="flex flex-col gap-(--gap) p-1">
            <ReceivingMethod />
            <PowerUsage />
            <EmptyConnectBank />
            <UpcomingPayments />
            <RollerShades />
          </div>
          <div className="flex flex-col gap-(--gap) p-1">
            <StockPerformance />
            <EmptyExploreCatalog />
            <NewMilestone />
            <SocialLinks />
            <NotificationSettings />
          </div>
        </div>
      </div>
    </div>
  )
}
