"use client"

import { X } from "@/lib/icons"

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export function ReceivingMethod() {
  return (
    <Card>
      <CardHeader>
        <CardDescription>Payout Preferences</CardDescription>
        <CardTitle>Receiving Method</CardTitle>
        <CardAction>
          <Button variant="ghost" size="icon-sm" className="bg-muted">
            <X className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="account-holder">Account Holder Name</FieldLabel>
            <Input id="account-holder" defaultValue="Synthetic Horizons Music LLC" />
          </Field>
          <div>
            <FieldLabel className="mb-2">Receiving Method</FieldLabel>
            <RadioGroup defaultValue="bank" className="grid grid-cols-1 items-start gap-3 md:grid-cols-2">
              <label htmlFor="method-bank">
                <Field orientation="horizontal" className="pb-2.5">
                  <RadioGroupItem value="bank" id="method-bank" />
                  <FieldContent>
                    <FieldDescription className="font-medium text-foreground">Bank Transfer</FieldDescription>
                    <FieldDescription>SWIFT / IBAN</FieldDescription>
                  </FieldContent>
                </Field>
              </label>
              <label htmlFor="method-paypal">
                <Field orientation="horizontal" className="pb-2.5">
                  <RadioGroupItem value="paypal" id="method-paypal" />
                  <FieldContent>
                    <FieldDescription className="font-medium text-foreground">PayPal</FieldDescription>
                    <FieldDescription className="line-clamp-1">Instant Payout</FieldDescription>
                  </FieldContent>
                </Field>
              </label>
            </RadioGroup>
          </div>
          <Field>
            <FieldLabel htmlFor="iban">IBAN / Account Number</FieldLabel>
            <Input id="iban" placeholder="DE89 3704 0044 ...." />
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter>
        <Button className="w-full" disabled>Save Payout Settings</Button>
      </CardFooter>
    </Card>
  )
}
