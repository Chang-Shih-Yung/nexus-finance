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
import {
  listAiConfig,
  setAiConfig,
  type AiConfigRow,
} from '@/lib/ai-config'

// Group keys by the two AI entry points so the panel stays readable even as
// we add more tunables later. Keys that don't match a prefix fall into "其他".
const GROUPS: Array<{ title: string; prefix: string }> = [
  { title: 'nf_ai_ask (快速問答)', prefix: 'ask.' },
  { title: 'nf_ai_ask_deep (深度分析)', prefix: 'deep.' },
]

type RowState = {
  row: AiConfigRow
  draft: string
  saving: boolean
  error: string | null
  savedAt: number | null
}

function groupRows(rows: AiConfigRow[]) {
  const grouped: Record<string, AiConfigRow[]> = {}
  const others: AiConfigRow[] = []
  for (const row of rows) {
    const g = GROUPS.find(g => row.key.startsWith(g.prefix))
    if (g) {
      grouped[g.title] = grouped[g.title] ?? []
      grouped[g.title].push(row)
    } else {
      others.push(row)
    }
  }
  if (others.length > 0) grouped['其他'] = others
  return grouped
}

export default function AiSettingsPanel() {
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

  // Lazy-load: only fetch when the sheet is opened so we don't hammer
  // the RPC on every page mount.
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
          error: isPermission
            ? '唯讀模式：此瀏覽器未使用 service_role，無法寫入。'
            : msg,
          savedAt: null,
        },
      }))
      if (isPermission) setReadOnly(true)
    }
  }

  const rows = Object.values(states).map(s => s.row)
  const grouped = groupRows(rows)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="AI 設定"
          title="AI 設定"
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
            AI 模型調校
            {readOnly && (
              <Badge variant="outline" className="gap-1 text-xs font-normal">
                <Lock className="h-3 w-3" />
                唯讀
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            調整 nf_ai_ask 與 nf_ai_ask_deep 的模型名稱、超時、token 上限等參數。
            儲存需要 service_role 權限；一般登入帳號僅能瀏覽。
          </SheetDescription>
        </SheetHeader>

        <div className="p-4 space-y-6">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              載入中...
            </div>
          )}

          {loadError && (
            <div className="text-sm text-destructive">
              載入失敗：{loadError}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-2"
                onClick={() => void load()}
              >
                重試
              </Button>
            </div>
          )}

          {!loading && !loadError && rows.length === 0 && (
            <div className="text-sm text-muted-foreground">無設定項目。</div>
          )}

          {Object.entries(grouped).map(([title, groupRows]) => (
            <section key={title} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {title}
              </h3>
              <div className="space-y-3">
                {groupRows.map(row => {
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
                          {state.saving ? '儲存中' : '儲存'}
                        </Button>
                      </div>
                      {state.error && (
                        <p className="text-xs text-destructive">{state.error}</p>
                      )}
                      {state.savedAt && !dirty && !state.error && (
                        <p className="text-xs text-emerald-600">已儲存</p>
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
