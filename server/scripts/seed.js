/**
 * Seed script — 產生銀行模擬資料
 * 500 users / 10K events / 5K transactions
 */
const { faker } = require('@faker-js/faker');
const pool = require('../db/connection');

faker.locale = 'zh_TW';

const USERS_COUNT = 500;
const EVENTS_COUNT = 10000;
const TRANSACTIONS_COUNT = 5000;

const EVENT_TYPES = [
    'login', 'logout', 'transfer_init', 'transfer_success',
    'transfer_failed', 'click', 'view_account', 'view_statement',
];
const TIERS = ['general', 'vip', 'premium'];
const CHANNELS = ['web', 'mobile', 'atm'];
const BRANCHES = [
    '台北信義分行', '台北忠孝分行', '台北南京分行', '台北松山分行',
    '新北板橋分行', '新北中和分行', '桃園中壢分行', '台中西屯分行',
    '台南東區分行', '高雄前鎮分行',
];
const RM_NAMES = [
    '王小明', '李婉如', '張志豪', '陳美玲', '林佳穎',
    '黃建宏', '劉怡君', '蔡志偉', '吳淑芬', '楊宗翰',
];
const ERROR_CODES = [
    'INSUFFICIENT_BALANCE', 'ACCOUNT_NOT_FOUND', 'DAILY_LIMIT_EXCEEDED',
    'INVALID_ACCOUNT', 'SYSTEM_TIMEOUT', 'DUPLICATE_TX', 'AUTH_FAILED',
];

function randomDate(daysBack) {
    const now = new Date();
    const past = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
}

function randomEl(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateAccount() {
    return faker.string.numeric(12);
}

async function seed() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Clean existing data
        await client.query('TRUNCATE transactions, events, api_logs, users RESTART IDENTITY CASCADE');

        // --- Users ---
        console.log(`Seeding ${USERS_COUNT} users...`);
        const userIds = [];
        for (let i = 0; i < USERS_COUNT; i++) {
            const tier = Math.random() < 0.15 ? 'premium' : Math.random() < 0.3 ? 'vip' : 'general';
            const createdAt = randomDate(90);
            const res = await client.query(
                `INSERT INTO users (name, email, phone, tier, rm_name, branch, created_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
                [
                    faker.person.fullName(),
                    faker.internet.email().toLowerCase(),
                    faker.phone.number('09########'),
                    tier,
                    randomEl(RM_NAMES),
                    randomEl(BRANCHES),
                    createdAt,
                    Math.random() < 0.95 ? 'active' : 'inactive',
                ]
            );
            userIds.push(res.rows[0].id);
        }

        // --- Events ---
        console.log(`Seeding ${EVENTS_COUNT} events...`);
        const eventValues = [];
        const eventParams = [];
        let paramIdx = 1;
        for (let i = 0; i < EVENTS_COUNT; i++) {
            const userId = randomEl(userIds);
            const eventType = randomEl(EVENT_TYPES);
            const createdAt = randomDate(30);
            const metadata = JSON.stringify({
                ip: faker.internet.ip(),
                userAgent: faker.internet.userAgent(),
            });
            eventValues.push(`($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`);
            eventParams.push(userId, eventType, metadata, createdAt);

            // Batch insert every 500 rows
            if (eventValues.length >= 500 || i === EVENTS_COUNT - 1) {
                await client.query(
                    `INSERT INTO events (user_id, event_type, metadata, created_at) VALUES ${eventValues.join(',')}`,
                    eventParams
                );
                eventValues.length = 0;
                eventParams.length = 0;
                paramIdx = 1;
            }
        }

        // --- Transactions ---
        console.log(`Seeding ${TRANSACTIONS_COUNT} transactions...`);
        const txValues = [];
        const txParams = [];
        paramIdx = 1;
        for (let i = 0; i < TRANSACTIONS_COUNT; i++) {
            const userId = randomEl(userIds);
            const isFailed = Math.random() < 0.15;
            const status = isFailed ? 'failed' : (Math.random() < 0.05 ? 'pending' : 'success');
            const errorCode = status === 'failed' ? randomEl(ERROR_CODES) : null;
            const errorMessage = errorCode ? `Transaction failed: ${errorCode}` : null;
            const amount = Math.round((Math.random() * 500000 + 100) * 100) / 100; // 100 ~ 500,100
            const createdAt = randomDate(30);
            const channel = randomEl(CHANNELS);

            txValues.push(
                `($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`
            );
            txParams.push(
                userId, amount, generateAccount(), generateAccount(),
                status, errorCode, errorMessage, channel, createdAt
            );

            if (txValues.length >= 500 || i === TRANSACTIONS_COUNT - 1) {
                await client.query(
                    `INSERT INTO transactions (user_id, amount, from_account, to_account, status, error_code, error_message, channel, created_at)
           VALUES ${txValues.join(',')}`,
                    txParams
                );
                txValues.length = 0;
                txParams.length = 0;
                paramIdx = 1;
            }
        }

        // Update last_login_at for users who have login events
        await client.query(`
      UPDATE users u SET last_login_at = sub.latest
      FROM (
        SELECT user_id, MAX(created_at) AS latest
        FROM events WHERE event_type = 'login'
        GROUP BY user_id
      ) sub
      WHERE u.id = sub.user_id
    `);

        await client.query('COMMIT');
        console.log('✅ Seed complete!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Seed failed:', err);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
