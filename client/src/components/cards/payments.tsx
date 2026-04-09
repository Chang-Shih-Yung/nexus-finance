"use client"

import { Gauge, Calendar, Repeat, RefreshCw, ChevronRight, MoreHorizontal } from "@/lib/icons"

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item"

const items = [
  { icon: Gauge, title: "Change transfer limit", desc: "Adjust how much you can send from your balance." },
  { icon: Calendar, title: "Scheduled transfers", desc: "Set up a transfer to send at a later date." },
  { icon: Repeat, title: "Direct Debits", desc: "Set up and manage regular payments." },
  { icon: RefreshCw, title: "Recurring card payments", desc: "Manage your repeated card transactions." },
]

export function Payments() {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="#">Home</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon-sm" variant="ghost">
                    <MoreHorizontal />
                    <span className="sr-only">Account options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuGroup>
                    <DropdownMenuItem>Profile</DropdownMenuItem>
                    <DropdownMenuItem>Statements</DropdownMenuItem>
                    <DropdownMenuItem>Documents</DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Payments</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </CardHeader>
      <CardContent>
        <ItemGroup>
          {items.map((item) => (
            <Item key={item.title} variant="muted" asChild>
              <a href="#">
                <ItemMedia variant="icon"><item.icon /></ItemMedia>
                <ItemContent>
                  <ItemTitle>{item.title}</ItemTitle>
                  <ItemDescription>{item.desc}</ItemDescription>
                </ItemContent>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </a>
            </Item>
          ))}
        </ItemGroup>
      </CardContent>
    </Card>
  )
}
