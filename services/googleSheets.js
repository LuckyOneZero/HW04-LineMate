const { google } = require('googleapis');

class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.auth = null;
  }

  async initialize() {
    try {
      // Parse the service account key from environment variable
      let serviceAccountKey;
      const keyData = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      
      if (!keyData) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is required');
      }
      
      if (keyData.startsWith('{')) {
        // Direct JSON string
        serviceAccountKey = JSON.parse(keyData);
      } else {
        // Base64 encoded JSON
        try {
          const decodedKey = Buffer.from(keyData, 'base64').toString('utf-8');
          serviceAccountKey = JSON.parse(decodedKey);
        } catch (decodeError) {
          console.error('Failed to decode base64 key:', decodeError);
          throw new Error('Invalid base64 encoded service account key');
        }
      }
      
      // Create JWT auth client
      this.auth = new google.auth.JWT(
        serviceAccountKey.client_email,
        null,
        serviceAccountKey.private_key,
        ['https://www.googleapis.com/auth/spreadsheets']
      );

      // Initialize sheets API
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      console.log('Google Sheets service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Sheets service:', error);
      throw error;
    }
  }

  async appendMessage(message, userId, timestamp) {
    try {
      const values = [
        [
          new Date(timestamp).toISOString(),
          userId,
          message
        ]
      ];

      const request = {
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'Sheet1!A:C', // Assumes columns: Timestamp, User ID, Message
        valueInputOption: 'RAW',
        resource: {
          values: values
        }
      };

      const response = await this.sheets.spreadsheets.values.append(request);
      console.log('Message saved to Google Sheets:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error saving message to Google Sheets:', error);
      throw error;
    }
  }
}

module.exports = GoogleSheetsService;