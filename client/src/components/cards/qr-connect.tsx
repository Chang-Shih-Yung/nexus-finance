"use client"

import QRCode from "react-qr-code"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useI18n } from "@/lib/i18n/context"

export function QrConnect() {
  const { t } = useI18n()
  return (
    <Card>
      <CardContent className="flex justify-center pt-6">
        <div className="rounded-xl border bg-white p-4">
          <QRCode
            value="https://nexus-finance.app/mobile/login"
            size={160}
            level="M"
          />
        </div>
      </CardContent>
      <CardHeader className="text-center">
        <CardTitle>{t('cards.qrConnect.title')}</CardTitle>
        <CardDescription>
          {t('cards.qrConnect.description')}
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button variant="secondary" className="w-full">
          {t('cards.qrConnect.dismiss')}
        </Button>
      </CardFooter>
    </Card>
  )
}
