import bcrypt from 'bcryptjs';
import { findUserRow, getSheetRows, updateUserData } from './_lib/googleSheets.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { username, password, data } = req.body;
    if (!username || !password || typeof data !== 'object' || data === null) {
        return res.status(400).json({ error: 'Missing sync parameters.' });
    }

    try {
        const { sheets, spreadsheetId, rows } = await getSheetRows();
        const userRow = findUserRow(rows, username);
        if (!userRow) return res.status(401).json({ error: 'Authentication failed.' });

        const isMatch = await bcrypt.compare(password, userRow.passwordHash);
        if (!isMatch) return res.status(401).json({ error: 'Authentication failed.' });

        await updateUserData(sheets, spreadsheetId, userRow.rowNumber, data);
        return res.json({ message: 'Sync successful!' });
    } catch (err) {
        console.error('Sync error:', err);
        return res.status(500).json({ error: 'Failed to sync data.' });
    }
}
