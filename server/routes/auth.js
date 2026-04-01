const { Router } = require('express');
const jwt = require('jsonwebtoken');

const router = Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: '請提供帳號和密碼' });
    }

    if (
        username !== process.env.ADMIN_USERNAME ||
        password !== process.env.ADMIN_PASSWORD
    ) {
        return res.status(401).json({ error: '帳號或密碼錯誤' });
    }

    const token = jwt.sign(
        { username },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
    );

    res.json({ token, expiresIn: 8 * 60 * 60 });
});

module.exports = router;
