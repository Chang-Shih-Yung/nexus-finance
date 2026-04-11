'use client'

import { useEffect, useState } from 'react'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Settings, Lock, RefreshCw } from '@/lib/icons'
import { useI18n } from '@/lib/i18n/context'
import { listAiConfig, type AiConfigRow } from '@/lib/ai-config'

// Group keys by the two AI entry points.
type GroupId = 'ask' | 'deep' | 'other'

const GROUP_OF: Record<string, GroupId> = {}
function groupFor(key: string): GroupId {
  if (GROUP_OF[key]) return GROUP_OF[key]
  const id: GroupId = key.startsWith('ask.')
    ? 'ask'
    : key.startsWith('deep.')
      ? 'deep'
      : 'other'
  GROUP_OF[key] = id
  return id
}

// Humanize raw DB values for non-technical readers:
//   90000  (ms) → "90 秒"
//   1200   (chars) → "1,200 字元"
//   8      (rows) → "8 筆資料"
//   120    (tokens, any *_tokens* / max_tokens key) → "120 個 token"
//   "gemma-4-26b-a4b-it" (text) → shown as-is in code font
//   0.2    (numeric temperature) → shown as-is
//
// Unit picking keys off the row key suffix so we don't need a per-row
// dictionary. Numbers get locale-aware thousands separators.
function formatValue(
  row: AiConfigRow,
  t: (key: string) => string,
  locale: string,
): { display: string; mono: boolean } {
  if (row.value_type === 'text') {
    return { display: row.value, mono: true }
  }
  if (row.value_type === 'numeric') {
    return { display: row.value, mono: false }
  }
  if (row.value_type === 'int') {
    const n = Number(row.value)
    const nf = new Intl.NumberFormat(locale)
    if (row.key.endsWith('_ms')) {
      return { display: `${nf.format(n / 1000)} ${t('dashboard.aiSettings.units.seconds')}`, mono: false }
    }
    if (row.key.endsWith('_chars')) {
      return { display: `${nf.format(n)} ${t('dashboard.aiSettings.units.chars')}`, mono: false }
    }
    if (row.key.endsWith('_rows') || row.key.includes('max_rows')) {
      return { display: `${nf.format(n)} ${t('dashboard.aiSettings.units.rows')}`, mono: false }
    }
    if (row.key.includes('tokens')) {
      return { display: `${nf.format(n)} ${t('dashboard.aiSettings.units.tokens')}`, mono: false }
    }
    return { display: nf.format(n), mono: false }
  }
  // bool or unknown — just show as-is.
  return { display: row.value, mono: false }
}

export default function AiSettingsPanel() {
  const { t, locale } = useI18n()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [rows, setRows] = useState<AiConfigRow[]>([])

  async function load() {
    setLoading(true)
    setLoadError(null)
    try {
      setRows(await listAiConfig())
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  // Lazy-load on first open so non-admins don't pay the RPC cost every
  // page load.
  useEffect(() => {
    if (open && rows.length === 0 && !loading && !loadError) {
      void load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Bucket rows into the two known groups.
  const askRows = rows.filter(r => groupFor(r.key) === 'ask')
  const deepRows = rows.filter(r => groupFor(r.key) === 'deep')
  const otherRows = rows.filter(r => groupFor(r.key) === 'other')
  const sections = (
    [
      { id: 'ask' as const, rows: askRows },
      { id: 'deep' as const, rows: deepRows },
      { id: 'other' as const, rows: otherRows },
    ]
  ).filter(s => s.rows.length > 0)

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      <DrawerTrigger asChild>
        <button
          type="button"
          aria-label={t('dashboard.aiSettings.open')}
          title={t('dashboard.aiSettings.open')}
          className="rounded-full bg-muted text-muted-foreground p-1.5 hover:text-foreground hover:bg-muted/80 transition-colors"
        >
          <Settings className="h-4 w-4" />
        </button>
      </DrawerTrigger>

      <DrawerContent className="h-full sm:max-w-md">
        <DrawerHeader className="border-b border-border/60">
          <div className="flex items-center gap-2">
            <DrawerTitle className="text-base">
              {t('dashboard.aiSettings.title')}
            </DrawerTitle>
            <Badge variant="secondary" className="gap-1 text-[10px] font-normal">
              <Lock className="h-3 w-3" />
              {t('dashboard.aiSettings.readOnly')}
            </Badge>
          </div>
          <DrawerDescription>
            {t('dashboard.aiSettings.description')}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              {t('dashboard.aiSettings.loading')}
            </div>
          )}

          {loadError && !loading && (
            <div className="space-y-2 text-sm">
              <p className="text-destructive">
                {t('dashboard.aiSettings.loadFailed')}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void load()}
              >
                {t('dashboard.aiSettings.retry')}
              </Button>
            </div>
          )}

          {!loading && !loadError && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t('dashboard.aiSettings.empty')}
            </p>
          )}

          {sections.map(({ id, rows: groupRows }) => (
            <section key={id} className="space-y-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-semibold text-foreground">
                  {t(`dashboard.aiSettings.groups.${id}`)}
                </h3>
                {(id === 'ask' || id === 'deep') && (
                  <p className="text-xs text-muted-foreground">
                    {t(`dashboard.aiSettings.groups.${id}Hint`)}
                  </p>
                )}
              </div>

              <dl className="rounded-lg border border-border/60 bg-muted/30 divide-y divide-border/60">
                {groupRows.map(row => {
                  const labelKey = `dashboard.aiSettings.labels.${row.key}`
                  const label = t(labelKey)
                  // If no friendly label exists, fall back to the raw key
                  // so an added-but-not-i18n'd row still renders.
                  const friendly = label !== labelKey ? label : row.key
                  const { display, mono } = formatValue(row, t, locale)
                  return (
                    <div
                      key={row.key}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <dt className="text-sm text-muted-foreground">
                        {friendly}
                      </dt>
                      <dd
                        className={
                          mono
                            ? 'font-mono text-xs text-foreground truncate max-w-[60%]'
                            : 'text-sm font-medium text-foreground tabular-nums'
                        }
                        title={mono ? row.value : undefined}
                      >
                        {display}
                      </dd>
                    </div>
                  )
                })}
              </dl>
            </section>
          ))}
        </div>

        <DrawerFooter className="border-t border-border/60">
          <DrawerClose asChild>
            <Button variant="outline" size="sm">
              {t('dashboard.aiSettings.close')}
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
