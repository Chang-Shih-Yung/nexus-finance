import { describe, it, expect } from 'vitest'
import zhTW from '@/lib/i18n/locales/zh-TW.json'
import en from '@/lib/i18n/locales/en.json'
import {
  ERROR_CODE_LABELS,
  CATEGORY_LABELS,
  BRANCH_LABELS,
  CHANNEL_LABELS,
  getLabel,
} from '@/lib/i18n/labels'

// ── Helpers ─────────────────────────────────────────────────

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as Record<string, unknown>, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys
}

// ── JSON key parity ─────────────────────────────────────────

describe('i18n JSON key parity', () => {
  const zhKeys = new Set(flattenKeys(zhTW))
  const enKeys = new Set(flattenKeys(en))

  it('zh-TW and en have the same number of keys', () => {
    expect(zhKeys.size).toBe(enKeys.size)
  })

  it('every zh-TW key exists in en', () => {
    const missing = [...zhKeys].filter(k => !enKeys.has(k))
    expect(missing).toEqual([])
  })

  it('every en key exists in zh-TW', () => {
    const missing = [...enKeys].filter(k => !zhKeys.has(k))
    expect(missing).toEqual([])
  })
})

// ── Label map parity ────────────────────────────────────────

describe('label map parity', () => {
  it('ERROR_CODE_LABELS has same keys for both locales', () => {
    const zhKeys = Object.keys(ERROR_CODE_LABELS['zh-TW']).sort()
    const enKeys = Object.keys(ERROR_CODE_LABELS.en).sort()
    expect(zhKeys).toEqual(enKeys)
  })

  it('CATEGORY_LABELS has same keys for both locales', () => {
    const zhKeys = Object.keys(CATEGORY_LABELS['zh-TW']).sort()
    const enKeys = Object.keys(CATEGORY_LABELS.en).sort()
    expect(zhKeys).toEqual(enKeys)
  })

  it('CHANNEL_LABELS has same keys for both locales', () => {
    const zhKeys = Object.keys(CHANNEL_LABELS['zh-TW']).sort()
    const enKeys = Object.keys(CHANNEL_LABELS.en).sort()
    expect(zhKeys).toEqual(enKeys)
  })
})

// ── getLabel helper ─────────────────────────────────────────

describe('getLabel', () => {
  it('returns translated label for known key', () => {
    expect(getLabel(ERROR_CODE_LABELS, 'en', 'E_TIMEOUT')).toBe('Timeout')
    expect(getLabel(ERROR_CODE_LABELS, 'zh-TW', 'E_TIMEOUT')).toBe('逾時')
  })

  it('falls back to raw key for unknown key', () => {
    expect(getLabel(ERROR_CODE_LABELS, 'en', 'E_UNKNOWN')).toBe('E_UNKNOWN')
  })

  it('returns branch label for en locale', () => {
    expect(BRANCH_LABELS['新竹分行']).toBe('Hsinchu')
  })
})
