"use client"

import * as React from "react"

import { Card, CardContent } from "@/components/ui/card"
import {
  Item,
  ItemActions,
  ItemGroup,
  ItemHeader,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item"
import { Kbd } from "@/components/ui/kbd"
import { useI18n } from "@/lib/i18n/context"

const shortcutKeys = [
  { labelKey: "quickSearch", keys: ["⌘", "K"] },
  { labelKey: "switchBranch", keys: ["⌘", "J"] },
  { labelKey: "newReport", keys: ["⌘", "N"] },
  { labelKey: "exportReport", keys: ["⌘", "S"] },
  { labelKey: "toggleSidebar", keys: ["⌘", "B"] },
] as const

export function Shortcuts() {
  const { t } = useI18n()
  return (
    <Card>
      <CardContent>
        <div className="flex flex-col gap-3">
          <div className="text-sm font-medium">{t('cards.shortcuts.title')}</div>
          <ItemGroup className="gap-2 text-muted-foreground" data-size="xs">
            {shortcutKeys.map(({ labelKey, keys }, i) => (
              <React.Fragment key={labelKey}>
                {i > 0 && <ItemSeparator />}
                <Item
                  variant="default"
                  size="xs"
                  className="border-0 px-0 py-0"
                >
                  <ItemHeader>
                    <ItemTitle className="font-normal">{t(`cards.shortcuts.${labelKey}`)}</ItemTitle>
                    <ItemActions>
                      <div className="flex gap-1">
                        {keys.map((key) => (
                          <Kbd key={key}>{key}</Kbd>
                        ))}
                      </div>
                    </ItemActions>
                  </ItemHeader>
                </Item>
              </React.Fragment>
            ))}
          </ItemGroup>
        </div>
      </CardContent>
    </Card>
  )
}
