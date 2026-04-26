/**
 * Storage Manager
 * Handles persistent storage of settings and download history
 */

/**
 * Get download history from storage
 */
function getDownloadHistory(callback) {
  chrome.storage.local.get(['downloadHistory'], (result) => {
    callback(result.downloadHistory || []);
  });
}

/**
 * Get specific download from history
 */
function getDownloadById(downloadId, callback) {
  getDownloadHistory((history) => {
    const download = history.find(item => item.id === downloadId);
    callback(download);
  });
}

/**
 * Add download to history
 */
function addToDownloadHistory(downloadData, callback) {
  getDownloadHistory((history) => {
    history.push({
      ...downloadData,
      addedAt: new Date().toISOString(),
    });

    // Keep only last 1000 downloads
    history = history.slice(-1000);

    chrome.storage.local.set({ downloadHistory: history }, () => {
      if (callback) callback();
    });
  });
}

/**
 * Clear download history
 */
function clearDownloadHistory(callback) {
  chrome.storage.local.set({ downloadHistory: [] }, () => {
    console.log('[Media Scraper] Download history cleared');
    if (callback) callback();
  });
}

/**
 * Get user settings
 */
function loadSettings(callback) {
  const defaultSettings = {
    autoOrganize: true,
    showNotifications: true,
    downloadFolder: 'media-scraper',
    organizeBy: 'type', // 'type', 'date', 'domain'
    maxConcurrentDownloads: 3,
  };

  chrome.storage.sync.get(defaultSettings, (result) => {
    callback(result);
  });
}

/**
 * Save user settings
 */
function saveSettings(settings, callback) {
  chrome.storage.sync.set(settings, () => {
    console.log('[Media Scraper] Settings saved:', settings);
    if (callback) callback();
  });
}

/**
 * Get a specific setting
 */
function getSetting(key, callback) {
  chrome.storage.sync.get([key], (result) => {
    callback(result[key]);
  });
}

/**
 * Save a specific setting
 */
function saveSetting(key, value, callback) {
  chrome.storage.sync.set({ [key]: value }, () => {
    if (callback) callback();
  });
}

/**
 * Get storage statistics
 */
function getStorageStats(callback) {
  chrome.storage.local.get(null, (items) => {
    let totalSize = 0;
    for (let key in items) {
      totalSize += JSON.stringify(items[key]).length;
    }

    chrome.storage.sync.get(null, (syncItems) => {
      for (let key in syncItems) {
        totalSize += JSON.stringify(syncItems[key]).length;
      }

      callback({
        totalSize: totalSize,
        sizeInMB: (totalSize / (1024 * 1024)).toFixed(2),
        itemCount: Object.keys(items).length + Object.keys(syncItems).length,
      });
    });
  });
}

/**
 * Export all data
 */
function exportAllData(callback) {
  chrome.storage.local.get(null, (localData) => {
    chrome.storage.sync.get(null, (syncData) => {
      callback({
        exportDate: new Date().toISOString(),
        local: localData,
        sync: syncData,
      });
    });
  });
}

/**
 * Import data
 */
function importData(data, callback) {
  if (data.local) {
    chrome.storage.local.set(data.local);
  }
  if (data.sync) {
    chrome.storage.sync.set(data.sync);
  }
  console.log('[Media Scraper] Data imported');
  if (callback) callback();
}

/**
 * Clear all extension data
 */
function clearAllData(callback) {
  chrome.storage.local.clear(() => {
    chrome.storage.sync.clear(() => {
      console.log('[Media Scraper] All data cleared');
      if (callback) callback();
    });
  });
}
