// Global variables
let refreshInterval;
let currentGifs = new Map(); // Track current GIFs by ID
const REFRESH_INTERVAL = 10000; // 10 seconds for background refresh

// DOM elements
const gifContainer = document.getElementById('gif-container');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    startBackgroundRefresh();
    loadGifs(); // Initial load
});

// Start background refresh
function startBackgroundRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    refreshInterval = setInterval(() => {
        loadGifsInBackground();
    }, REFRESH_INTERVAL);
}

// Load GIFs from the server (initial load)
async function loadGifs() {
    try {
        const apiUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:3000/gifs' 
            : '/gifs';
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
            return;
        }
        
        const data = await response.json();
        
        if (data.error) {
            console.error('API Error:', data.error);
            return;
        }
        
        displayGifs(data.gifs || []);
        
    } catch (error) {
        console.error('Error loading GIFs:', error);
    }
}

// Load GIFs in background without interrupting playback
async function loadGifsInBackground() {
    try {
        const apiUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:3000/gifs' 
            : '/gifs';
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            console.error(`Background refresh failed: ${response.status}`);
            return;
        }
        
        const data = await response.json();
        
        if (data.error) {
            console.error('Background API Error:', data.error);
            return;
        }
        
        updateGifs(data.gifs || []);
        
    } catch (error) {
        console.error('Background refresh error:', error);
    }
}

// Smart update that only adds/removes changed GIFs
function updateGifs(newGifs) {
    const newGifMap = new Map();
    
    // Create map of new GIFs
    newGifs.forEach(gif => {
        newGifMap.set(gif.id, gif);
    });
    
    // Remove GIFs that are no longer in the list
    currentGifs.forEach((gif, id) => {
        if (!newGifMap.has(id)) {
            const element = document.querySelector(`[data-gif-id="${id}"]`);
            if (element) {
                element.remove();
            }
            currentGifs.delete(id);
        }
    });
    
    // Add new GIFs that aren't already displayed
    newGifs.forEach(gif => {
        if (!currentGifs.has(gif.id)) {
            const gifElement = createGifElement(gif);
            gifElement.classList.add('new');
            gifContainer.appendChild(gifElement);
            currentGifs.set(gif.id, gif);
            
            // Remove animation class after animation completes
            setTimeout(() => {
                gifElement.classList.remove('new');
            }, 500);
        }
    });
}

// Display GIFs (for initial load)
function displayGifs(gifs) {
    // Clear container and current map
    gifContainer.innerHTML = '';
    currentGifs.clear();
    
    // Add all GIFs
    gifs.forEach(gif => {
        const gifElement = createGifElement(gif);
        gifContainer.appendChild(gifElement);
        currentGifs.set(gif.id, gif);
    });
}

// Create a GIF element
function createGifElement(gif) {
    const gifItem = document.createElement('div');
    gifItem.className = 'gif-item';
    gifItem.setAttribute('data-gif-id', gif.id);
    
    // Create image container
    const imageContainer = document.createElement('div');
    imageContainer.className = 'gif-image-container';
    
    const img = document.createElement('img');
    img.src = gif.url;
    img.alt = gif.name;
    img.loading = 'lazy';
    
    // Ensure GIF displays properly
    img.style.pointerEvents = 'none'; // Prevent right-click saving
    
    // Handle image load success
    img.onload = () => {
        console.log(`GIF loaded successfully: ${gif.name}`);
    };
    
    // Handle image load errors with multiple fallback URLs
    let fallbackIndex = 0;
    const fallbackUrls = [
        `https://drive.google.com/thumbnail?id=${gif.id}&sz=w1000`,
        `https://lh3.googleusercontent.com/d/${gif.id}`,
        `https://drive.google.com/uc?export=view&id=${gif.id}`,
        `https://drive.google.com/uc?export=download&id=${gif.id}`,
        `https://drive.google.com/uc?id=${gif.id}`
    ];
    
    img.onerror = () => {
        console.log(`Failed to load GIF: ${gif.name} (attempt ${fallbackIndex + 1})`);
        
        fallbackIndex++;
        
        if (fallbackIndex < fallbackUrls.length) {
            console.log(`Trying fallback URL ${fallbackIndex + 1}: ${fallbackUrls[fallbackIndex]}`);
            img.src = fallbackUrls[fallbackIndex];
        } else {
            console.log(`All fallback URLs failed for: ${gif.name}`);
            gifItem.style.opacity = '0.3';
            setTimeout(() => {
                if (gifItem.parentNode) {
                    gifItem.remove();
                    currentGifs.delete(gif.id);
                }
            }, 3000);
        }
    };
    
    imageContainer.appendChild(img);
    
    // Create download overlay
    const downloadOverlay = document.createElement('div');
    downloadOverlay.className = 'download-overlay';
    
    // MP4 Download button
    const mp4Button = document.createElement('button');
    mp4Button.className = 'download-btn mp4-btn';
    mp4Button.innerHTML = '📱 Instagram';
    mp4Button.title = 'Download MP4 for Instagram';
    
    if (gif.mp4Available && gif.mp4Url) {
        mp4Button.onclick = (e) => {
            e.stopPropagation();
            downloadMp4(gif.mp4Url, gif.name.replace('.gif', '.mp4'));
        };
    } else {
        mp4Button.onclick = (e) => {
            e.stopPropagation();
            convertAndDownload(gif.id, gif.name);
        };
        mp4Button.classList.add('convert-needed');
        mp4Button.innerHTML = '⚡ Convert';
        mp4Button.title = 'Convert to MP4 for Instagram';
    }
    
    downloadOverlay.appendChild(mp4Button);
    
    // Add overlay to container
    imageContainer.appendChild(downloadOverlay);
    gifItem.appendChild(imageContainer);
    
    return gifItem;
}

