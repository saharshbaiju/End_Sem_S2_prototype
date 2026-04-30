require('dotenv').config();
const express = require('express');
const app = express();
const PORT = 5000;

app.use(express.json());
app.use(express.static(__dirname));

// Mock Vercel serverless environment for local testing
const handlers = {
    signup: require('./api/signup'),
    login: require('./api/login'),
    sync: require('./api/sync')
};

app.post('/api/:function', (req, res) => {
    const handler = handlers[req.params.function];
    if (handler) {
        handler(req, res);
    } else {
        res.status(404).json({ error: 'Function not found' });
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 Local Dev Server running at http://localhost:${PORT}`);
    console.log(`\nThis server emulates the Vercel Serverless environment.`);
    console.log(`Routes: /api/signup, /api/login, /api/sync\n`);
});
