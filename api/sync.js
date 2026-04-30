const { sheets, SPREADSHEET_ID, getUsers } = require('./_lib');
const bcrypt = require('bcrypt');

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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
        res.status(500).json({ error: 'Failed to sync data.' });
    }
};
