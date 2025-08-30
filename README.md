# LineMate Bot

一個可以將 LINE 訊息儲存到 Google Sheets 的 LINE Bot。

## 功能特色

- 接收 LINE 訊息並自動儲存到指定的 Google Sheets
- 支援 Zeabur 一鍵部署
- 即時回覆確認訊息

## 設定步驟

### 1. LINE Bot 設定

1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 建立新的 Provider 和 Messaging API Channel
3. 取得以下資訊：
   - Channel Access Token
   - Channel Secret

### 2. Google Sheets 設定

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 啟用 Google Sheets API
4. 建立服務帳戶：
   - 前往 IAM & Admin > Service Accounts
   - 點擊 "Create Service Account"
   - 下載 JSON 金鑰檔案
5. 建立 Google Sheets 並將服務帳戶的 email 加入編輯權限

### 3. 本地開發設定

1. 複製環境變數檔案：
   ```bash
   cp .env.example .env
   ```

2. 編輯 `.env` 檔案，填入以下資訊：
   ```env
   CHANNEL_ACCESS_TOKEN=你的_LINE_Channel_Access_Token
   CHANNEL_SECRET=你的_LINE_Channel_Secret
   GOOGLE_SHEET_ID=你的_Google_Sheet_ID
   GOOGLE_SERVICE_ACCOUNT_KEY=你的_服務帳戶_JSON_金鑰
   PORT=3000
   ```

3. 安裝依賴：
   ```bash
   npm install
   ```

4. 啟動開發伺服器：
   ```bash
   npm run dev
   ```

### 4. Zeabur 部署

1. 將程式碼推送到 GitHub repository
2. 前往 [Zeabur](https://zeabur.com/)
3. 建立新專案並連接你的 GitHub repository
4. 在環境變數中設定：
   - `CHANNEL_ACCESS_TOKEN`
   - `CHANNEL_SECRET`
   - `GOOGLE_SHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_KEY`
5. 部署完成後，將 Webhook URL 設定到 LINE Bot 設定中

## Google Sheets 格式

Bot 會將訊息儲存到 Google Sheets 的以下欄位：
- Column A: 時間戳記 (ISO 格式)
- Column B: 用戶 ID
- Column C: 訊息內容

## 使用方式

1. 將 LINE Bot 加為好友
2. 傳送任何文字訊息
3. Bot 會回覆確認訊息並將內容儲存到 Google Sheets

## 技術架構

- **後端框架**: Express.js
- **LINE Bot SDK**: @line/bot-sdk
- **Google API**: googleapis
- **部署平台**: Zeabur

## 疑難排解

### 常見問題

1. **Google Sheets 寫入失敗**
   - 確認服務帳戶有 Google Sheets 的編輯權限
   - 檢查 GOOGLE_SERVICE_ACCOUNT_KEY 格式是否正確

2. **LINE Bot 無回應**
   - 確認 Webhook URL 設定正確
   - 檢查 CHANNEL_ACCESS_TOKEN 和 CHANNEL_SECRET

3. **部署失敗**
   - 確認所有環境變數都已設定
   - 檢查 Node.js 版本是否符合要求 (>=18.0.0)

## 開發

```bash
# 安裝依賴
npm install

# 啟動開發模式
npm run dev

# 啟動正式模式
npm start
```