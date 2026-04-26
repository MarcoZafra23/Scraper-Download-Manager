/**
 * Popup Script
 * Handles popup UI and communication with service worker
 */

console.log('[Media Scraper] Popup script loaded');

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.getAttribute('data-tab');
    switchTab(tabName);
  });
});

function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Deactivate all buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show selected tab
  document.getElementById(tabName + '-tab').classList.add('active');
  event.target.classList.add('active');
}

// Clear history button
document.getElementById('clear-history-btn').addEventListener('click', () => {
  if (confirm('Are you sure you want to clear download history?')) {
    chrome.runtime.sendMessage({ action: 'clearHistory' });
  }
});

// Initialize popup
function initPopup() {
  console.log('[Media Scraper] Initializing popup');
  // TODO: Load and display active downloads
  // TODO: Load and display history
  // TODO: Load and display settings
}

initPopup();
