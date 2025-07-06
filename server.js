const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const gifConverter = require('./gif-converter');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Serve static files (for frontend)
app.use(express.static('public'));

// Google Drive API setup
let drive;

// Initialize Google Drive API
async function initializeGoogleDrive() {
  try {
    // Parse the service account credentials from environment variable
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');
    
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly']
    });

    drive = google.drive({ version: 'v3', auth });
    await gifConverter.initializeDriveForConverter(auth);
    console.log('Google Drive API initialized successfully');
  } catch (error) {
    console.error('Error initializing Google Drive API:', error);
    // For development, we'll continue without Drive API
    drive = null;
  }
}

// Helper function to get public URL for a file
function getPublicUrl(fileId) {
  // Use the thumbnail URL format which works reliably for GIF display
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
}

// Get GIFs endpoint
app.get('/gifs', async (req, res) => {
  try {
    if (!drive) {
      return res.status(500).json({ 
        error: 'Google Drive API not initialized',
        gifs: [] 
      });
    }

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    
    if (!folderId) {
      return res.status(400).json({ 
        error: 'GOOGLE_DRIVE_FOLDER_ID environment variable not set',
        gifs: [] 
      });
    }

    // List files in the specified folder
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/gif' and trashed=false`,
      fields: 'files(id, name, mimeType, webViewLink, webContentLink)',
      orderBy: 'createdTime desc'
    });

    const files = response.data.files || [];
    
    // Convert to public URLs and check for MP4 versions
    const mp4FolderId = process.env.GOOGLE_DRIVE_MP4_FOLDER_ID;
    const gifs = [];
    
    for (const file of files) {
      // Check if MP4 version exists
      const mp4FileId = await gifConverter.checkMp4Exists(file.name, mp4FolderId);
      
      // ONLY INCLUDE GIFS THAT HAVE MP4S READY
      if (mp4FileId) {
        const gifData = {
          id: file.id,
          name: file.name,
          url: getPublicUrl(file.id),
          webViewLink: file.webViewLink,
          mp4Available: true,
          mp4Url: gifConverter.getMp4PublicUrl(mp4FileId),
          mp4Id: mp4FileId
        };
        
        gifs.push(gifData);
      }
    }

    console.log(`Found ${gifs.length} GIFs with MP4s ready (${files.length} total GIFs in folder)`);
    res.json({ gifs });

  } catch (error) {
    console.error('Error fetching GIFs:', error);
    res.status(500).json({ 
      error: 'Failed to fetch GIFs from Google Drive',
      gifs: [] 
    });
  }
});

// Convert GIF to MP4 endpoint
app.post('/convert/:gifId', async (req, res) => {
  try {
    if (!drive) {
      return res.status(500).json({ 
        error: 'Google Drive API not initialized',
        success: false
      });
    }

    const { gifId } = req.params;
    const mp4FolderId = process.env.GOOGLE_DRIVE_MP4_FOLDER_ID;
    
    if (!mp4FolderId) {
      return res.status(400).json({ 
        error: 'MP4 folder ID not configured',
        success: false
      });
    }

    // Get GIF file details
    const gifResponse = await drive.files.get({
      fileId: gifId,
      fields: 'id, name'
    });

    const gifFileName = gifResponse.data.name;
    
    // Check if MP4 already exists
    const existingMp4Id = await gifConverter.checkMp4Exists(gifFileName, mp4FolderId);
    if (existingMp4Id) {
      return res.json({
        success: true,
        message: 'MP4 already exists',
        mp4Id: existingMp4Id,
        mp4Url: gifConverter.getMp4PublicUrl(existingMp4Id)
      });
    }

    // Start conversion (this runs in background)
    gifConverter.convertGifToMp4Complete(gifId, gifFileName, mp4FolderId)
      .then(mp4FileId => {
        console.log(`Background conversion completed for ${gifFileName}: ${mp4FileId}`);
      })
      .catch(error => {
        console.error(`Background conversion failed for ${gifFileName}:`, error);
      });

    res.json({
      success: true,
      message: 'Conversion started in background',
      gifId: gifId,
      gifFileName: gifFileName
    });

  } catch (error) {
    console.error('Error starting conversion:', error);
    res.status(500).json({ 
      error: 'Failed to start conversion',
      success: false
    });
  }
});

