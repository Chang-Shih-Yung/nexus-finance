const { Router } = require('express');
const pool = require('../db/connection');

const router = Router();

// --- 每日登入人數 ---
router.get('/daily-logins', async (req, res, next) => {
    try {
        const { from, to } = req.query;
        const params = [];
        let where = "WHERE e.event_type = 'login'";
        if (from) { params.push(from); where += ` AND e.created_at >= $${params.length}`; }
        if (to) { params.push(to); where += ` AND e.created_at <= $${params.length}`; }

        const { rows } = await pool.query(`
      SELECT DATE(e.created_at) AS date, COUNT(DISTINCT e.user_id) AS count
      FROM events e ${where}
      GROUP BY DATE(e.created_at)
      ORDER BY date
    `, params);
        res.json(rows);
    } catch (err) { next(err); }
});

// --- 轉帳成功率（按日）---
router.get('/transfer-success-rate', async (req, res, next) => {
    try {
        const { from, to } = req.query;
        const params = [];
        let where = '';
        if (from) { params.push(from); where += ` AND t.created_at >= $${params.length}`; }
        if (to) { params.push(to); where += ` AND t.created_at <= $${params.length}`; }

        const { rows } = await pool.query(`
      SELECT
        DATE(t.created_at) AS date,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE t.status = 'success') AS success_count,
        ROUND(COUNT(*) FILTER (WHERE t.status = 'success') * 100.0 / NULLIF(COUNT(*), 0), 2) AS success_rate
      FROM transactions t
      WHERE 1=1 ${where}
      GROUP BY DATE(t.created_at)
      ORDER BY date
    `, params);
        res.json(rows);
    } catch (err) { next(err); }
});

// --- 漏斗分析 ---
router.get('/funnel', async (req, res, next) => {
    try {
        const { from, to } = req.query;
        const params = [];
        let where = '';
        if (from) { params.push(from); where += ` AND created_at >= $${params.length}`; }
        if (to) { params.push(to); where += ` AND created_at <= $${params.length}`; }

        // 只計算在 24 小時內同時完成 login 再做 transfer 的用戶
        // 避免上週登入、今天轉帳被誤算為同一漏斗路徑
        const windowHours = 24;
        const { rows } = await pool.query(`
      WITH session_window AS (
        SELECT
          user_id,
          MAX(CASE WHEN event_type = 'login'            THEN created_at END) AS last_login,
          MAX(CASE WHEN event_type = 'transfer_init'    THEN created_at END) AS last_init,
          MAX(CASE WHEN event_type = 'transfer_success' THEN created_at END) AS last_success
        FROM events
        WHERE event_type IN ('login', 'transfer_init', 'transfer_success')
        ${where}
        GROUP BY user_id
      )
      SELECT
        COUNT(DISTINCT user_id)                                                                  AS login_users,
        COUNT(DISTINCT CASE WHEN last_init    IS NOT NULL AND last_init    - last_login    <= ($${params.length + 1} || ' hours')::INTERVAL THEN user_id END) AS init_users,
        COUNT(DISTINCT CASE WHEN last_success IS NOT NULL AND last_success - last_login    <= ($${params.length + 1} || ' hours')::INTERVAL THEN user_id END) AS success_users
      FROM session_window
      WHERE last_login IS NOT NULL
    `, [...params, windowHours]);

        const r = rows[0];
        const funnel = [
            { step: 'login',            users: Number.parseInt(r.login_users,   10) },
            { step: 'transfer_init',    users: Number.parseInt(r.init_users,    10) },
            { step: 'transfer_success', users: Number.parseInt(r.success_users, 10) },
        ];

        for (let i = 1; i < funnel.length; i++) {
            const prev = funnel[i - 1].users;
            funnel[i].conversion_rate = prev ? +(funnel[i].users / prev * 100).toFixed(2) : 0;
            funnel[i].drop_off_rate   = prev ? +((1 - funnel[i].users / prev) * 100).toFixed(2) : 0;
        }

        res.json(funnel);
    } catch (err) { next(err); }
});

// --- 錯誤分佈（按 error_code）---
router.get('/error-breakdown', async (req, res, next) => {
    try {
        const { from, to } = req.query;
        const params = [];
        let where = "WHERE t.status = 'failed'";
        if (from) { params.push(from); where += ` AND t.created_at >= $${params.length}`; }
        if (to) { params.push(to); where += ` AND t.created_at <= $${params.length}`; }

        const { rows } = await pool.query(`
      SELECT t.error_code, COUNT(*) AS count
      FROM transactions t ${where}
      GROUP BY t.error_code
      ORDER BY count DESC
    `, params);
        res.json(rows);
    } catch (err) { next(err); }
});

