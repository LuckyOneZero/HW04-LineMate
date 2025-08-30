require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const GoogleSheetsService = require('./services/googleSheets');
const WhisperService = require('./services/whisperService');

const app = express();
const PORT = process.env.PORT || 3000;

// LINE Bot configuration
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

// Create LINE SDK client
const client = new line.Client(config);

// Initialize services
const sheetsService = new GoogleSheetsService();
const whisperService = new WhisperService();

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
  
  // Only handle message events
  if (event.type !== 'message') {
    console.log('Ignoring non-message event');
    return null;
  }

  // Handle different message types
  if (event.message.type === 'text') {
    return handleTextMessage(event);
  } else if (event.message.type === 'audio') {
    return handleAudioMessage(event);
  } else {
    console.log(`Unsupported message type: ${event.message.type}`);
    return null;
  }
}

// Handle text messages (existing functionality)
async function handleTextMessage(event) {

  const { message, source, timestamp } = event;
  const userId = source.userId;
  const messageText = message.text;

  try {
    // Save message to Google Sheets
    await sheetsService.appendMessage('text', messageText, userId, timestamp);
    
    // Reply to user
    const replyMessage = {
      type: 'text',
      text: `✅ 訊息已儲存！\n收到內容：${messageText}`
    };

    await client.replyMessage(event.replyToken, replyMessage);
    console.log(`Text message saved and replied to user ${userId}`);
    
  } catch (error) {
    console.error('Error processing text message:', error);
    
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

// Handle audio messages (new functionality)
async function handleAudioMessage(event) {
  const { message, source, timestamp } = event;
  const userId = source.userId;
  const messageId = message.id;

  try {
    // Send processing message to user
    const processingMessage = {
      type: 'text',
      text: '🎤 正在轉錄語音訊息，請稍候...'
    };
    await client.replyMessage(event.replyToken, processingMessage);

    // Process audio with Whisper
    const transcriptionText = await whisperService.processAudioMessage(
      messageId, 
      config.channelAccessToken
    );

    // Save transcription to Google Sheets
    await sheetsService.appendMessage('audio', transcriptionText, userId, timestamp);

    // Send transcription result to user
    const resultMessage = {
      type: 'text',
      text: `🎤 語音轉錄完成！\n\n📝 轉錄內容：\n${transcriptionText}\n\n✅ 已儲存至記錄表`
    };

    // Use push message since we already replied
    await client.pushMessage(userId, resultMessage);
    console.log(`Audio message transcribed and saved for user ${userId}`);

  } catch (error) {
    console.error('Error processing audio message:', error);
    
    // Send error message
    const errorMessage = {
      type: 'text',
      text: '❌ 語音轉錄發生錯誤，請稍後再試。可能原因：\n• 音檔格式不支援\n• 網路連線問題\n• 服務暫時不可用'
    };
    
    try {
      await client.pushMessage(userId, errorMessage);
    } catch (pushError) {
      console.error('Failed to send error message:', pushError);
    }
  }
}

// Initialize services and start server
async function startServer() {
  try {
    // Initialize services
    await sheetsService.initialize();
    await whisperService.initialize();
    
    // Setup cleanup interval for temp files (every hour)
    setInterval(() => {
      whisperService.cleanupTempFiles();
    }, 60 * 60 * 1000);
    
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