'use client'

import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Settings, Lock, RefreshCw } from '@/lib/icons'
import { useI18n } from '@/lib/i18n/context'
import {
  listAiConfig,
  setAiConfig,
  type AiConfigRow,
} from '@/lib/ai-config'

// Group keys by the two AI entry points so the panel stays readable even as
// we add more tunables later. Keys that don't match a prefix fall into the
// "other" bucket. Group labels come from i18n, but the prefix matching is
// fixed at the code layer.
const GROUPS: Array<{ id: 'ask' | 'deep'; prefix: string }> = [
  { id: 'ask', prefix: 'ask.' },
  { id: 'deep', prefix: 'deep.' },
]

type RowState = {
  row: AiConfigRow
  draft: string
  saving: boolean
  error: string | null
  savedAt: number | null
}

function groupRows(rows: AiConfigRow[]) {
  const grouped: Record<string, AiConfigRow[]> = { ask: [], deep: [], other: [] }
  for (const row of rows) {
    const g = GROUPS.find(g => row.key.startsWith(g.prefix))
    if (g) {
      grouped[g.id].push(row)
    } else {
      grouped.other.push(row)
    }
  }
  return grouped
}

export default function AiSettingsPanel() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [readOnly, setReadOnly] = useState(true)
  const [states, setStates] = useState<Record<string, RowState>>({})

  async function load() {
    setLoading(true)
    setLoadError(null)
    try {
      const rows = await listAiConfig()
      const next: Record<string, RowState> = {}
      for (const row of rows) {
        next[row.key] = {
          row,
          draft: row.value,
          saving: false,
          error: null,
          savedAt: null,
        }
      }
      setStates(next)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  // Lazy-load: only fetch when the sheet is opened so we don't hammer the
  // RPC on every page mount.
  useEffect(() => {
    if (open && Object.keys(states).length === 0 && !loading) {
      void load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function updateDraft(key: string, draft: string) {
    setStates(prev => ({
      ...prev,
      [key]: { ...prev[key], draft, error: null, savedAt: null },
    }))
  }

  async function save(key: string) {
    const state = states[key]
    if (!state || state.draft === state.row.value) return
    setStates(prev => ({
      ...prev,
      [key]: { ...prev[key], saving: true, error: null },
    }))
    try {
      const updated = await setAiConfig(key, state.draft)
      setStates(prev => ({
        ...prev,
        [key]: {
          row: updated,
          draft: updated.value,
          saving: false,
          error: null,
          savedAt: Date.now(),
        },
      }))
      setReadOnly(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const isPermission =
        msg.includes('only service_role') || msg.includes('permission denied')
      setStates(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          saving: false,
          error: isPermission ? t('dashboard.aiSettings.readOnlyError') : msg,
          savedAt: null,
        },
      }))
      if (isPermission) setReadOnly(true)
    }
  }

  const rows = Object.values(states).map(s => s.row)
  const grouped = groupRows(rows)

  // Render group sections in a stable order; hide empty buckets so "other"
  // never shows up unless we actually add an un-prefixed key later.
  const sections = (
    [
      { id: 'ask', rows: grouped.ask },
      { id: 'deep', rows: grouped.deep },
      { id: 'other', rows: grouped.other },
    ] as const
  ).filter(s => s.rows.length > 0)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={t('dashboard.aiSettings.open')}
          title={t('dashboard.aiSettings.open')}
          className="rounded-full bg-muted text-muted-foreground p-1.5 hover:text-foreground hover:bg-muted/80 transition-colors"
        >
          <Settings className="h-4 w-4" />
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {t('dashboard.aiSettings.title')}
            {readOnly && (
              <Badge variant="outline" className="gap-1 text-xs font-normal">
                <Lock className="h-3 w-3" />
                {t('dashboard.aiSettings.readOnly')}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            {t('dashboard.aiSettings.description')}
          </SheetDescription>
        </SheetHeader>

        <div className="p-4 space-y-6">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              {t('dashboard.aiSettings.loading')}
            </div>
          )}

          {loadError && (
            <div className="text-sm text-destructive">
              {t('dashboard.aiSettings.loadFailed')}：{loadError}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-2"
                onClick={() => void load()}
              >
                {t('dashboard.aiSettings.retry')}
              </Button>
            </div>
          )}

          {!loading && !loadError && rows.length === 0 && (
            <div className="text-sm text-muted-foreground">
              {t('dashboard.aiSettings.empty')}
            </div>
          )}

          {sections.map(({ id, rows: groupRowsList }) => (
            <section key={id} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t(`dashboard.aiSettings.groups.${id}`)}
              </h3>
              <div className="space-y-3">
                {groupRowsList.map(row => {
                  const state = states[row.key]
                  if (!state) return null
                  const dirty = state.draft !== state.row.value
                  return (
                    <div key={row.key} className="space-y-1">
                      <Label
                        htmlFor={`ai-cfg-${row.key}`}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="font-mono text-xs">{row.key}</span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-normal"
                        >
                          {row.value_type}
                        </Badge>
                      </Label>
                      {row.description && (
                        <p className="text-xs text-muted-foreground">
                          {row.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <Input
                          id={`ai-cfg-${row.key}`}
                          value={state.draft}
                          onChange={e => updateDraft(row.key, e.target.value)}
                          disabled={state.saving}
                          className="font-mono text-sm"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant={dirty ? 'default' : 'outline'}
                          disabled={!dirty || state.saving}
                          onClick={() => void save(row.key)}
                        >
                          {state.saving
                            ? t('dashboard.aiSettings.saving')
                            : t('dashboard.aiSettings.save')}
                        </Button>
                      </div>
                      {state.error && (
                        <p className="text-xs text-destructive">{state.error}</p>
                      )}
                      {state.savedAt && !dirty && !state.error && (
                        <p className="text-xs text-emerald-600">
                          {t('dashboard.aiSettings.saved')}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
