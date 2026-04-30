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
        if (rows.find(row => row[0] === username)) return res.status(400).json({ error: 'Username already exists.' });

        const hashedPassword = await bcrypt.hash(password, 10);
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:C',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[username, hashedPassword, JSON.stringify([])]] }
        });
        return res.json({ message: 'Signup successful!', data: [] });
    } catch (err) {
        return res.status(500).json({ error: 'Database error.' });
    }
}
