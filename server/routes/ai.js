/**
 * AI Query Route — POST /api/ai/query
 * 接收自然語言問題，透過 Copilot SDK 代理查詢資料庫
 */
const { Router } = require('express');
const { query } = require('../services/geminiAgent');

const router = Router();

// Simple in-memory rate limiter: 10 req/min per IP
const rateLimitMap = new Map();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function rateLimit(req, res, next) {
    const ip = req.ip;
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
        rateLimitMap.set(ip, { windowStart: now, count: 1 });
        return next();
    }

    entry.count++;
    if (entry.count > RATE_LIMIT) {
        return res.status(429).json({ error: '查詢頻率超過限制，請稍後再試（每分鐘最多 10 次）' });
    }
    next();
}

// POST /api/ai/query
router.post('/query', rateLimit, async (req, res, next) => {
    try {
        const { query: userQuery } = req.body;

        if (!userQuery || typeof userQuery !== 'string' || !userQuery.trim()) {
            return res.status(400).json({ error: '請提供查詢問題' });
        }

        if (userQuery.length > 500) {
            return res.status(400).json({ error: '查詢問題過長（最多 500 字元）' });
        }

        const result = await query(userQuery.trim());
        res.json(result);
    } catch (err) {
        console.error('[AI Query Error]', err);
        if (err.message?.includes('timeout')) {
            return res.status(504).json({ error: '查詢超時，請簡化您的問題後重試' });
        }
        next(err);
    }
});

module.exports = router;