// --- 今日總覽 ---
router.get('/overview', async (req, res, next) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const [loginsRes, txRes, activeRes] = await Promise.all([
            pool.query(`SELECT COUNT(DISTINCT user_id) AS count FROM events WHERE event_type='login' AND DATE(created_at)=$1`, [today]),
            pool.query(`
        SELECT COUNT(*) AS total,
               COUNT(*) FILTER (WHERE status='success') AS success_count,
               ROUND(COUNT(*) FILTER (WHERE status='success') * 100.0 / NULLIF(COUNT(*),0), 2) AS success_rate
        FROM transactions WHERE DATE(created_at)=$1
      `, [today]),
            pool.query(`SELECT COUNT(DISTINCT user_id) AS count FROM events WHERE DATE(created_at)=$1`, [today]),
        ]);

        res.json({
            today_logins: Number.parseInt(loginsRes.rows[0].count, 10),
            today_transactions: Number.parseInt(txRes.rows[0].total, 10),
            today_success_rate: Number.parseFloat(txRes.rows[0].success_rate || 0),
            today_active_users: Number.parseInt(activeRes.rows[0].count, 10),
        });
    } catch (err) { next(err); }
});

// --- 最近 N 天趨勢 ---
router.get('/trend', async (req, res, next) => {
    try {
        const days = Math.min(Number.parseInt(req.query.days || '7', 10), 90);
        const { rows } = await pool.query(`
      SELECT
        d.date,
        COALESCE(login_counts.count, 0) AS logins,
        COALESCE(tx_counts.total, 0) AS transactions,
        COALESCE(tx_counts.success_rate, 0) AS success_rate
      FROM generate_series(CURRENT_DATE - $1 * INTERVAL '1 day', CURRENT_DATE, '1 day') AS d(date)
      LEFT JOIN (
        SELECT DATE(created_at) AS date, COUNT(DISTINCT user_id) AS count
        FROM events WHERE event_type='login'
        GROUP BY DATE(created_at)
      ) login_counts ON d.date = login_counts.date
      LEFT JOIN (
        SELECT DATE(created_at) AS date, COUNT(*) AS total,
               ROUND(COUNT(*) FILTER (WHERE status='success') * 100.0 / NULLIF(COUNT(*),0), 2) AS success_rate
        FROM transactions GROUP BY DATE(created_at)
      ) tx_counts ON d.date = tx_counts.date
      ORDER BY d.date
    `, [days]);
        res.json(rows);
    } catch (err) { next(err); }
});

// --- API 健康指標（Phase 3）---
router.get('/api-health', async (req, res, next) => {
    try {
        const minutes = Math.min(Number.parseInt(req.query.minutes || '60', 10), 1440);
        const { rows } = await pool.query(`
      SELECT
        date_trunc('minute', created_at) AS minute,
        ROUND(AVG(response_time_ms)::numeric, 2) AS avg_latency,
        COUNT(*) AS total_requests,
        COUNT(*) FILTER (WHERE status_code >= 500) AS error_count,
        ROUND(COUNT(*) FILTER (WHERE status_code >= 500) * 100.0 / NULLIF(COUNT(*),0), 2) AS error_rate
      FROM api_logs
      WHERE created_at >= NOW() - ($1 || ' minutes')::INTERVAL
      GROUP BY date_trunc('minute', created_at)
      ORDER BY minute
    `, [minutes]);
        res.json(rows);
    } catch (err) { next(err); }
});

// --- 失敗交易明細 ---
router.get('/failed-transactions', async (req, res, next) => {
    try {
        const limit = Math.min(Number.parseInt(req.query.limit || '50', 10), 200);
        const { rows } = await pool.query(`
      SELECT t.id, u.name AS user_name, u.tier, t.amount, t.currency,
             t.from_account, t.to_account, t.error_code, t.error_message,
             t.channel, t.created_at
      FROM transactions t
      JOIN users u ON u.id = t.user_id
      WHERE t.status = 'failed'
      ORDER BY t.created_at DESC
      LIMIT $1
    `, [limit]);
        res.json(rows);
    } catch (err) { next(err); }
});

module.exports = router;
