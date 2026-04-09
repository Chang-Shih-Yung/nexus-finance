"use client"

import { LockKeyhole, AlertCircle, ArrowRight } from "@/lib/icons"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item"

export function AccountAccess() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Access</CardTitle>
        <CardDescription>Update your credentials or re-authenticate.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email-address">Email Address</FieldLabel>
            <Input id="email-address" type="email" defaultValue="artist@studio.inc" />
          </Field>
          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="current-password">Current Password</FieldLabel>
              <a href="#" className="text-xs font-medium tracking-wider text-muted-foreground uppercase hover:text-foreground">Forgot?</a>
            </div>
            <Input id="current-password" type="password" defaultValue="password123" />
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter className="flex-col gap-4">
        <Button className="w-full">
          <LockKeyhole className="size-4" />
          Update Security
        </Button>
        <Item variant="muted" asChild>
          <a href="#">
            <ItemMedia variant="icon">
              <AlertCircle className="text-destructive" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Danger Zone</ItemTitle>
              <ItemDescription className="line-clamp-1">Archive account and remove catalog</ItemDescription>
            </ItemContent>
            <ArrowRight className="size-4" />
          </a>
        </Item>
      </CardFooter>
    </Card>
  )
}
