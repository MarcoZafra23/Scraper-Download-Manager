/**
 * Popup Script - Multiple Mode UI
 */

console.log('[Media Scraper] Popup script loaded');

let multipleMode = false;
let queuedItems = new Map(); // mediaId -> { url, filename, type, thumbnail }

// DOM Elements
const multipleToggle = document.getElementById('multiple-toggle');
const toggleLabel = document.getElementById('toggle-label');
const queueList = document.getElementById('queue-list');
const queueCount = document.getElementById('queue-count');
const downloadBtn = document.getElementById('download-btn');
const statSelected = document.getElementById('stat-selected');
const statDownloaded = document.getElementById('stat-downloaded');

/**
 * Initialize popup
 */
function initPopup() {
  console.log('[Media Scraper] Initializing popup');
  
  // Load saved mode preference
  chrome.storage.local.get(['multipleMode', 'queuedItems', 'downloadStats'], (result) => {
    multipleMode = result.multipleMode || false;
    queuedItems = new Map(result.queuedItems || []);
    
    updateToggle();
    updateQueueDisplay();
    updateStats();
  });
  
  // Event listeners
  multipleToggle.addEventListener('change', toggleMultipleMode);
  downloadBtn.addEventListener('click', downloadAll);
}

/**
 * Toggle Multiple Mode
 */
function toggleMultipleMode(e) {
  multipleMode = e.target.checked;
  console.log('[Media Scraper] Multiple mode:', multipleMode ? 'ON' : 'OFF');
  
  // Save preference
  chrome.storage.local.set({ multipleMode });
  
  updateToggle();
  
  // Notify content script
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { 
        action: 'updateMode', 
        multipleMode: multipleMode 
      }).catch(() => {
        // Tab doesn't have content script, ignore
      });
    });
  });
}

/**
 * Update toggle UI
 */
function updateToggle() {
  multipleToggle.checked = multipleMode;
  toggleLabel.textContent = `Multiple Mode: ${multipleMode ? 'ON' : 'OFF'}`;
}

/**
 * Update queue display
 */
function updateQueueDisplay() {
  queueCount.textContent = queuedItems.size;
  
  if (queuedItems.size === 0) {
    queueList.innerHTML = '<p class="empty-message">No items selected. Click the button on images/videos to add them.</p>';
    downloadBtn.disabled = true;
    return;
  }
  
  downloadBtn.disabled = false;
  
  let html = '';
  let position = 1;
  
  queuedItems.forEach((item, mediaId) => {
    const badge = multipleMode ? position : '✓';
    const thumbnail = item.thumbnail ? `<img src="${item.thumbnail}" class="queue-thumbnail" alt="thumbnail">` : '<div class="queue-thumbnail" style="display: flex; align-items: center; justify-content: center; color: #999;">📄</div>';
    
    html += `
      <div class="queue-item">
        <div class="queue-badge">${badge}</div>
        ${thumbnail}
        <div class="queue-info">
          <div class="queue-filename" title="${item.filename}">${item.filename}</div>
          <div class="queue-type">${item.type}</div>
        </div>
        <button class="queue-delete" onclick="deleteQueueItem('${mediaId}')">✕</button>
      </div>
    `;
    
    position++;
  });
  
  queueList.innerHTML = html;
}

/**
 * Delete item from queue
 */
function deleteQueueItem(mediaId) {
  console.log('[Media Scraper] Deleting queue item:', mediaId);
  queuedItems.delete(mediaId);
  
  // Save to storage
  chrome.storage.local.set({ queuedItems: Array.from(queuedItems.entries()) });
  
  // Update UI
  updateQueueDisplay();
  updateStats();
  
  // Notify content script to update button state
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { 
        action: 'updateButtonState',
        removedMediaId: mediaId
      }).catch(() => {});
    });
  });
}

/**
 * Download all queued items
 */
function downloadAll() {
  if (queuedItems.size === 0) {
    console.warn('[Media Scraper] No items to download');
    return;
  }
  
  console.log('[Media Scraper] Starting bulk download for', queuedItems.size, 'items');
  
  const downloadRequests = Array.from(queuedItems.entries()).map(([mediaId, item]) => ({
    mediaId,
    url: item.url,
    filename: item.filename,
    type: item.type
  }));
  
  // Send all to service worker
  chrome.runtime.sendMessage({
    action: 'bulkDownload',
    items: downloadRequests
  }, (response) => {
    if (response && response.status === 'queued') {
      console.log('[Media Scraper] Bulk download queued:', downloadRequests.length, 'items');
      
      // Clear queue after sending
      queuedItems.clear();
      chrome.storage.local.set({ queuedItems: [] });
      
      updateQueueDisplay();
      updateStats();
      
      // Notify content script to clear button states
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { 
            action: 'clearAllStates'
          }).catch(() => {});
        });
      });
    }
  });
}

/**
 * Add item to queue (called from content script)
 */
function addToQueue(mediaId, url, filename, type, thumbnail) {
  console.log('[Media Scraper] Adding to queue:', filename);
  
  queuedItems.set(mediaId, {
    url,
    filename,
    type,
    thumbnail
  });
  
  // Save to storage
  chrome.storage.local.set({ queuedItems: Array.from(queuedItems.entries()) });
  
  updateQueueDisplay();
  updateStats();
}

/**
 * Update stats
 */
function updateStats() {
  statSelected.textContent = queuedItems.size;
  
  chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
    if (response && response.stats) {
      statDownloaded.textContent = response.stats.completed || 0;
    }
  });
}

/**
 * Listen for messages from content script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Media Scraper] Popup received message:', request.action);
  
  if (request.action === 'addToQueue') {
    // Reload from storage to ensure we have the latest data
    chrome.storage.local.get(['queuedItems'], (result) => {
      queuedItems = new Map(result.queuedItems || []);
      console.log('[Media Scraper] Reloaded queue from storage, size:', queuedItems.size);
      updateQueueDisplay();
      updateStats();
    });
  } else if (request.action === 'getMode') {
    sendResponse({ multipleMode });
  } else if (request.action === 'queueUpdated') {
    // Reload from storage
    chrome.storage.local.get(['queuedItems'], (result) => {
      queuedItems = new Map(result.queuedItems || []);
      updateQueueDisplay();
      updateStats();
    });
  }
  
  sendResponse({ status: 'received' });
});

// Initialize when popup opens
initPopup();

// Refresh stats every 2 seconds
setInterval(updateStats, 2000);
