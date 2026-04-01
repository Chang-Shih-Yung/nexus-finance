const { Router } = require('express');
const pool = require('../db/connection');

const router = Router();

// POST /api/log-event
router.post('/', async (req, res, next) => {
    try {
        const { userId, eventType, metadata } = req.body;

        if (!userId || !eventType) {
            return res.status(400).json({ error: 'userId and eventType are required' });
        }

        // metadata 大小限制：10KB
        if (metadata !== undefined) {
            const metadataStr = JSON.stringify(metadata);
            if (metadataStr.length > 10_240) {
                return res.status(400).json({ error: 'metadata 超過大小限制（最大 10KB）' });
            }
        }

        const validTypes = [
            'login', 'logout', 'transfer_init', 'transfer_success',
            'transfer_failed', 'click', 'view_account', 'view_statement',
        ];
        if (!validTypes.includes(eventType)) {
            return res.status(400).json({ error: `Invalid eventType. Must be one of: ${validTypes.join(', ')}` });
        }

        const { rows } = await pool.query(
            `INSERT INTO events (user_id, event_type, metadata) VALUES ($1, $2, $3) RETURNING id, created_at`,
            [userId, eventType, JSON.stringify(metadata || {})]
        );

        res.status(201).json(rows[0]);
    } catch (err) { next(err); }
});

module.exports = router;
