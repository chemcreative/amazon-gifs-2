# 🎉 Amazon Party GIF Display

A live-updating website that displays GIF files from a Google Drive folder. The site automatically refreshes every 5 seconds to show new GIFs as they're added to the folder.

## 🏗️ Architecture

- **Frontend**: HTML/CSS/JavaScript (responsive design)
- **Backend**: Node.js + Express server
- **Storage**: Google Drive
- **API**: Google Drive API
- **Deployment**: Heroku

## ✨ Features

### Core Features
- 🔄 Auto-refresh every 10 seconds without interrupting GIF playback
- 📱 Responsive design for all devices
- 🎨 Clean black background with minimal design
- 🚫 Graceful error handling with smart URL fallbacks
- 📶 Offline/online detection

### 🎯 Instagram Integration (OPTIMIZED!)
- ⚡ **Auto-Convert on Upload**: Automatically converts new GIFs to MP4 format within 1 minute
- 📥 **Instant Download**: All displayed GIFs have MP4s ready for immediate download
- 🎬 **Optimized Output**: MP4s optimized for Instagram (30fps, yuv420p, even dimensions)
- 🔄 **Smart Processing**: Only shows GIFs once MP4 conversion is complete
- 📱 **Zero Wait Time**: Click download and get your file instantly
- 🚀 **Background Processing**: New GIFs are converted automatically in the background

## 🚀 Quick Start

### Prerequisites (Pablo's Tasks)

1. **Google Drive Setup**:
   - Create a folder in Google Drive
   - Upload test GIF files
   - Note the folder ID from the URL

2. **Google Cloud Setup**:
   - Create a Google Cloud project
   - Enable Google Drive API
   - Create a Service Account
   - Download the JSON credentials file
   - Share the Drive folder with the service account email

### Local Development

1. **Clone and Install**:
   ```bash
   git clone <your-repo-url>
   cd AmazonPartyGif
   npm install
   ```

2. **Environment Setup**:
   Create a `.env` file (copy from `env.example`):
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your credentials:
   ```env
   GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
   GOOGLE_DRIVE_FOLDER_ID=your-folder-id-here
   GOOGLE_DRIVE_MP4_FOLDER_ID=your-mp4-folder-id-here
   PORT=3000
   ```

3. **Run Locally**:
   ```bash
   npm start
   # or for development with auto-restart:
   npm run dev
   ```

4. **Open Browser**:
   Visit `http://localhost:3000`

### Heroku Deployment

1. **Create Heroku App**:
   ```bash
   heroku create your-app-name
   ```

2. **Set Environment Variables**:
   ```bash
   heroku config:set GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project-id",...}'
   heroku config:set GOOGLE_DRIVE_FOLDER_ID=your-folder-id-here
   ```

3. **Deploy**:
   ```bash
   git add .
   git commit -m "Initial deployment"
   git push heroku main
   ```

4. **Open App**:
   ```bash
   heroku open
   ```

## 📁 Project Structure

```
AmazonPartyGif/
├── public/
│   ├── index.html      # Frontend HTML
│   ├── styles.css      # CSS styles
│   └── script.js       # JavaScript functionality
├── server.js           # Express server
├── package.json        # Node.js dependencies
├── Procfile           # Heroku process file
├── app.json           # Heroku app configuration
├── env.example        # Environment variables template
└── README.md          # This file
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | JSON string of service account credentials | `{"type":"service_account",...}` |
| `GOOGLE_DRIVE_FOLDER_ID` | ID of the Google Drive folder containing GIFs | `1ABC123def456GHI789jkl` |
| `GOOGLE_DRIVE_MP4_FOLDER_ID` | ID of the Google Drive folder for converted MP4s | `1XYZ789abc012DEF345ghi` |
| `PORT` | Server port (auto-set by Heroku) | `3000` |

### Google Drive Folder ID

To get your folder ID:
1. Open your Google Drive folder
2. Copy the ID from the URL: `https://drive.google.com/drive/folders/YOUR_FOLDER_ID`

## 🛠️ API Endpoints

### Core Endpoints
- `GET /` - Serve the frontend
- `GET /gifs` - Get list of GIFs that have MP4s ready for instant download
- `GET /status` - Get processing status (how many GIFs are ready vs processing)
- `GET /health` - Health check endpoint

### Legacy Conversion Endpoints
- `POST /convert/:gifId` - Convert specific GIF to MP4 format (rarely needed)
- `POST /convert-all` - Bulk convert all GIFs to MP4 format (rarely needed)

**Note**: With auto-conversion enabled, manual conversion endpoints are rarely needed as all new GIFs are processed automatically within 1 minute.

## 🎨 Customization

### Styling
Edit `public/styles.css` to customize the appearance:
- Colors and gradients
- Layout and spacing
- Animations and transitions
- Responsive breakpoints

### Refresh Interval
Change the refresh interval in `public/script.js`:
```javascript
const REFRESH_INTERVAL = 5000; // 5 seconds
```

### Grid Layout
Modify the CSS grid in `styles.css`:
```css
.gif-container {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}
```

## 🔍 Troubleshooting

### Common Issues

1. **No GIFs showing**:
   - Check if folder ID is correct
   - Ensure folder is shared with service account
   - Verify service account has proper permissions

2. **API errors**:
   - Check environment variables are set correctly
   - Verify Google Drive API is enabled
   - Check service account JSON is valid

3. **CORS issues**:
   - Server includes CORS headers
   - Check if frontend is served from same domain

### Debug Commands

```bash
# Check environment variables
heroku config

# View logs
heroku logs --tail

# Check health endpoint
curl https://your-app.herokuapp.com/health

# Test GIF endpoint
curl https://your-app.herokuapp.com/gifs
```

## 📱 Features in Detail

### Auto-Refresh
- Polls `/gifs` endpoint every 5 seconds
- Pauses when tab is not visible (performance optimization)
- Shows connection status

### UI/UX
- Responsive grid layout
- Smooth animations for new GIFs
- Loading states and error handling
- Manual controls for refresh and pause

### Error Handling
- Graceful degradation when API fails
- Fallback images for broken GIFs
- Network status detection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## 📄 License

MIT License - feel free to use and modify as needed!

## 🎯 Next Steps

- Add image optimization
- Implement caching
- Add GIF metadata display
- Create admin panel for folder management
- Add authentication for private folders 