# Image & Video Scraper - Download Manager

A powerful browser extension that automatically detects and downloads images and videos from web pages.

## Features

- 🖼️ Automatic image detection and download
- 🎬 Video detection and download support
- 📋 Download queue management
- 💾 Download history and metadata tracking
- ⚙️ Customizable settings
- 🌐 Works on Brave, Firefox, Chrome, and Edge
- 🚀 Lightweight and efficient

## Project Structure

```
extension/
├── manifest.json                 # Extension configuration
├── content/
│   ├── content.js               # Main content script
│   ├── detector.js              # Media detection logic
│   └── styles.css               # Content script styles
├── background/
│   ├── service-worker.js        # Background service worker
│   └── storage.js               # Storage and metadata management
├── popup/
│   ├── popup.html               # Popup UI
│   ├── popup.js                 # Popup logic
│   └── popup.css                # Popup styles
├── icons/
│   ├── icon-16.svg              # Small icon
│   ├── icon-48.svg              # Medium icon
│   └── icon-128.svg             # Large icon
└── README.md                     # This file
```

## Installation

### Brave/Chrome:
1. Go to `brave://extensions/` (or `chrome://extensions/`)
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select this extension folder

### Firefox:
1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `manifest.json` from this folder

## Development Phases

- [x] Phase 1: Project Setup & Foundation ✓
- [x] Phase 2: Content Detection & UI Injection ✓
- [x] Phase 3: Download Queue & Service Worker ✓
- [ ] Phase 4: Popup UI & Download Manager Dashboard
- [ ] Phase 5: Advanced Features & Polish
- [ ] Phase 6: Testing, Optimization & Release

## Current Status

**Phase 3 Complete** - Download queue and service worker fully implemented.

### Completed Features:

**Phase 1:**
- ✓ Project structure and file organization
- ✓ Manifest.json (Manifest V3)
- ✓ Extension icons (3 SVG sizes)
- ✓ Folder structure for scalability

**Phase 2:**
- ✓ Image detection (<img>, <picture>, background images)
- ✓ Video detection (<video>, YouTube, Vimeo)
- ✓ Dynamic content detection (Mutation Observer for lazy loading)
- ✓ Download button UI (circular, 32px, top-left overlay)
- ✓ Button state animations (downloading, success, error)
- ✓ Message passing to service worker

**Phase 3:**
- ✓ FIFO download queue system
- ✓ Chrome downloads API integration
- ✓ Download progress tracking (0-100%)
- ✓ Filename sanitization and conflict resolution
- ✓ Download metadata persistence
- ✓ Error handling and download state management
- ✓ Message handlers (download, getStatus, clearHistory)
- ✓ Periodic metadata auto-save (every 5 seconds)
- ✓ Download history storage (last 1000 downloads)
- ✓ Statistics tracking (total, completed, failed)
- ✓ Popup dashboard integration with real-time updates

## Next Steps

- Implement media detection (images and videos)
- Create download button injection
- Build core download queue system

## License

MIT
