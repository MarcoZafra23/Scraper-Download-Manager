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

- [ ] Phase 1: Project Setup & Foundation ✓
- [ ] Phase 2: Content Detection & UI Injection
- [ ] Phase 3: Download Queue & Service Worker
- [ ] Phase 4: Popup UI & Download Manager Dashboard
- [ ] Phase 5: Advanced Features & Polish
- [ ] Phase 6: Testing, Optimization & Release

## Current Status

**Phase 1 Complete** - Foundation and file structure set up.

## Next Steps

- Implement media detection (images and videos)
- Create download button injection
- Build core download queue system

## License

MIT
