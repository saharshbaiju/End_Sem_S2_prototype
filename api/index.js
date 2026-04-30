require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

// Sanitation: Remove quotes and trim spaces from env variables
const client_email = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').replace(/"/g, '').trim();
const private_key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/"/g, '').replace(/\\n/g, '\n').trim();

const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: client_email,
        private_key: private_key,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

// Helper: Get all users
async function getUsers() {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:C',
        });
        const rows = response.data.values;
        if (!rows || rows.length === 0) return [];
        return rows.map((row, index) => ({
            index,
            username: row[0],
            password: row[1],
            data: row[2] ? JSON.parse(row[2]) : []
        }));
    } catch (err) {
        console.error('Error fetching users from Google Sheet:', err.message);
        return null;
    }
}

// Routes prefixed with /api since Vercel routes are based on file path or vercel.json
app.post('/api/signup', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });

    const users = await getUsers();
    if (!users) return res.status(500).json({ error: 'Database error.' });

    const existingUser = users.find(u => u.username === username);
    if (existingUser) return res.status(400).json({ error: 'Username already exists.' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const defaultData = JSON.stringify([]);

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:C',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[username, hashedPassword, defaultData]]
            }
        });

        res.json({ message: 'Signup successful!', data: [] });
    } catch (err) {
        console.error('Error writing to sheet:', err.message);
        res.status(500).json({ error: 'Failed to create user.' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });

    const users = await getUsers();
    if (!users) return res.status(500).json({ error: 'Database error.' });

    const user = users.find(u => u.username === username);
    if (!user) return res.status(401).json({ error: 'Invalid username or password.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid username or password.' });

    res.json({ message: 'Login successful!', data: user.data });
});

app.post('/api/sync', async (req, res) => {
    const { username, password, data } = req.body;
    if (!username || !password || !data) return res.status(400).json({ error: 'Missing sync parameters.' });

    const users = await getUsers();
    if (!users) return res.status(500).json({ error: 'Database error.' });

    const user = users.find(u => u.username === username);
    if (!user) return res.status(401).json({ error: 'Authentication failed.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Authentication failed.' });

    const rowNumber = user.index + 1;
    
    try {
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `Sheet1!C${rowNumber}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[JSON.stringify(data)]]
            }
        });

        res.json({ message: 'Sync successful!' });
    } catch (err) {
        console.error('Error updating sheet:', err.message);
        res.status(500).json({ error: 'Failed to sync data.' });
    }
});

// For Vercel Serverless: export the app
module.exports = app;
