const pool = require('../db/connection');

// 啟動時清除 7 天前的舊紀錄
async function pruneOldLogs() {
    try {
        const result = await pool.query(
            `DELETE FROM api_logs WHERE created_at < NOW() - INTERVAL '7 days'`
        );
        if (result.rowCount > 0) {
            console.log(`[apiLogger] 清除 ${result.rowCount} 筆 7 天前的 api_logs`);
        }
    } catch (err) {
        console.warn('[apiLogger] 清除舊紀錄失敗:', err.message);
    }
}

pruneOldLogs();

function apiLogger(req, res, next) {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        // 截短 path 避免 VARCHAR(255) 溢出，且去除 query string
        const path = req.path.substring(0, 255);

        pool.query(
            `INSERT INTO api_logs (method, path, status_code, response_time_ms) VALUES ($1, $2, $3, $4)`,
            [req.method, path, res.statusCode, duration]
        ).catch((err) => {
            console.warn('[apiLogger] INSERT 失敗:', err.message);
        });
    });

    next();
}

module.exports = apiLogger;
