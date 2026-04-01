const { Pool } = require('pg');

// 如果有 DATABASE_URL（Neon / Render），直接用它
// 否則從各別 env var 組合（本地開發）
function createPool() {
    if (process.env.DATABASE_URL) {
        return new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        });
    }

    // 本地開發：必要 env var 缺少就直接崩潰，不用不安全的備用值
    const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
    for (const key of required) {
        if (!process.env[key]) {
            console.error(`[DB] 缺少必要環境變數: ${key}`);
            process.exit(1);
        }
    }

    return new Pool({
        host: process.env.DB_HOST,
        port: Number.parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });
}

const pool = createPool();

pool.on('error', (err) => {
    console.error('[DB Pool Error]', err.message);
});

module.exports = pool;
