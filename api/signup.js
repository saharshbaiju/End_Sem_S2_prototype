const { sheets, SPREADSHEET_ID, getUsers } = require('./_lib');
const bcrypt = require('bcrypt');

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });

    const users = await getUsers();
    if (!users) return res.status(500).json({ error: 'Database error.' });

    const existingUser = users.find(u => u.username === username);
    if (existingUser) return res.status(400).json({ error: 'Username already exists.' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:C',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[username, hashedPassword, JSON.stringify([])]]
            }
        });
        res.json({ message: 'Signup successful!', data: [] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create user.' });
    }
};
