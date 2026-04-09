"use client"

import { CheckCircle2Icon } from "@/lib/icons"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { useI18n } from "@/lib/i18n/context"

export function ActivateAgentDialog() {
  const { t } = useI18n()

  const agentFeatures = [
    {
      id: "anomaly-detection",
      content: (
        <>
          <strong>{t('cards.activateAgentDialog.features.anomalyDetection')}</strong>
          {`：${t('cards.activateAgentDialog.features.anomalyDetectionDesc')}`}
        </>
      ),
    },
    {
      id: "trend-analysis",
      content: (
        <>
          <strong>{t('cards.activateAgentDialog.features.trendAnalysis')}</strong>
          {`：${t('cards.activateAgentDialog.features.trendAnalysisDesc')}`}
        </>
      ),
    },
    {
      id: "risk-assessment",
      content: (
        <>
          <strong>{t('cards.activateAgentDialog.features.riskAssessment')}</strong>
          {`：${t('cards.activateAgentDialog.features.riskAssessmentDesc')}`}{" "}
          <Badge variant="secondary">{t('cards.activateAgentDialog.features.advancedModule')}</Badge>
        </>
      ),
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.activateAgentDialog.title')}</CardTitle>
        <CardDescription>
          {t('cards.activateAgentDialog.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ItemGroup className="gap-0">
          {agentFeatures.map((feature) => (
            <Item key={feature.id} size="xs" className="px-0">
              <ItemMedia variant="icon" className="self-start">
                <CheckCircle2Icon className="size-5 fill-primary text-primary-foreground" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="inline leading-relaxed font-normal text-muted-foreground *:[strong]:font-medium *:[strong]:text-foreground">
                  {feature.content}
                </ItemTitle>
              </ItemContent>
            </Item>
          ))}
        </ItemGroup>
        <Alert>
          <AlertDescription>
            {t('cards.activateAgentDialog.trialNotice')}
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline">{t('cards.activateAgentDialog.later')}</Button>
        <Button>{t('cards.activateAgentDialog.activate')}</Button>
      </CardFooter>
    </Card>
  )
}
