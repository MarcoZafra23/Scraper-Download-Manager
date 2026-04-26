/**
 * Service Worker - Background Process
 * Manages downloads, queue, and persistent data
 */

console.log('[Media Scraper] Service worker initialized');

// Download queue storage
let downloadQueue = [];
let isProcessing = false;

/**
 * Add a download to the queue
 */
function queueDownload(url, filename) {
  console.log('[Media Scraper] Queuing download:', url);
  // TODO: Implement queue logic
}

/**
 * Process the download queue
 */
async function processQueue() {
  console.log('[Media Scraper] Processing queue');
  // TODO: Implement queue processing
}

/**
 * Handle download completion
 */
function handleDownloadComplete(downloadItem) {
  console.log('[Media Scraper] Download completed:', downloadItem);
  // TODO: Update metadata and UI
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Media Scraper] Service worker received message:', request);
  
  if (request.action === 'download') {
    queueDownload(request.url, request.filename);
    sendResponse({ status: 'queued' });
  }
  
  return true;
});

// Listen for download completion
chrome.downloads.onChanged.addListener((downloadDelta) => {
  console.log('[Media Scraper] Download changed:', downloadDelta);
  // TODO: Handle download state changes
});
