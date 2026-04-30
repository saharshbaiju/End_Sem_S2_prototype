import { google } from 'googleapis';

const SHEET_RANGE = 'Sheet1!A:C';

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

export function getSheetsClient() {
  const clientEmail = getRequiredEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL').replace(/"/g, '');
  const privateKey = getRequiredEnv('GOOGLE_PRIVATE_KEY')
    .replace(/"/g, '')
    .replace(/\\n/g, '\n');
  const spreadsheetId = getRequiredEnv('GOOGLE_SHEET_ID');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const sheets = google.sheets({ version: 'v4', auth });

  return { sheets, spreadsheetId };
}

export async function getSheetRows() {
  const { sheets, spreadsheetId } = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: SHEET_RANGE
  });

  const rows = (response.data.values || []).map((row, index) => ({
    username: row[0] || '',
    passwordHash: row[1] || '',
    rawData: row[2] || '',
    rowNumber: index + 1
  }));

  return { sheets, spreadsheetId, rows };
}

export function findUserRow(rows, username) {
  return rows.find((row) => row.username === username) || null;
}

export function parseStoredData(rawData) {
  if (!rawData) return {};

  try {
    const parsed = JSON.parse(rawData);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function updateUserData(sheets, spreadsheetId, rowNumber, data) {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Sheet1!C${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[JSON.stringify(data)]] }
  });
}

export async function appendUser(sheets, spreadsheetId, username, passwordHash) {
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: SHEET_RANGE,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[username, passwordHash, JSON.stringify({})]] }
  });
}
