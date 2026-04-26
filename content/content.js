/**
 * Content Script - Main Entry Point with Multiple Mode Support
 * Injects download buttons and handles user interactions
 */

console.log('[Media Scraper] Content script loaded');

let multipleMode = false;
let selectedItems = new Set(); // Track selected mediaIds

/**
 * Get thumbnail from media element
 */
function getThumbnail(mediaData) {
  if (!mediaData.element) return null;
  
  const element = mediaData.element;
  
  // For img elements
  if (element.tagName === 'IMG') {
    return element.src;
  }
  
  // For picture elements, try to get img src
  const img = element.querySelector('img');
  if (img) {
    return img.src;
  }
  
  // For video elements
  if (element.tagName === 'VIDEO') {
    const poster = element.getAttribute('poster');
    if (poster) return poster;
  }
  
  return null;
}

/**
 * Create a download button element
 */
function createDownloadButton(mediaId, mediaData) {
  const button = document.createElement('button');
  button.className = 'media-scraper-download-btn';
  button.setAttribute('data-media-id', mediaId);
  button.setAttribute('title', `Download ${mediaData.type}`);
  button.innerHTML = mediaData.type === 'video' ? '🎬' : '🖼️';
  
  // Click handler
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    handleDownloadClick(mediaId, mediaData, button);
  });
  
  return button;
}

/**
 * Update button display based on mode and selection
 */
function updateButtonDisplay(button, mediaId) {
  const isSelected = selectedItems.has(mediaId);
  
  if (!isSelected) {
    button.innerHTML = button.getAttribute('data-type') === 'video' ? '🎬' : '🖼️';
  } else if (multipleMode) {
    // Show queue position
    const position = Array.from(selectedItems).indexOf(mediaId) + 1;
    button.innerHTML = position.toString();
    button.style.fontSize = '16px';
    button.style.fontWeight = 'bold';
  } else {
    // Show checkmark
    button.innerHTML = '✓';
    button.style.fontSize = '20px';
  }
}

/**
 * Inject download button as overlay on media element
 */
function injectButton(mediaId, mediaData) {
  const element = mediaData.element;
  
  if (!element || !element.parentElement) {
    console.warn(`[Media Scraper] Could not inject button for ${mediaId} - element not found`);
    return;
  }

  // Check if button already exists
  if (element.querySelector('.media-scraper-download-btn')) {
    return;
  }

  const button = createDownloadButton(mediaId, mediaData);
  button.setAttribute('data-type', mediaData.type);
  
  // For all media types, wrap element and position button absolutely
  if (!element.classList.contains('media-scraper-wrapped')) {
    const wrapper = document.createElement('div');
    wrapper.className = 'media-scraper-wrapper';
    
    // Copy relevant styles from parent
    element.parentElement.insertBefore(wrapper, element);
    wrapper.appendChild(element);
    element.classList.add('media-scraper-wrapped');
    
    // Set wrapper dimensions to match element
    wrapper.style.display = getComputedStyle(element).display;
    wrapper.style.width = element.offsetWidth > 0 ? element.offsetWidth + 'px' : 'auto';
    wrapper.style.height = element.offsetHeight > 0 ? element.offsetHeight + 'px' : 'auto';
  }
  
  // Add button to wrapper
  element.parentElement.appendChild(button);

  console.log(`[Media Scraper] Button injected for ${mediaId}`);
}

/**
 * Inject all buttons for detected media
 */
function injectAllButtons() {
  if (typeof MEDIA_STORE === 'undefined') {
    console.warn('[Media Scraper] MEDIA_STORE not available yet');
    return;
  }

  MEDIA_STORE.forEach((mediaData, mediaId) => {
    injectButton(mediaId, mediaData);
  });

  console.log(`[Media Scraper] Injected ${MEDIA_STORE.size} download buttons`);
}

/**
 * Handle download button click
 */
