const { getUsers } = require('./_lib');
const bcrypt = require('bcrypt');

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });

    const users = await getUsers();
    if (!users) return res.status(500).json({ error: 'Database error.' });

    const user = users.find(u => u.username === username);
    if (!user) return res.status(401).json({ error: 'Invalid username or password.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid username or password.' });

    res.json({ message: 'Login successful!', data: user.data });
};
