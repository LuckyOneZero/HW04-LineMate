const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

class WhisperService {
  constructor() {
    this.openai = null;
    this.tempDir = path.join(__dirname, '../temp');
  }

  async initialize() {
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is required');
      }

      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Create temp directory if it doesn't exist
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }

      console.log('Whisper service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Whisper service:', error);
      throw error;
    }
  }

  async downloadAudioFile(messageId, accessToken) {
    try {
      const response = await axios({
        method: 'get',
        url: `https://api-data.line.me/v2/bot/message/${messageId}/content`,
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        responseType: 'stream'
      });

      // Generate unique filename
      const filename = `audio_${messageId}_${Date.now()}.m4a`;
      const filepath = path.join(this.tempDir, filename);

      // Save audio file to temp directory
      const writer = fs.createWriteStream(filepath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(filepath));
        writer.on('error', reject);
      });
    } catch (error) {
      console.error('Error downloading audio file:', error);
      throw error;
    }
  }

  async transcribeAudio(audioFilePath) {
    try {
      if (!fs.existsSync(audioFilePath)) {
        throw new Error('Audio file not found');
      }

      console.log(`Transcribing audio file: ${audioFilePath}`);

      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(audioFilePath),
        model: 'whisper-1',
        language: 'zh', // Chinese support
        response_format: 'json'
      });

      console.log('Transcription completed successfully');
      return transcription.text;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw error;
    }
  }

  async processAudioMessage(messageId, accessToken) {
    let audioFilePath = null;
    
    try {
      // Download audio file
      console.log(`Processing audio message: ${messageId}`);
      audioFilePath = await this.downloadAudioFile(messageId, accessToken);
      
      // Transcribe audio
      const transcriptionText = await this.transcribeAudio(audioFilePath);
      
      return transcriptionText;
    } catch (error) {
      console.error('Error processing audio message:', error);
      throw error;
    } finally {
      // Clean up temporary file
      if (audioFilePath && fs.existsSync(audioFilePath)) {
        try {
          fs.unlinkSync(audioFilePath);
          console.log(`Cleaned up temporary file: ${audioFilePath}`);
        } catch (cleanupError) {
          console.error('Error cleaning up temporary file:', cleanupError);
        }
      }
    }
  }

  // Clean up old temp files (older than 1 hour)
  cleanupTempFiles() {
    try {
      if (!fs.existsSync(this.tempDir)) return;

      const files = fs.readdirSync(this.tempDir);
      const oneHourAgo = Date.now() - (60 * 60 * 1000);

      files.forEach(file => {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < oneHourAgo) {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up old temp file: ${file}`);
        }
      });
    } catch (error) {
      console.error('Error during temp file cleanup:', error);
    }
  }
}

module.exports = WhisperService;