const { google } = require('googleapis');

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
        console.error('Error fetching users:', err.message);
        return null;
    }
}

module.exports = { sheets, SPREADSHEET_ID, getUsers };
