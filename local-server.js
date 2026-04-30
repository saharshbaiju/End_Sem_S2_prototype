import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(express.static(__dirname));

// Dynamic imports for ESM handlers
const handlers = {
    signup: (await import('./api/signup.js')).default,
    login: (await import('./api/login.js')).default,
    sync: (await import('./api/sync.js')).default
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
    console.log(`\n🚀 Local Dev Server (ESM) running at http://localhost:${PORT}`);
    console.log(`Routes: /api/signup, /api/login, /api/sync\n`);
});
