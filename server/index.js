require('dotenv').config({ path: require('node:path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const apiLogger = require('./middleware/apiLogger');
const statsRoutes = require('./routes/stats');
const eventsRoutes = require('./routes/events');
const aiRoutes = require('./routes/ai');
const authRoutes = require('./routes/auth');
const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// 安全標頭
app.use(helmet());

// CORS — 只允許指定前端 origin
const allowedOrigins = new Set([
    'http://localhost:5173',
    'http://localhost:4173',
    process.env.FRONTEND_URL,
].filter(Boolean));

app.use(cors({
    origin: (origin, callback) => {
        // 允許無 origin（curl、Render health check 等）
        if (!origin || allowedOrigins.has(origin)) return callback(null, true);
        callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
}));

app.use(express.json());
app.use(apiLogger);

// Routes — /api/auth 不需驗證，其餘全部需要 JWT
app.use('/api/auth', authRoutes);
app.use('/api/stats', requireAuth, statsRoutes);
app.use('/api/log-event', requireAuth, eventsRoutes);
app.use('/api/ai', requireAuth, aiRoutes);

// Health check（不需驗證）
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, _req, res, _next) => {
    console.error('[Server Error]', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, () => {
    console.log(`Nexus Finance API running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
