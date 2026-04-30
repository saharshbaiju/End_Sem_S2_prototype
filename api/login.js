import bcrypt from 'bcryptjs';
import { findUserRow, getSheetRows, parseStoredData } from './_lib/googleSheets.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });

    try {
        const { rows } = await getSheetRows();
        const userRow = findUserRow(rows, username);
        if (!userRow) return res.status(401).json({ error: 'Invalid username or password.' });

        const isMatch = await bcrypt.compare(password, userRow.passwordHash);
        if (!isMatch) return res.status(401).json({ error: 'Invalid username or password.' });

        return res.json({ message: 'Login successful!', data: parseStoredData(userRow.rawData) });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Database error.' });
    }
}
