import { describe, it, expect } from 'vitest'
import { sanitize, MAX_ROWS } from '../services/sqlSanitizer.js'

describe('sqlSanitizer — 允許正常 SELECT', () => {
    it('基本 SELECT', () => {
        const r = sanitize('SELECT id, name FROM users')
        expect(r.ok).toBe(true)
        expect(r.sql).toContain('LIMIT')
    })

    it('有 LIMIT 的 SELECT 不再重複加', () => {
        const r = sanitize('SELECT * FROM users LIMIT 10')
        expect(r.ok).toBe(true)
        const matches = r.sql.match(/LIMIT/gi)
        expect(matches).toHaveLength(1)
    })

    it('WITH CTE 允許通過', () => {
        const r = sanitize('WITH cte AS (SELECT id FROM users) SELECT * FROM cte')
        expect(r.ok).toBe(true)
    })

    it('移除結尾分號', () => {
        const r = sanitize('SELECT 1;')
        expect(r.ok).toBe(true)
        expect(r.sql).not.toContain(';')
    })
})

describe('sqlSanitizer — 強制 LIMIT 上限', () => {
    it(`超過 MAX_ROWS(${MAX_ROWS}) 的 LIMIT 被截斷`, () => {
        const r = sanitize(`SELECT * FROM users LIMIT 9999`)
        expect(r.ok).toBe(true)
        expect(r.sql).toContain(`LIMIT ${MAX_ROWS}`)
        expect(r.sql).not.toContain('9999')
    })

    it('無 LIMIT 時自動補上 MAX_ROWS', () => {
        const r = sanitize('SELECT * FROM transactions')
        expect(r.ok).toBe(true)
        expect(r.sql).toContain(`LIMIT ${MAX_ROWS}`)
    })

    it('合理 LIMIT 保持不變', () => {
        const r = sanitize('SELECT * FROM users LIMIT 50')
        expect(r.ok).toBe(true)
        expect(r.sql).toContain('LIMIT 50')
    })
})

describe('sqlSanitizer — 封鎖危險語句', () => {
    const attacks = [
        'DROP TABLE users',
        'DELETE FROM users WHERE 1=1',
        'INSERT INTO users (name) VALUES (\'x\')',
        'UPDATE users SET name=\'x\'',
        'TRUNCATE TABLE users',
        'SELECT * FROM users; DROP TABLE users',
        'SELECT * FROM pg_tables',
        'SELECT * FROM information_schema.tables',
        "SELECT * FROM users -- ignore rest",
        'SELECT /* comment */ * FROM users',
        'EXECUTE sp_exec',
        'SELECT * INTO OUTFILE \'/tmp/out\'',
    ]

    attacks.forEach((sql) => {
        it(`封鎖: ${sql.slice(0, 50)}`, () => {
            const r = sanitize(sql)
            expect(r.ok).toBe(false)
            expect(r.error).toBeTruthy()
        })
    })

    it('封鎖非 SELECT 開頭', () => {
        expect(sanitize('SHOW TABLES').ok).toBe(false)
        expect(sanitize('DESCRIBE users').ok).toBe(false)
    })

    it('空字串回傳錯誤', () => {
        expect(sanitize('').ok).toBe(false)
        expect(sanitize('   ').ok).toBe(false)
    })
})
