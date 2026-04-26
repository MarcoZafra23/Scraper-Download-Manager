/**
 * Media Detector
 * Detects images and videos on the page
 */

console.log('[Media Scraper] Detector script loaded');

const MEDIA_STORE = new Map(); // Store detected media elements

/**
 * Find all images on the page
 * Includes: <img>, <picture>, background-images
 */
function detectImages() {
  console.log('[Media Scraper] Scanning for images...');

  // 1. Find all <img> elements
  document.querySelectorAll('img').forEach((img, index) => {
    const src = img.src || img.dataset.src;
    if (src && isValidUrl(src)) {
      const mediaId = `img-${Date.now()}-${index}`;
      MEDIA_STORE.set(mediaId, {
        type: 'image',
        url: src,
        element: img,
        filename: getFilenameFromUrl(src),
      });
      img.setAttribute('data-media-id', mediaId);
    }
  });

  // 2. Find all <picture> elements
  document.querySelectorAll('picture').forEach((picture, index) => {
    const sources = picture.querySelectorAll('source');
    sources.forEach((source, srcIndex) => {
      const src = source.srcset || source.src;
      if (src && isValidUrl(src)) {
        const mediaId = `picture-${Date.now()}-${index}-${srcIndex}`;
        MEDIA_STORE.set(mediaId, {
          type: 'image',
          url: src.split(' ')[0], // Handle srcset
          element: picture,
          filename: getFilenameFromUrl(src),
        });
        source.setAttribute('data-media-id', mediaId);
      }
    });
  });

  // 3. Find elements with background images
  document.querySelectorAll('[style*="background"]').forEach((el, index) => {
    const bgImage = window.getComputedStyle(el).backgroundImage;
    if (bgImage && bgImage !== 'none') {
      const urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
      if (urlMatch && urlMatch[1]) {
        const src = urlMatch[1];
        if (isValidUrl(src) && !MEDIA_STORE.has(el.getAttribute('data-media-id'))) {
          const mediaId = `bg-${Date.now()}-${index}`;
          MEDIA_STORE.set(mediaId, {
            type: 'image',
            url: src,
            element: el,
            filename: getFilenameFromUrl(src),
          });
          el.setAttribute('data-media-id', mediaId);
        }
      }
    }
  });

  console.log(`[Media Scraper] Found ${MEDIA_STORE.size} images`);
  return MEDIA_STORE;
}

/**
 * Find all videos on the page
 * Includes: <video> tags, YouTube, Vimeo, etc.
 */
function detectVideos() {
  console.log('[Media Scraper] Scanning for videos...');

  const initialCount = MEDIA_STORE.size;

  // 1. Find all <video> elements
  document.querySelectorAll('video').forEach((video, index) => {
    const sources = video.querySelectorAll('source');
    sources.forEach((source, srcIndex) => {
      const src = source.src;
      if (src && isValidUrl(src)) {
        const mediaId = `video-${Date.now()}-${index}-${srcIndex}`;
        MEDIA_STORE.set(mediaId, {
          type: 'video',
          url: src,
          element: video,
          filename: getFilenameFromUrl(src),
        });
        source.setAttribute('data-media-id', mediaId);
      }
    });

    // Also check video.src attribute
    if (video.src && isValidUrl(video.src)) {
      const mediaId = `video-attr-${Date.now()}-${index}`;
      MEDIA_STORE.set(mediaId, {
        type: 'video',
        url: video.src,
        element: video,
        filename: getFilenameFromUrl(video.src),
      });
      video.setAttribute('data-media-id', mediaId);
    }
  });

  // 2. Find YouTube iframes
  document.querySelectorAll('iframe[src*="youtube.com"], iframe[src*="youtu.be"]').forEach((iframe, index) => {
    const videoId = extractYouTubeVideoId(iframe.src);
    if (videoId) {
      const mediaId = `youtube-${Date.now()}-${index}`;
      MEDIA_STORE.set(mediaId, {
        type: 'video',
        platform: 'youtube',
        url: iframe.src,
        videoId: videoId,
        element: iframe,
        filename: `youtube-${videoId}.mp4`,
      });
      iframe.setAttribute('data-media-id', mediaId);
    }
  });

  // 3. Find Vimeo iframes
  document.querySelectorAll('iframe[src*="vimeo.com"]').forEach((iframe, index) => {
    const videoId = extractVimeoVideoId(iframe.src);
    if (videoId) {
      const mediaId = `vimeo-${Date.now()}-${index}`;
      MEDIA_STORE.set(mediaId, {
        type: 'video',
        platform: 'vimeo',
        url: iframe.src,
        videoId: videoId,
        element: iframe,
        filename: `vimeo-${videoId}.mp4`,
      });
      iframe.setAttribute('data-media-id', mediaId);
    }
  });

  console.log(`[Media Scraper] Found ${MEDIA_STORE.size - initialCount} videos`);
  return MEDIA_STORE;
}

