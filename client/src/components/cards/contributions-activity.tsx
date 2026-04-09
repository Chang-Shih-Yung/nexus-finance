"use client"

import { useI18n } from "@/lib/i18n/context"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"

export function ContributionsActivity() {
  const { t } = useI18n()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.contributionsActivity.title')}</CardTitle>
        <CardDescription>{t('cards.contributionsActivity.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form id="contributions-activity">
          <FieldGroup>
            <FieldSet>
              <FieldLegend className="sr-only">{t('cards.contributionsActivity.title')}</FieldLegend>
              <FieldGroup>
                <Field orientation="horizontal">
                  <Checkbox id="activity-private-profile" />
                  <FieldContent>
                    <FieldLabel htmlFor="activity-private-profile">
                      {t('cards.contributionsActivity.hideActivityLog')}
                    </FieldLabel>
                    <FieldDescription>
                      {t('cards.contributionsActivity.hideActivityLogDescription')}
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </FieldGroup>
            </FieldSet>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <Button form="contributions-activity">{t('cards.contributionsActivity.saveSettings')}</Button>
      </CardFooter>
    </Card>
  )
}
