const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const { google } = require('googleapis');

// Global variables for Drive API
let drive;

// Initialize Google Drive API for conversion module
async function initializeDriveForConverter(auth) {
  drive = google.drive({ version: 'v3', auth });
}

// Download GIF from Google Drive
async function downloadGif(fileId, outputPath) {
  try {
    const response = await drive.files.get({
      fileId: fileId,
      alt: 'media'
    }, { responseType: 'stream' });

    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('Error downloading GIF:', error);
    throw error;
  }
}

// Convert GIF to MP4 using ffmpeg
async function convertGifToMp4(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`Converting ${inputPath} to ${outputPath}`);
    
    ffmpeg(inputPath)
      .outputOptions([
        '-movflags', 'faststart',  // Optimize for web streaming
        '-pix_fmt', 'yuv420p',     // Instagram-compatible pixel format
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', // Ensure even dimensions
        '-r', '30',                // Frame rate
        '-crf', '23',              // Quality setting (lower = better quality)
        '-preset', 'medium'        // Encoding speed vs compression
      ])
      .output(outputPath)
      .on('start', (commandLine) => {
        console.log('FFmpeg process started:', commandLine);
      })
      .on('progress', (progress) => {
        console.log(`Conversion progress: ${progress.percent}%`);
      })
      .on('end', () => {
        console.log('Conversion completed successfully');
        resolve();
      })
      .on('error', (err) => {
        console.error('Conversion error:', err);
        reject(err);
      })
      .run();
  });
}

// Upload MP4 to Google Drive
async function uploadMp4ToDrive(filePath, fileName, folderId) {
  try {
    const fileMetadata = {
      name: fileName,
      parents: [folderId]
    };

    const media = {
      mimeType: 'video/mp4',
      body: fs.createReadStream(filePath)
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id'
    });

    console.log(`MP4 uploaded with ID: ${response.data.id}`);
    return response.data.id;
  } catch (error) {
    console.error('Error uploading MP4:', error);
    throw error;
  }
}

// Clean up temporary files
async function cleanupTempFiles(files) {
  for (const file of files) {
    try {
      await fs.remove(file);
      console.log(`Cleaned up temp file: ${file}`);
    } catch (error) {
      console.error(`Error cleaning up ${file}:`, error);
    }
  }
}

// Main conversion function
async function convertGifToMp4Complete(gifFileId, gifFileName, mp4FolderId) {
  const tempDir = path.join(__dirname, 'temp');
  const gifPath = path.join(tempDir, `${gifFileId}.gif`);
  const mp4Path = path.join(tempDir, `${gifFileId}.mp4`);
  
  try {
    // Ensure temp directory exists
    await fs.ensureDir(tempDir);
    
    console.log(`Starting conversion for ${gifFileName} (ID: ${gifFileId})`);
    
    // Step 1: Download GIF from Google Drive
    console.log('Step 1: Downloading GIF...');
    await downloadGif(gifFileId, gifPath);
    
    // Step 2: Convert GIF to MP4
    console.log('Step 2: Converting to MP4...');
    await convertGifToMp4(gifPath, mp4Path);
    
    // Step 3: Upload MP4 to Google Drive
    console.log('Step 3: Uploading MP4...');
    const mp4FileName = gifFileName.replace('.gif', '.mp4');
    const mp4FileId = await uploadMp4ToDrive(mp4Path, mp4FileName, mp4FolderId);
    
    // Step 4: Clean up temporary files
    console.log('Step 4: Cleaning up...');
    await cleanupTempFiles([gifPath, mp4Path]);
    
    console.log(`Conversion completed! MP4 ID: ${mp4FileId}`);
    return mp4FileId;
    
  } catch (error) {
    console.error('Conversion process failed:', error);
    
    // Clean up any remaining temp files
    await cleanupTempFiles([gifPath, mp4Path]);
    
    throw error;
  }
}

// Helper function to get MP4 public URL
function getMp4PublicUrl(fileId) {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

// Check if MP4 version exists for a GIF
async function checkMp4Exists(gifFileName, mp4FolderId) {
  try {
    const mp4FileName = gifFileName.replace('.gif', '.mp4');
    
    const response = await drive.files.list({
      q: `'${mp4FolderId}' in parents and name='${mp4FileName}' and trashed=false`,
      fields: 'files(id, name)'
    });
    
    const files = response.data.files || [];
    return files.length > 0 ? files[0].id : null;
  } catch (error) {
    console.error('Error checking MP4 existence:', error);
    return null;
  }
}

module.exports = {
  initializeDriveForConverter,
  convertGifToMp4Complete,
  getMp4PublicUrl,
  checkMp4Exists
}; 