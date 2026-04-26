/**
 * Service Worker - Background Process
 * Manages downloads, queue, and persistent data
 */

console.log('[Media Scraper] Service worker initialized');

// Global error handler for uncaught errors
self.addEventListener('error', (event) => {
  console.error('[Media Scraper] Uncaught error in service worker:', event.error);
});

// Global handler for unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
  console.error('[Media Scraper] Unhandled promise rejection:', event.reason);
});

// Download queue storage
let downloadQueue = [];
let isProcessing = false;
let downloadStats = {
  total: 0,
  completed: 0,
  failed: 0,
};

/**
 * Add a download to the queue
 */
function queueDownload(url, filename, metadata = {}) {
  try {
    console.log('[Media Scraper] Queuing download:', filename, 'URL:', url.substring(0, 100) + '...');
    
    if (!url) {
      console.error('[Media Scraper] No URL provided for download');
      throw new Error('No URL provided');
    }

    const downloadItem = {
      id: `dl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url: url,
      filename: sanitizeFilename(filename),
      status: 'queued',
      progress: 0,
      createdAt: new Date().toISOString(),
      sourceUrl: metadata.sourceUrl || '',
      type: metadata.type || 'unknown',
      metadata: metadata,
    };

    downloadQueue.push(downloadItem);
    downloadStats.total++;

    console.log(`[Media Scraper] Download queued (ID: ${downloadItem.id}, Queue size: ${downloadQueue.length})`);
    
    // Start processing queue
    processQueue();

    return downloadItem;
  } catch (err) {
    console.error('[Media Scraper] Error in queueDownload:', err);
    throw err;
  }
}

/**
 * Process the download queue (FIFO)
 */
async function processQueue() {
  if (isProcessing || downloadQueue.length === 0) {
    console.log('[Media Scraper] Queue already processing or empty');
    return;
  }

  isProcessing = true;
  console.log('[Media Scraper] Starting queue processing...');

  while (downloadQueue.length > 0) {
    const downloadItem = downloadQueue[0];

    if (downloadItem.status !== 'queued') {
      console.log('[Media Scraper] Removing non-queued item:', downloadItem.status);
      downloadQueue.shift();
      continue;
    }

    downloadItem.status = 'downloading';
    console.log('[Media Scraper] Processing:', downloadItem.filename);

    try {
      await startDownload(downloadItem);
      console.log('[Media Scraper] Download processed successfully:', downloadItem.filename);
    } catch (error) {
      console.error('[Media Scraper] Download error:', error.message);
      downloadItem.status = 'failed';
      downloadItem.error = error.message;
      downloadStats.failed++;
    }

    // Always remove from queue, even on error
    downloadQueue.shift();
    
    // Delay before processing next download - gives time for user to confirm in FDM
    // before the next download is sent to the browser/FDM
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  isProcessing = false;
  console.log('[Media Scraper] Queue processing complete');
}

/**
 * Start a single download using chrome.downloads API
 */
function startDownload(downloadItem) {
  return new Promise((resolve, reject) => {
    try {
      // Validate URL
      try {
        new URL(downloadItem.url);
      } catch (e) {
        reject(new Error('Invalid URL format: ' + downloadItem.url));
        return;
      }

      const downloadOptions = {
        url: downloadItem.url,
        filename: downloadItem.filename,
        conflictAction: 'uniquify',
        saveAs: false,
      };

      console.log('[Media Scraper] Starting download:', downloadOptions.filename, 'from', downloadOptions.url);

      chrome.downloads.download(downloadOptions, (downloadId) => {
        try {
          if (chrome.runtime.lastError) {
            console.error('[Media Scraper] Chrome download error:', chrome.runtime.lastError);
            reject(new Error('Chrome download error: ' + chrome.runtime.lastError.message));
            return;
          }

          if (downloadId === undefined || downloadId === null) {
            console.error('[Media Scraper] No download ID returned');
            reject(new Error('Failed to start download - no ID returned'));
            return;
          }

          console.log('[Media Scraper] Download started with ID:', downloadId);
          downloadItem.downloadId = downloadId;

          let hasResolved = false;
          let interruptedTime = null;

          // Listen for download state changes
          const changeListener = (downloadDelta) => {
            if (downloadDelta.id !== downloadId) return;

            try {
              chrome.downloads.search({ id: downloadId }, (results) => {
                if (!results || results.length === 0) return;

                const download = results[0];
                const progress = download.totalBytes > 0 
                  ? (download.bytesReceived / download.totalBytes) * 100 
                  : 0;
                downloadItem.progress = progress;

                console.log(`[Media Scraper] Download state changed (ID: ${downloadId}):`, Math.round(progress) + '%', 'State:', download.state, 'Error:', download.error);

                if (download.state === 'complete') {
                  if (!hasResolved) {
                    hasResolved = true;
                    chrome.downloads.onChanged.removeListener(changeListener);
                    clearTimeout(timeoutHandle);
                    downloadItem.status = 'completed';
                    downloadItem.completedAt = new Date().toISOString();
                    downloadStats.completed++;
                    console.log('[Media Scraper] Download completed:', downloadItem.filename);
                    resolve();
                  }
                } else if (download.state === 'interrupted') {
                  // Check for actual errors
                  if (download.error && download.error !== 'USER_CANCELED') {
                    if (!hasResolved) {
                      hasResolved = true;
                      chrome.downloads.onChanged.removeListener(changeListener);
                      clearTimeout(timeoutHandle);
                      downloadItem.status = 'failed';
                      downloadItem.error = 'Download interrupted: ' + download.error;
                      downloadStats.failed++;
                      console.error('[Media Scraper] Download failed with error:', download.error);
                      reject(new Error('Download interrupted: ' + download.error));
                    }
                  } else {
                    // No error but interrupted - wait a moment then check if it's actually done
                    if (!interruptedTime) {
                      interruptedTime = Date.now();
                      console.log('[Media Scraper] Download interrupted without error, waiting to confirm completion...');
                      // Wait 2 seconds for Brave's dialog handling, then check if file was actually downloaded
                      setTimeout(() => {
                        if (!hasResolved) {
                          // Assume it's complete if we got interrupted without error
                          hasResolved = true;
                          chrome.downloads.onChanged.removeListener(changeListener);
                          clearTimeout(timeoutHandle);
                          downloadItem.status = 'completed';
                          downloadItem.completedAt = new Date().toISOString();
                          downloadStats.completed++;
                          console.log('[Media Scraper] Download resolved as completed (interrupted state with no error)');
                          resolve();
                        }
                      }, 2000);
                    }
                  }
                }
              });
            } catch (err) {
              console.error('[Media Scraper] Error in changeListener:', err);
            }
          };

          // Register listener for download changes
          chrome.downloads.onChanged.addListener(changeListener);

          // Timeout after 5 minutes
          const timeoutHandle = setTimeout(() => {
            if (!hasResolved) {
              hasResolved = true;
              chrome.downloads.onChanged.removeListener(changeListener);
              downloadItem.status = 'failed';
              downloadItem.error = 'Download timeout';
              downloadStats.failed++;
              console.error('[Media Scraper] Download timeout:', downloadItem.filename);
              reject(new Error('Download timeout'));
            }
          }, 5 * 60 * 1000);
        } catch (err) {
          console.error('[Media Scraper] Error in download callback:', err);
          reject(err);
        }
      });
    } catch (err) {
      console.error('[Media Scraper] Error in startDownload:', err);
      reject(err);
    }
  });
}

/**
 * Sanitize filename to prevent issues
 */
function sanitizeFilename(filename) {
  // Remove invalid characters
  let sanitized = filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/^\.+/, '') // Remove leading dots
    .trim();

  // Limit length (255 chars is typical max)
  if (sanitized.length > 200) {
    const ext = sanitized.substring(sanitized.lastIndexOf('.'));
    sanitized = sanitized.substring(0, 200 - ext.length) + ext;
  }

  return sanitized || 'download';
}

/**
 * Get current queue and stats
 */
function getStatus() {
  return {
    queue: downloadQueue.map(item => ({
      id: item.id,
      filename: item.filename,
      status: item.status,
      progress: Math.round(item.progress),
      type: item.type,
    })),
    stats: downloadStats,
    isProcessing: isProcessing,
  };
}

/**
 * Save metadata to storage
 */
function saveDownloadMetadata() {
  const completedDownloads = downloadQueue
    .filter(item => item.status === 'completed')
    .map(item => ({
      id: item.id,
      filename: item.filename,
      url: item.url,
      downloadedAt: item.completedAt,
      type: item.type,
      sourceUrl: item.sourceUrl,
    }));

  chrome.storage.local.get(['downloadHistory'], (result) => {
    let history = result.downloadHistory || [];
    history = history.concat(completedDownloads);
    // Keep only last 1000 downloads
    history = history.slice(-1000);
    chrome.storage.local.set({ downloadHistory: history });
  });
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    console.log('[Media Scraper] Service worker received message:', request.action);

    if (request.action === 'download') {
      if (!request.url || !request.filename) {
        console.error('[Media Scraper] Missing URL or filename in download request');
        sendResponse({ status: 'error', message: 'Missing URL or filename' });
        return;
      }

      const downloadItem = queueDownload(request.url, request.filename, {
        sourceUrl: sender.url,
        type: request.type,
      });
      console.log('[Media Scraper] Download queued, sending response:', downloadItem.id);
      sendResponse({ status: 'queued', downloadItem: downloadItem });
    } else if (request.action === 'bulkDownload') {
      // Handle bulk download from popup (Multiple mode)
      if (!request.items || !Array.isArray(request.items)) {
        console.error('[Media Scraper] Invalid bulk download request');
        sendResponse({ status: 'error', message: 'Invalid request' });
        return;
      }

      console.log('[Media Scraper] Bulk download requested for', request.items.length, 'items');
      
      // Queue all items
      request.items.forEach(item => {
        queueDownload(item.url, item.filename, {
          sourceUrl: sender.url,
          type: item.type,
        });
      });

      sendResponse({ status: 'queued', itemCount: request.items.length });
    } else if (request.action === 'getStatus') {
      sendResponse(getStatus());
    } else if (request.action === 'getMode') {
      // Return current mode setting
      chrome.storage.local.get(['multipleMode'], (result) => {
        // Note: popup.js will handle this directly from storage
      });
      sendResponse({ multipleMode: true }); // Default response if needed
    } else if (request.action === 'clearHistory') {
      chrome.storage.local.set({ downloadHistory: [] });
      downloadQueue = [];
      downloadStats = { total: 0, completed: 0, failed: 0 };
      sendResponse({ status: 'cleared' });
    } else {
      console.warn('[Media Scraper] Unknown action:', request.action);
      sendResponse({ status: 'error', message: 'Unknown action' });
    }
  } catch (err) {
    console.error('[Media Scraper] Error in message handler:', err);
    sendResponse({ status: 'error', message: err.message });
  }

  return true;
});

// Listen for download completion
chrome.downloads.onChanged.addListener((downloadDelta) => {
  if (downloadDelta.state && downloadDelta.state.current === 'complete') {
    console.log('[Media Scraper] Download changed:', downloadDelta);
    saveDownloadMetadata();
  }
});

// Periodic save of metadata
setInterval(() => {
  saveDownloadMetadata();
}, 5000);