function handleDownloadClick(mediaId, mediaData, button) {
  try {
    console.log(`[Media Scraper] Download clicked for ${mediaId}`, mediaData);

    if (!button) {
      button = document.querySelector(`[data-media-id="${mediaId}"]`);
    }
    
    if (!button) {
      console.error(`[Media Scraper] Button not found for ${mediaId}`);
      return;
    }

    // Check if extension context is still valid
    if (!chrome.runtime || !chrome.runtime.id) {
      console.error('[Media Scraper] Extension context invalidated. Please reload the page.');
      button.setAttribute('data-state', 'error');
      const errorMsg = document.createElement('div');
      errorMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #ff4444; color: white; padding: 15px; border-radius: 5px; z-index: 10000; font-size: 14px;';
      errorMsg.textContent = 'Extension updated - please reload the page';
      document.body.appendChild(errorMsg);
      setTimeout(() => errorMsg.remove(), 5000);
      return;
    }

    // In Multiple mode, add to queue instead of downloading immediately
    if (multipleMode) {
      console.log('[Media Scraper] Multiple mode - adding to queue');
      selectedItems.add(mediaId);
      
      // Update button display
      updateButtonDisplay(button, mediaId);
      
      // Get thumbnail
      const thumbnail = getThumbnail(mediaData);
      
      // Store to chrome.storage directly so it persists even if popup is closed
      chrome.storage.local.get(['queuedItems'], (result) => {
        const queuedItems = new Map(result.queuedItems || []);
        queuedItems.set(mediaId, {
          url: mediaData.url,
          filename: mediaData.filename,
          type: mediaData.type,
          thumbnail: thumbnail
        });
        
        // Save to storage
        chrome.storage.local.set({ queuedItems: Array.from(queuedItems.entries()) }, () => {
          console.log('[Media Scraper] Item added to queue storage');
          
          // Also send message to popup if it's open
          chrome.runtime.sendMessage({
            action: 'addToQueue',
            mediaId: mediaId,
            url: mediaData.url,
            filename: mediaData.filename,
            type: mediaData.type,
            thumbnail: thumbnail
          }, (response) => {
            if (chrome.runtime.lastError) {
              // Popup probably not open, but item is stored so it will show when popup opens
              console.log('[Media Scraper] Popup not open, but item stored');
            }
          });
        });
      });
      
      return;
    }

    // Single mode - download immediately
    button.disabled = true;
    button.setAttribute('data-state', 'downloading');

    chrome.runtime.sendMessage(
      {
        action: 'download',
        mediaId: mediaId,
        url: mediaData.url,
        filename: mediaData.filename,
        type: mediaData.type,
        platform: mediaData.platform || null,
      },
      (response) => {
        try {
          console.log('[Media Scraper] Download response:', response);
          
          if (chrome.runtime.lastError) {
            console.error('[Media Scraper] Runtime error:', chrome.runtime.lastError);
            button.setAttribute('data-state', 'error');
            button.disabled = false;
            
            if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
              console.error('[Media Scraper] Extension was reloaded. Please reload the page.');
            }
            
            setTimeout(() => {
              button.removeAttribute('data-state');
            }, 3000);
            return;
          }

          if (response?.status === 'queued') {
            console.log(`[Media Scraper] Download queued: ${mediaData.filename}`);
            button.setAttribute('data-state', 'success');
            setTimeout(() => {
              button.disabled = false;
              button.removeAttribute('data-state');
            }, 2000);
          } else {
            console.error('[Media Scraper] Download failed - no queued status');
            button.setAttribute('data-state', 'error');
            button.disabled = false;
            setTimeout(() => {
              button.removeAttribute('data-state');
            }, 3000);
          }
        } catch (err) {
          console.error('[Media Scraper] Error in callback:', err);
          button.setAttribute('data-state', 'error');
          button.disabled = false;
        }
      }
    );
  } catch (err) {
    console.error('[Media Scraper] Fatal error in handleDownloadClick:', err);
    const button = document.querySelector(`[data-media-id="${mediaId}"]`);
    if (button) {
      button.setAttribute('data-state', 'error');
      button.disabled = false;
    }
  }
}

/**
 * Re-inject buttons when media is updated (dynamic content)
 */
window.addEventListener('mediaUpdated', () => {
  console.log('[Media Scraper] Updating buttons for newly detected media');
  injectAllButtons();
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[Media Scraper] DOM loaded, injecting buttons');
    // First, get the mode from popup
    chrome.runtime.sendMessage({ action: 'getMode' }, (response) => {
      multipleMode = response?.multipleMode || false;
      console.log('[Media Scraper] Mode from popup:', multipleMode ? 'Multiple' : 'Single');
      injectAllButtons();
    });
  });
} else {
  console.log('[Media Scraper] DOM already loaded, injecting buttons immediately');
  // Get mode first
  chrome.runtime.sendMessage({ action: 'getMode' }, (response) => {
    multipleMode = response?.multipleMode || false;
    console.log('[Media Scraper] Mode from popup:', multipleMode ? 'Multiple' : 'Single');
    injectAllButtons();
  });
}

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Media Scraper] Message received in content script:', request);
  
  if (request.action === 'refreshMedia') {
    console.log('[Media Scraper] Refreshing media detection');
    detectImages();
    detectVideos();
    injectAllButtons();
  } else if (request.action === 'updateMode') {
    console.log('[Media Scraper] Mode updated:', request.multipleMode ? 'Multiple' : 'Single');
    multipleMode = request.multipleMode;
    
    // Update all button displays
    selectedItems.forEach((mediaId) => {
      const button = document.querySelector(`[data-media-id="${mediaId}"]`);
      if (button) {
        updateButtonDisplay(button, mediaId);
      }
    });
  } else if (request.action === 'updateButtonState') {
    // Remove from selected items
    selectedItems.delete(request.removedMediaId);
    const button = document.querySelector(`[data-media-id="${request.removedMediaId}"]`);
    if (button) {
      button.innerHTML = button.getAttribute('data-type') === 'video' ? '🎬' : '🖼️';
    }
    
    // Re-number remaining items
    selectedItems.forEach((mediaId) => {
      const btn = document.querySelector(`[data-media-id="${mediaId}"]`);
      if (btn) {
        updateButtonDisplay(btn, mediaId);
      }
    });
  } else if (request.action === 'clearAllStates') {
    // Clear all selections
    selectedItems.clear();
    MEDIA_STORE.forEach((mediaData, mediaId) => {
      const btn = document.querySelector(`[data-media-id="${mediaId}"]`);
      if (btn) {
        btn.innerHTML = btn.getAttribute('data-type') === 'video' ? '🎬' : '🖼️';
      }
    });
  }
  
  sendResponse({ status: 'received' });
  return true;
});