// Bulk convert all GIFs endpoint
app.post('/convert-all', async (req, res) => {
  try {
    if (!drive) {
      return res.status(500).json({ 
        error: 'Google Drive API not initialized',
        success: false
      });
    }

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const mp4FolderId = process.env.GOOGLE_DRIVE_MP4_FOLDER_ID;
    
    if (!mp4FolderId) {
      return res.status(400).json({ 
        error: 'MP4 folder ID not configured',
        success: false
      });
    }

    // Get all GIF files
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/gif' and trashed=false`,
      fields: 'files(id, name)',
      orderBy: 'createdTime desc'
    });

    const files = response.data.files || [];
    const conversionsStarted = [];

    // Start conversions for files that don't have MP4 versions
    for (const file of files) {
      const existingMp4Id = await gifConverter.checkMp4Exists(file.name, mp4FolderId);
      
      if (!existingMp4Id) {
        // Start conversion in background
        gifConverter.convertGifToMp4Complete(file.id, file.name, mp4FolderId)
          .then(mp4FileId => {
            console.log(`Background conversion completed for ${file.name}: ${mp4FileId}`);
          })
          .catch(error => {
            console.error(`Background conversion failed for ${file.name}:`, error);
          });
          
        conversionsStarted.push({
          gifId: file.id,
          gifName: file.name
        });
      }
    }

    res.json({
      success: true,
      message: `Started ${conversionsStarted.length} conversions in background`,
      conversionsStarted: conversionsStarted,
      totalGifs: files.length
    });

  } catch (error) {
    console.error('Error starting bulk conversion:', error);
    res.status(500).json({ 
      error: 'Failed to start bulk conversion',
      success: false
    });
  }
});

// Get processing status endpoint
app.get('/status', async (req, res) => {
  try {
    if (!drive) {
      return res.status(500).json({ 
        error: 'Google Drive API not initialized'
      });
    }

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const mp4FolderId = process.env.GOOGLE_DRIVE_MP4_FOLDER_ID;
    
    if (!folderId || !mp4FolderId) {
      return res.status(400).json({ 
        error: 'Folder IDs not configured'
      });
    }

    // Get all GIF files
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/gif' and trashed=false`,
      fields: 'files(id, name)',
      orderBy: 'createdTime desc'
    });

    const files = response.data.files || [];
    let readyCount = 0;
    let processingCount = 0;
    
    // Check each GIF for MP4 version
    for (const file of files) {
      const mp4FileId = await gifConverter.checkMp4Exists(file.name, mp4FolderId);
      
      if (mp4FileId) {
        readyCount++;
      } else {
        processingCount++;
      }
    }

    res.json({
      totalGifs: files.length,
      readyForDisplay: readyCount,
      processing: processingCount,
      message: processingCount > 0 
        ? `${processingCount} GIF(s) are being converted and will appear soon`
        : 'All GIFs are ready for instant download!'
    });

  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ 
      error: 'Failed to get processing status'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    driveApiReady: !!drive
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Auto-conversion checker
async function checkForNewGifsToConvert() {
  try {
    if (!drive) return;
    
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const mp4FolderId = process.env.GOOGLE_DRIVE_MP4_FOLDER_ID;
    
    if (!mp4FolderId) return;
    
    // Get all GIF files
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/gif' and trashed=false`,
      fields: 'files(id, name)',
      orderBy: 'createdTime desc'
    });
    
    const files = response.data.files || [];
    
    // Check each GIF for MP4 version
    for (const file of files) {
      const existingMp4Id = await gifConverter.checkMp4Exists(file.name, mp4FolderId);
      
      if (!existingMp4Id) {
        console.log(`Auto-converting new GIF: ${file.name}`);
        
        // Start conversion in background
        gifConverter.convertGifToMp4Complete(file.id, file.name, mp4FolderId)
          .then(mp4FileId => {
            console.log(`Auto-conversion completed for ${file.name}: ${mp4FileId}`);
          })
          .catch(error => {
            console.error(`Auto-conversion failed for ${file.name}:`, error);
          });
      }
    }
    
  } catch (error) {
    console.error('Error in auto-conversion check:', error);
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initializeGoogleDrive();
  
  // Start auto-conversion checker (every 1 minute for faster processing)
  setInterval(checkForNewGifsToConvert, 1 * 60 * 1000);
  
  // Run initial check after 10 seconds
  setTimeout(checkForNewGifsToConvert, 10000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
}); 