/**
 * Watch for dynamically loaded media (lazy loading)
 */
function observeDynamicContent() {
  console.log('[Media Scraper] Setting up dynamic content observer...');

  const observerOptions = {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'data-src', 'srcset', 'style'],
  };

  const observer = new MutationObserver((mutations) => {
    let hasChanges = false;

    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        // New nodes added
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            if (node.matches('img, picture, video, iframe') || node.querySelector('img, picture, video, iframe')) {
              hasChanges = true;
            }
          }
        });
      } else if (mutation.type === 'attributes') {
        // Attributes changed (e.g., src loaded)
        const target = mutation.target;
        if (target.tagName === 'IMG' || target.tagName === 'VIDEO' || target.tagName === 'IFRAME') {
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      console.log('[Media Scraper] Detected new media, re-scanning...');
      // Debounce re-detection
      clearTimeout(window.mediaDetectTimeout);
      window.mediaDetectTimeout = setTimeout(() => {
        detectImages();
        detectVideos();
        window.dispatchEvent(new Event('mediaUpdated'));
      }, 500);
    }
  });

  observer.observe(document.body, observerOptions);
  console.log('[Media Scraper] Dynamic observer started');
}

/**
 * Utility: Check if URL is valid
 */
function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  // Filter out data URLs and common invalid patterns
  if (url.startsWith('data:') || url.startsWith('blob:') || url === '' || url === '#') {
    return false;
  }
  
  try {
    new URL(url, window.location.href);
    return true;
  } catch {
    return false;
  }
}

/**
 * Utility: Extract filename from URL
 */
function getFilenameFromUrl(url) {
  try {
    const urlObj = new URL(url, window.location.href);
    const pathname = urlObj.pathname;
    let filename = pathname.substring(pathname.lastIndexOf('/') + 1);
    
    // Clean filename of query parameters
    filename = filename.split('?')[0];
    filename = filename.split('#')[0];
    
    // If no filename or empty, try to generate from hostname or use timestamp
    if (!filename || filename.length === 0) {
      const hostname = urlObj.hostname.split('.')[0];
      filename = `${hostname}-${Date.now()}.jpg`;
      return filename;
    }
    
    // If filename has no extension, add .jpg (common for images)
    if (!filename.includes('.')) {
      filename = `${filename}.jpg`;
    }
    
    return filename || 'download.jpg';
  } catch {
    return `download-${Date.now()}.jpg`;
  }
}

/**
 * Utility: Extract YouTube video ID
 */
function extractYouTubeVideoId(url) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

/**
 * Utility: Extract Vimeo video ID
 */
function extractVimeoVideoId(url) {
  const regExp = /^.*vimeo.com\/(\d+)/;
  const match = url.match(regExp);
  return (match && match[1]) ? match[1] : null;
}

// Initialize detector
detectImages();
detectVideos();
observeDynamicContent();
