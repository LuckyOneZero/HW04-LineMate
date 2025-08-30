require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const GoogleSheetsService = require('./services/googleSheets');

const app = express();
const PORT = process.env.PORT || 3000;

// LINE Bot configuration
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

// Create LINE SDK client
const client = new line.Client(config);

// Initialize Google Sheets service
const sheetsService = new GoogleSheetsService();

// Middleware to parse LINE webhook events
app.use('/webhook', line.middleware(config));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'LineMate Bot is running!',
    timestamp: new Date().toISOString()
  });
});

// Webhook endpoint for LINE Bot
app.post('/webhook', async (req, res) => {
  try {
    const events = req.body.events;
    
    // Process each event
    const promises = events.map(handleEvent);
    await Promise.all(promises);
    
    res.status(200).end();
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).end();
  }
});

// Handle LINE Bot events
async function handleEvent(event) {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  // Only handle message events with text
  if (event.type !== 'message' || event.message.type !== 'text') {
    console.log('Ignoring non-text message event');
    return null;
  }

  const { message, source, timestamp } = event;
  const userId = source.userId;
  const messageText = message.text;

  try {
    // Save message to Google Sheets
    await sheetsService.appendMessage(messageText, userId, timestamp);
    
    // Reply to user
    const replyMessage = {
      type: 'text',
      text: `✅ 訊息已儲存！\n收到內容：${messageText}`
    };

    await client.replyMessage(event.replyToken, replyMessage);
    console.log(`Message saved and replied to user ${userId}`);
    
  } catch (error) {
    console.error('Error processing message:', error);
    
    // Send error message to user
    const errorMessage = {
      type: 'text',
      text: '❌ 抱歉，儲存訊息時發生錯誤，請稍後再試。'
    };
    
    try {
      await client.replyMessage(event.replyToken, errorMessage);
    } catch (replyError) {
      console.error('Failed to send error reply:', replyError);
    }
  }
}

// Initialize services and start server
async function startServer() {
  try {
    // Initialize Google Sheets service
    await sheetsService.initialize();
    
    // Start the Express server
    app.listen(PORT, () => {
      console.log(`LineMate Bot server is running on port ${PORT}`);
      console.log(`Webhook URL: http://localhost:${PORT}/webhook`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Start the application
startServer();