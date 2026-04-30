require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const PORT = process.env.PORT || 5000;

// Validate Environment Variables
const requiredEnv = ['GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_SHEET_ID'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
    console.error('❌ CRITICAL ERROR: Missing required environment variables in .env file:');
    missingEnv.forEach(env => console.error(`   - ${env}`));
    console.error('\nPlease double check that your .env file is SAVED and contains these values.\n');
}
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
            range: 'Sheet1!A:C', // Column A: Username, B: Hashed Password, C: JSON Data
        });
        const rows = response.data.values;
        if (!rows || rows.length === 0) return [];

        // Skip header if you want, assuming row 1 might be headers or not.
        // Let's assume no headers or handle it dynamically.
        return rows.map((row, index) => ({
            index,           // 0-based index in the returned rows
            username: row[0],
            password: row[1],
            data: row[2] ? JSON.parse(row[2]) : []
        }));
    } catch (err) {
        console.error('Error fetching users from Google Sheet:');
        if (err.response && err.response.data) {
            console.error('API Error Data:', JSON.stringify(err.response.data, null, 2));
        } else {
            console.error('Full Error:', err);
        }
        return null;
    }
}

// Signup Endpoint
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
        console.error('Error writing to sheet:', err);
        res.status(500).json({ error: 'Failed to create user.' });
    }
});

// Login Endpoint
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

// Sync Data Endpoint
app.post('/api/sync', async (req, res) => {
    const { username, password, data } = req.body;
    if (!username || !password || !data) return res.status(400).json({ error: 'Missing sync parameters.' });

    const users = await getUsers();
    if (!users) return res.status(500).json({ error: 'Database error.' });

    const user = users.find(u => u.username === username);
    if (!user) return res.status(401).json({ error: 'Authentication failed.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Authentication failed.' });

    // user.index is the 0-based index. In Google Sheets, rows are 1-based.
    // Assuming we read the whole sheet from row 1, the row number is user.index + 1
    const rowNumber = user.index + 1;

    try {
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `Sheet1!C${rowNumber}`, // Update only the data column
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[JSON.stringify(data)]]
            }
        });

        res.json({ message: 'Sync successful!' });
    } catch (err) {
        console.error('Error updating sheet:', err);
        res.status(500).json({ error: 'Failed to sync data.' });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
app.get('/debug', async (req, res) => {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:C',
        });
        res.json(response.data);
    } catch (err) {
        console.error("REAL ERROR:", err.response?.data || err.message || err);
        res.status(500).send("Error");
    }
});