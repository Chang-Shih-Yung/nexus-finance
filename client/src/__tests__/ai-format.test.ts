import { describe, it, expect } from 'vitest'
import { fieldLabel, formatValue, rowColumns } from '@/lib/ai-format'

describe('ai-format.fieldLabel', () => {
  it('returns the Chinese label for a known field', () => {
    expect(fieldLabel('total_revenue')).toBe('總營收')
    expect(fieldLabel('npl_ratio')).toBe('NPL 比率')
    expect(fieldLabel('snapshot_date')).toBe('日期')
  })

  it('prettifies unknown snake_case keys as a fallback', () => {
    expect(fieldLabel('foo_bar_baz')).toBe('Foo Bar Baz')
  })
})

describe('ai-format.formatValue — enum translation', () => {
  it('translates transaction status values to Chinese', () => {
    expect(formatValue('status', 'pending')).toBe('待處理')
    expect(formatValue('status', 'success')).toBe('成功')
    expect(formatValue('status', 'failed')).toBe('失敗')
  })

  it('translates compliance status values', () => {
    expect(formatValue('status', 'compliant')).toBe('合規')
    expect(formatValue('status', 'violation')).toBe('違規')
  })

  it('translates channel values', () => {
    expect(formatValue('channel', 'web')).toBe('網頁')
    expect(formatValue('channel', 'mobile')).toBe('行動')
    expect(formatValue('channel', 'atm')).toBe('ATM')
  })

  it('translates category values', () => {
    expect(formatValue('category', 'payment')).toBe('付款')
    expect(formatValue('category', 'transfer')).toBe('轉帳')
    expect(formatValue('category', 'withdrawal')).toBe('提款')
  })

  it('translates currency codes', () => {
    expect(formatValue('currency', 'TWD')).toBe('台幣')
    expect(formatValue('currency', 'USD')).toBe('美元')
    expect(formatValue('primary_currency', 'JPY')).toBe('日圓')
  })

  it('translates severity and risk level values', () => {
    expect(formatValue('severity', 'critical')).toBe('重大')
    expect(formatValue('risk_level', 'high')).toBe('高風險')
    expect(formatValue('risk_level', 'low')).toBe('低風險')
  })

  it('passes through unknown enum values unchanged', () => {
    expect(formatValue('status', 'escalated')).toBe('escalated')
    expect(formatValue('channel', 'smartwatch')).toBe('smartwatch')
  })

  it('passes through values already in Chinese unchanged', () => {
    expect(formatValue('loan_type', '房貸')).toBe('房貸')
    expect(formatValue('product_type', '儲蓄')).toBe('儲蓄')
  })

  it('does not translate when the column key has no dictionary', () => {
    expect(formatValue('user_name', 'pending')).toBe('pending')
  })
})

describe('ai-format.formatValue — numeric & date formatting (regression)', () => {
  it('formats money with comma grouping', () => {
    expect(formatValue('total_revenue', 93068203.43)).toBe('93,068,203.43')
  })

  it('formats percent fields with a % suffix', () => {
    expect(formatValue('npl_ratio', 2.3)).toBe('2.3%')
    expect(formatValue('change_pct', 12.34)).toBe('12.3%')
  })

  it('formats count fields as locale integers', () => {
    expect(formatValue('loan_count', 1234)).toBe('1,234')
  })

  it('formats date keys as yyyy-MM-dd', () => {
    expect(formatValue('date', '2026-04-10')).toBe('2026-04-10')
  })

  it('formats booleans as 是/否', () => {
    expect(formatValue('any', true)).toBe('是')
    expect(formatValue('any', false)).toBe('否')
  })

  it('renders null as em-dash', () => {
    expect(formatValue('anything', null)).toBe('—')
  })
})

describe('ai-format.rowColumns', () => {
  it('returns keys in first-row order', () => {
    expect(rowColumns([{ a: 1, b: 2, c: 3 }])).toEqual(['a', 'b', 'c'])
  })

  it('returns empty array for empty input', () => {
    expect(rowColumns([])).toEqual([])
  })
})
