/**
 * simulate-traffic.js — 模擬即時流量
 * 每隔幾秒發送隨機 events 和 transactions 到 API，
 * 讓 Dashboard 可以看到即時資料更新
 */
const http = require('node:http');

const BASE = process.env.API_BASE || 'http://localhost:3001';
const INTERVAL_MS = Number.parseInt(process.env.INTERVAL || '3000', 10);

const EVENT_TYPES = [
    'login', 'logout', 'transfer_init', 'transfer_success',
    'transfer_failed', 'click', 'view_account', 'view_statement',
];
const CHANNELS = ['web', 'mobile', 'atm'];

function randomEl(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomUserId() {
    return Math.floor(Math.random() * 500) + 1;
}

function post(path, body) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE);
        const data = JSON.stringify(body);
        const req = http.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
            },
        }, (res) => {
            let chunks = '';
            res.on('data', (c) => { chunks += c; });
            res.on('end', () => resolve({ status: res.statusCode, body: chunks }));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function tick() {
    const batchSize = Math.floor(Math.random() * 4) + 1; // 1-4 events per tick
    for (let i = 0; i < batchSize; i++) {
        const eventType = randomEl(EVENT_TYPES);
        const userId = randomUserId();
        try {
            const result = await post('/api/log-event', {
                userId,
                eventType,
                metadata: { channel: randomEl(CHANNELS), simulated: true },
            });
            const symbol = result.status === 201 ? '✓' : '✗';
            process.stdout.write(`${symbol} ${eventType.padEnd(18)} user=${userId}\n`);
        } catch (err) {
            process.stdout.write(`✗ ${eventType.padEnd(18)} ERROR: ${err.message}\n`);
        }
    }
}

console.log(`🚀 開始模擬流量 → ${BASE}  (每 ${INTERVAL_MS}ms)`);
console.log('   按 Ctrl+C 停止\n');

tick();
const timer = setInterval(tick, INTERVAL_MS);

process.on('SIGINT', () => {
    clearInterval(timer);
    console.log('\n⏹  模擬已停止');
    process.exit(0);
});