// Handle visibility change (pause when tab is not visible to save resources)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
    } else {
        startBackgroundRefresh();
    }
});

// Download MP4 file
function downloadMp4(mp4Url, fileName) {
    console.log(`Downloading MP4: ${fileName}`);
    
    const link = document.createElement('a');
    link.href = mp4Url;
    link.download = fileName;
    link.target = '_blank';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show success message
    showNotification(`📱 Downloaded ${fileName} for Instagram!`, 'success');
}

// Convert GIF to MP4 and download
async function convertAndDownload(gifId, gifName) {
    const button = document.querySelector(`[data-gif-id="${gifId}"] .mp4-btn`);
    
    try {
        // Update button state
        button.innerHTML = '⏳ Converting...';
        button.disabled = true;
        
        const apiUrl = window.location.hostname === 'localhost' 
            ? `http://localhost:3000/convert/${gifId}` 
            : `/convert/${gifId}`;
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show conversion started message
            showNotification(`🔄 Converting ${gifName} to MP4...`, 'info');
            
            // Poll for completion
            pollForMp4Completion(gifId, gifName, button);
        } else {
            throw new Error(data.error || 'Conversion failed');
        }
        
    } catch (error) {
        console.error('Conversion error:', error);
        showNotification(`❌ Failed to convert ${gifName}`, 'error');
        
        // Reset button
        button.innerHTML = '⚡ Convert';
        button.disabled = false;
    }
}

// Poll for MP4 completion
async function pollForMp4Completion(gifId, gifName, button) {
    const maxAttempts = 30; // 5 minutes max
    let attempts = 0;
    
    const checkCompletion = async () => {
        attempts++;
        
        try {
            // Reload GIF data to check for MP4
            const apiUrl = window.location.hostname === 'localhost' 
                ? 'http://localhost:3000/gifs' 
                : '/gifs';
            
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            const updatedGif = data.gifs.find(gif => gif.id === gifId);
            
            if (updatedGif && updatedGif.mp4Available && updatedGif.mp4Url) {
                // Conversion completed!
                showNotification(`✅ ${gifName} converted successfully!`, 'success');
                
                // Update button to download
                button.innerHTML = '📱 Instagram';
                button.disabled = false;
                button.onclick = (e) => {
                    e.stopPropagation();
                    downloadMp4(updatedGif.mp4Url, gifName.replace('.gif', '.mp4'));
                };
                button.classList.remove('convert-needed');
                button.title = 'Download MP4 for Instagram';
                
                // Auto-download
                downloadMp4(updatedGif.mp4Url, gifName.replace('.gif', '.mp4'));
                
            } else if (attempts < maxAttempts) {
                // Continue polling
                setTimeout(checkCompletion, 10000); // Check every 10 seconds
                button.innerHTML = `⏳ Converting... (${Math.round(attempts * 10 / 60)}m)`;
            } else {
                // Timeout
                showNotification(`⏰ Conversion timeout for ${gifName}`, 'error');
                button.innerHTML = '⚡ Retry';
                button.disabled = false;
            }
            
        } catch (error) {
            console.error('Polling error:', error);
            if (attempts < maxAttempts) {
                setTimeout(checkCompletion, 10000);
            } else {
                button.innerHTML = '⚡ Retry';
                button.disabled = false;
            }
        }
    };
    
    // Start polling
    setTimeout(checkCompletion, 10000); // First check after 10 seconds
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Handle network status changes
window.addEventListener('online', () => {
    console.log('Connection restored');
    loadGifsInBackground();
});

window.addEventListener('offline', () => {
    console.log('Connection lost');
}); 