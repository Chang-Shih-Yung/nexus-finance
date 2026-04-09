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
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"

export function GithubProfile() {
  const { t } = useI18n()

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{t('cards.githubProfile.title')}</CardTitle>
        <CardDescription>{t('cards.githubProfile.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form id="profile">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">{t('cards.githubProfile.name')}</FieldLabel>
              <Input id="name" placeholder={t('cards.githubProfile.namePlaceholder')} />
              <FieldDescription>
                {t('cards.githubProfile.nameDescription')}
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="email">{t('cards.githubProfile.jobTitle')}</FieldLabel>
              <NativeSelect id="email">
                <NativeSelectOption value="evp">{t('cards.githubProfile.evp')}</NativeSelectOption>
                <NativeSelectOption value="svp">{t('cards.githubProfile.svp')}</NativeSelectOption>
                <NativeSelectOption value="mgr">{t('cards.githubProfile.manager')}</NativeSelectOption>
                <NativeSelectOption value="officer">{t('cards.githubProfile.officer')}</NativeSelectOption>
              </NativeSelect>
              <FieldDescription>
                {t('cards.githubProfile.jobTitleDescription')}
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="bio">{t('cards.githubProfile.department')}</FieldLabel>
              <Textarea
                id="bio"
                placeholder={t('cards.githubProfile.departmentPlaceholder')}
              />
              <FieldDescription>
                {t('cards.githubProfile.departmentDescription')}
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <Button form="profile">{t('cards.githubProfile.updateProfile')}</Button>
      </CardFooter>
    </Card>
  )
}
