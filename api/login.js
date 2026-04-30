import { google } from 'googleapis';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });

    const client_email = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').replace(/"/g, '').trim();
    const private_key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/"/g, '').replace(/\\n/g, '\n').trim();
    const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

    const auth = new google.auth.GoogleAuth({
        credentials: { client_email, private_key },
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    try {
        const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Sheet1!A:C' });
        const rows = response.data.values || [];
        const userRow = rows.find(row => row[0] === username);
        if (!userRow) return res.status(401).json({ error: 'Invalid username or password.' });

        const isMatch = await bcrypt.compare(password, userRow[1]);
        if (!isMatch) return res.status(401).json({ error: 'Invalid username or password.' });

        return res.json({ message: 'Login successful!', data: userRow[2] ? JSON.parse(userRow[2]) : [] });
    } catch (err) {
        return res.status(500).json({ error: 'Database error.' });
    }
}
