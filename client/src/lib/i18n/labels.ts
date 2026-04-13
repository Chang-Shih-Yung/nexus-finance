import type { Locale } from './context'

/**
 * Translation maps for database-sourced values that can't go through JSON i18n.
 * Single source of truth — import from here, don't duplicate in components.
 */

export const ERROR_CODE_LABELS: Record<Locale, Record<string, string>> = {
  "zh-TW": {
    E_TIMEOUT: "逾時",
    E_FRAUD: "詐欺",
    E_BALANCE: "餘額不足",
    E_ACCOUNT: "帳戶異常",
    E_LIMIT: "超過限額",
    E_AUTH: "驗證失敗",
    E_NETWORK: "網路錯誤",
    E_DUPLICATE: "重複交易",
    E_INVALID: "資料無效",
    E_SYSTEM: "系統錯誤",
    E_MAINTENANCE: "系統維護",
  },
  en: {
    E_TIMEOUT: "Timeout",
    E_FRAUD: "Fraud",
    E_BALANCE: "Insufficient Balance",
    E_ACCOUNT: "Account Error",
    E_LIMIT: "Over Limit",
    E_AUTH: "Auth Failed",
    E_NETWORK: "Network Error",
    E_DUPLICATE: "Duplicate",
    E_INVALID: "Invalid Data",
    E_SYSTEM: "System Error",
    E_MAINTENANCE: "Maintenance",
  },
}

export const CATEGORY_LABELS: Record<Locale, Record<string, string>> = {
  "zh-TW": {
    food_drink: "餐飲",
    groceries: "雜貨",
    income: "收入",
    transport: "交通",
    entertainment: "娛樂",
    transfer: "轉帳",
    payment: "付款",
    banking: "銀行",
    mobile: "行動支付",
    online: "線上",
    loan: "貸款",
    deposit: "存款",
    withdrawal: "提款",
    investment: "投資",
    refund: "退款",
    fee: "手續費",
    interest: "利息",
  },
  en: {
    food_drink: "Food & Drink",
    groceries: "Groceries",
    income: "Income",
    transport: "Transport",
    entertainment: "Entertainment",
    transfer: "Transfer",
    payment: "Payment",
    banking: "Banking",
    mobile: "Mobile",
    online: "Online",
    loan: "Loan",
    deposit: "Deposit",
    withdrawal: "Withdrawal",
    investment: "Investment",
    refund: "Refund",
    fee: "Fee",
    interest: "Interest",
  },
}

export const BRANCH_LABELS: Record<string, string> = {
  "新竹分行": "Hsinchu",
  "台南分行": "Tainan",
  "桃園分行": "Taoyuan",
  "台北南區分行": "Taipei South",
  "高雄分行": "Kaohsiung",
  "台中分行": "Taichung",
  "台北北區分行": "Taipei North",
  "板橋分行": "Banqiao",
  "中壢分行": "Zhongli",
  "嘉義分行": "Chiayi",
}

export const CHANNEL_LABELS: Record<Locale, Record<string, string>> = {
  "zh-TW": {
    web: "網路銀行",
    mobile: "行動銀行",
    atm: "ATM",
    branch: "臨櫃",
    "rich-seed-v1": "批次匯入",
    "demo-seed-v1": "測試",
  },
  en: {
    web: "Online Banking",
    mobile: "Mobile Banking",
    atm: "ATM",
    branch: "In-Branch",
    "rich-seed-v1": "Batch Import",
    "demo-seed-v1": "Test",
  },
}

/** Helper: get label for a given locale, fallback to raw value */
export function getLabel(
  map: Record<string, Record<string, string>>,
  locale: Locale,
  key: string
): string {
  return (map[locale]?.[key]) ?? key
}
