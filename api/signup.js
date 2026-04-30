import bcrypt from 'bcryptjs';
import { appendUser, findUserRow, getSheetRows } from './_lib/googleSheets.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });

    try {
        const { sheets, spreadsheetId, rows } = await getSheetRows();
        if (findUserRow(rows, username)) return res.status(400).json({ error: 'Username already exists.' });

        const hashedPassword = await bcrypt.hash(password, 10);
        await appendUser(sheets, spreadsheetId, username, hashedPassword);
        return res.json({ message: 'Signup successful!', data: {} });
    } catch (err) {
        console.error('Signup error:', err);
        return res.status(500).json({ error: 'Database error.' });
    }
}
