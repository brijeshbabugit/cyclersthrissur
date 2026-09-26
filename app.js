/**
 * CYCLERS THRISSUR EVENTS - SINGLE PAGE APPLICATION (SPA)
 * Core Application Controller
 * Handles Google Sheets synchronization, Google Drive photo synchronization (EventList > EventPhotos > Event01),
 * dynamic column filtering, chronological date sorting, SPA view routing, and photo gallery lightbox.
 */

(() => {
  'use strict';

  // ==========================================================================
  // CONFIGURATION & CONSTANTS
  // ==========================================================================
  const GOOGLE_SHEET_ID = '1wmHbzg3cnkCNLcKLeZLU_IxzNZpbkxkAQ7pLu4FWBW8';
  const EVENT_SHEET_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Event`;
  const DISPLAY_SHEET_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=DisplayColumns`;
  const MANIFEST_URL = 'EventPhotos/manifest.json';
  const STORAGE_KEY_SCRIPT_URL = 'cyclers_thrissur_drive_script_url';
  
  // Default Google Apps Script Web App URL for Google Drive photo sync
  // (Paste your deployed Web App URL here or configure it in the in-app "Drive Photos" modal)
  const DEFAULT_APPS_SCRIPT_URL = '';

  // Verified Fallback Data (ensures 100% offline availability and instant preview)
  const FALLBACK_EVENTS = [
    {
      "S.No": "1",
      "Date": "26-09-2026",
      "Organizer": "Jubilee Mission ",
      "Contact Person": "Fiju",
      "Contribution": "5000",
      "Distance": "10",
      "List": "Y"
    },
    {
      "S.No": "2",
      "Date": "27-09-2026",
      "Organizer": "Hindu",
      "Contact Person": "Fiju",
      "Contribution": "5000",
      "Distance": "10",
      "List": "Y"
    }
  ];

  const FALLBACK_DISPLAY_COLUMNS = [
    { "ColumnName": "Date", "Display": "Y" },
    { "ColumnName": "Organizer", "Display": "Y" },
    { "ColumnName": "Contact Person", "Display": "N" },
    { "ColumnName": "Contribution", "Display": "N" },
    { "ColumnName": "Distance", "Display": "Y" }
  ];

  // Default fallback manifest if manifest.json or Drive cannot be fetched
  const DEFAULT_PHOTO_MANIFEST = {
    "Event01": {
      "title": "Jubilee Thrissur Cycling Rally",
      "folder": "EventPhotos/Event01",
      "photos": [
        {
          "file": "photo1.jpg",
          "title": "Morning Flag-Off & Peloton Assembly",
          "caption": "Enthusiastic cyclists gathered at the starting arch for the Jubilee Thrissur morning ride."
        },
        {
          "file": "photo2.jpg",
          "title": "Scenic Route Peloton Cruise",
          "caption": "Riders cruising smoothly along the palm-lined coastal road under the morning golden sun."
        },
        {
          "file": "photo3.jpg",
          "title": "Finish Line Victory & Celebration",
          "caption": "Celebrations, medals, and high spirits at the Thrissur Cycling Festival finish line."
        }
      ]
    },
    "Event02": {
      "title": "Hindu Thrissur Cycling Expedition",
      "folder": "EventPhotos/Event02",
      "photos": [
        {
          "file": "photo1.jpg",
          "title": "Thekkinkadu Maidan Morning Meetup",
          "caption": "Cyclists in club jerseys gathering around Swaraj Round and ancient banyan trees at dawn."
        },
        {
          "file": "photo2.jpg",
          "title": "Thrissur Highway & Bridge Peloton",
          "caption": "Speed peloton formation pacing across the scenic river bridge on National Highway 544."
        },
        {
          "file": "photo3.jpg",
          "title": "Post-Ride Celebration & Refreshment",
          "caption": "Cyclists enjoying breakfast, tender coconut, and camaraderie after completing the ride."
        }
      ]
    }
  };

  // Application State
  const state = {
    eventsRaw: [],
    eventsFiltered: [],
    displayColumns: [], // Array of column names where Display === 'Y'
    displayColumnsRaw: [],
    activeView: 'cards', // 'cards' | 'table'
    searchQuery: '',
    sortOption: 'date-asc', // 'date-asc' (chronological) | 'date-desc' | 'dist-desc' | 'org-asc'
    photoManifest: DEFAULT_PHOTO_MANIFEST,
    drivePhotosByEvent: {}, // Stores photos fetched from Google Drive per event key (e.g. 'Event01')
    driveFolderUrls: {},    // Stores Drive folder links per event
    appsScriptUrl: localStorage.getItem(STORAGE_KEY_SCRIPT_URL) || DEFAULT_APPS_SCRIPT_URL || '',
    currentDetailEvent: null,
    currentDetailPhotos: [],
    currentDetailSource: 'local', // 'drive' | 'manifest' | 'local'
    lightboxIndex: 0,
    isSheetLiveConnected: false,
    isDriveLiveConnected: false,
    userCustomPhotos: {} // Stores runtime user-added photos by event S.No
  };

  // DOM Elements Cache
  const elements = {
    // Views
    eventsView: document.getElementById('events-view'),
    detailsView: document.getElementById('details-view'),
    brandHomeBtn: document.getElementById('brand-home-btn'),
    
    // Header controls
    syncBadge: document.getElementById('sync-status-badge'),
    statusDot: document.getElementById('status-dot'),
    statusLabel: document.getElementById('status-label'),
    refreshBtn: document.getElementById('refresh-sheet-btn'),
    driveSettingsBtn: document.getElementById('drive-settings-btn'),
    driveSyncDot: document.getElementById('drive-sync-dot'),
    
    // Stats
    statTotalEvents: document.getElementById('stat-total-events'),
    statTotalDistance: document.getElementById('stat-total-distance'),
    statOrganizers: document.getElementById('stat-organizers'),
    statColumnsActive: document.getElementById('stat-columns-active'),
    activeColumnsPills: document.getElementById('active-columns-pills'),
    
    // Toolbar & Filters
    searchInput: document.getElementById('event-search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    sortSelect: document.getElementById('sort-select'),
    viewCardsBtn: document.getElementById('view-cards-btn'),
    viewTableBtn: document.getElementById('view-table-btn'),
    
    // Containers
    loadingSkeleton: document.getElementById('events-loading'),
    emptyState: document.getElementById('events-empty-state'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),
    cardsGrid: document.getElementById('events-cards-grid'),
    tableWrapper: document.getElementById('events-table-wrapper'),
    tableHead: document.getElementById('events-table-head'),
    tableBody: document.getElementById('events-table-body'),
    
    // Details View
    backToEventsBtn: document.getElementById('back-to-events-btn'),
    shareEventBtn: document.getElementById('share-event-btn'),
    detailSnoTag: document.getElementById('detail-sno-tag'),
    detailTitle: document.getElementById('detail-event-title'),
    detailSubtitle: document.getElementById('detail-event-subtitle'),
    detailKeyMetrics: document.getElementById('detail-key-metrics'),
    detailFolderPath: document.getElementById('detail-folder-path'),
    detailDriveFolderLink: document.getElementById('detail-drive-folder-link'),
    galleryFolderCode: document.getElementById('gallery-folder-code'),
    gallerySourceBadge: document.getElementById('gallery-source-badge'),
    gallerySourceLabel: document.getElementById('gallery-source-label'),
    specsGrid: document.getElementById('specs-grid'),
    galleryGrid: document.getElementById('gallery-grid'),
    photoCountBadge: document.getElementById('photo-count-badge'),
    localPhotoInput: document.getElementById('local-photo-input'),
    openDriveGuideBtn: document.getElementById('open-drive-guide-btn'),
    
    // Lightbox
    lightboxModal: document.getElementById('lightbox-modal'),
    lightboxBackdrop: document.getElementById('lightbox-backdrop'),
    lightboxImg: document.getElementById('lightbox-current-img'),
    lightboxTitle: document.getElementById('lightbox-title'),
    lightboxCounter: document.getElementById('lightbox-counter'),
    lightboxCaption: document.getElementById('lightbox-caption'),
    lightboxDriveLinkBtn: document.getElementById('lightbox-drive-link-btn'),
    lightboxPrevBtn: document.getElementById('lightbox-prev-btn'),
    lightboxNextBtn: document.getElementById('lightbox-next-btn'),
    lightboxCloseBtn: document.getElementById('lightbox-close-btn'),
    lightboxDownloadBtn: document.getElementById('lightbox-download-btn'),
    
    // Google Drive Modal
    driveModal: document.getElementById('drive-modal'),
    driveModalBackdrop: document.getElementById('drive-modal-backdrop'),
    driveModalCloseBtn: document.getElementById('drive-modal-close-btn'),
    closeDriveModalBtn: document.getElementById('close-drive-modal-btn'),
    appsScriptInput: document.getElementById('apps-script-input'),
    driveFolderIdInput: document.getElementById('drive-folder-id-input'),
    driveDiagnosticBox: document.getElementById('drive-diagnostic-box'),
    diagnosticBadge: document.getElementById('diagnostic-badge'),
    diagnosticOutput: document.getElementById('diagnostic-output'),
    saveTestDriveBtn: document.getElementById('save-test-drive-btn'),
    resetDriveDefaultBtn: document.getElementById('reset-drive-default-btn'),
    driveConnStatus: document.getElementById('drive-conn-status'),
    
    // Toast
    toastContainer: document.getElementById('toast-container')
  };

  // ==========================================================================
  // UTILITY FUNCTIONS
  // ==========================================================================

  /**
   * Normalize an event serial number or folder key to "Event01", "Event02", etc.
   */
  function formatFolderKey(sNo) {
    if (!sNo) return 'Event01';
    const num = parseInt(sNo, 10);
    const pad = isNaN(num) ? String(sNo).padStart(2, '0') : (num < 10 ? `0${num}` : String(num));
    return `Event${pad}`;
  }

  /**
   * Robust CSV parser supporting quotes and escaped commas.
   */
  function parseCSV(text) {
    if (!text || typeof text !== 'string') return { headers: [], rows: [] };
    const lines = text.trim().split(/\r?\n/);
    if (lines.length === 0) return { headers: [], rows: [] };

    function parseLine(line) {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    }

    const headers = parseLine(lines[0]).map(h => h.replace(/^["']|["']$/g, '').trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = parseLine(lines[i]).map(v => v.replace(/^["']|["']$/g, '').trim());
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] !== undefined ? values[idx] : '';
      });
      rows.push(row);
    }

    return { headers, rows };
  }

  /**
   * Smart Date Parser for DD-MM-YYYY, DD/MM/YYYY, or ISO formats.
   */
  function parseEventDate(dateStr) {
    if (!dateStr) return null;
    const str = String(dateStr).trim();

    // Check DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }

    // Check YYYY-MM-DD
    const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (ymdMatch) {
      const d = new Date(parseInt(ymdMatch[1], 10), parseInt(ymdMatch[2], 10) - 1, parseInt(ymdMatch[3], 10));
      return isNaN(d.getTime()) ? null : d;
    }

    const standard = new Date(str);
    return isNaN(standard.getTime()) ? null : standard;
  }

  /**
   * Format Date to standard human readable display: "26 Sep 2026 • Sat"
   */
  function formatDisplayDate(dateStr) {
    const d = parseEventDate(dateStr);
    if (!d) return dateStr || 'Date TBA';
    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    const weekday = d.toLocaleString('en-US', { weekday: 'short' });
    return `${day} ${month} ${year} • ${weekday}`;
  }

  /**
   * Show modern floating toast notification
   */
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'toast-success' : ''}`;
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${type === 'success' ? '#10B981' : '#FEE715'}" stroke-width="2.2">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
        <path d="m9 12 2 2 4-4"/>
      </svg>
      <span>${escapeHTML(message)}</span>
    `;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================================================
  // GOOGLE DRIVE PHOTOS SYNCHRONIZATION ENGINE
  // Hierarchy: Google Drive > EventList > EventPhotos > Event01, Event02, ...
  // ==========================================================================

  const STORAGE_KEY_FOLDER_ID = 'cyclers_thrissur_drive_folder_id';

  /**
   * Fetch live photo listings from Google Drive via Google Apps Script Web App
   */
  async function syncGoogleDrivePhotos() {
    const scriptUrl = state.appsScriptUrl || localStorage.getItem(STORAGE_KEY_SCRIPT_URL) || DEFAULT_APPS_SCRIPT_URL;
    const customFolderId = state.driveFolderId || localStorage.getItem(STORAGE_KEY_FOLDER_ID) || '';

    if (!scriptUrl) {
      // No custom Google Apps Script Web App configured yet
      state.isDriveLiveConnected = false;
      updateDriveStatusUI(false, 'Local Manifest Mode');
      return false;
    }

    try {
      let fetchUrl = scriptUrl.includes('?') 
        ? `${scriptUrl}&action=getAllEventsPhotos`
        : `${scriptUrl}?action=getAllEventsPhotos`;
      
      if (customFolderId) {
        fetchUrl += `&folderId=${encodeURIComponent(customFolderId)}`;
      }
      
      const resp = await fetch(fetchUrl, { method: 'GET', mode: 'cors' });
      if (!resp.ok) throw new Error(`Google Drive API HTTP ${resp.status}`);
      
      const data = await resp.json();
      if (data && data.status === 'success' && data.events) {
        state.drivePhotosByEvent = {};
        state.driveFolderUrls = {};

        Object.keys(data.events).forEach(key => {
          const eventInfo = data.events[key];
          const normalizedKey = formatFolderKey(key);
          
          if (eventInfo.folderUrl) {
            state.driveFolderUrls[normalizedKey] = eventInfo.folderUrl;
          }

          if (eventInfo.photos && Array.isArray(eventInfo.photos)) {
            state.drivePhotosByEvent[normalizedKey] = eventInfo.photos.map(p => ({
              url: p.url || p.thumbnailUrl || `https://lh3.googleusercontent.com/d/${p.id}`,
              thumbnailUrl: p.cardThumbnailUrl || p.thumbnailUrl || `https://drive.google.com/thumbnail?id=${p.id}&sz=w600`,
              title: p.title || p.name || `Photo - ${normalizedKey}`,
              caption: p.caption || p.description || `Google Drive photo: ${p.name}`,
              driveUrl: p.driveUrl || `https://drive.google.com/file/d/${p.id}/view`,
              source: 'Google Drive'
            }));
          }
        });

        state.isDriveLiveConnected = true;
        updateDriveStatusUI(true, 'Connected to Google Drive');
        return true;
      } else {
        throw new Error(data.message || 'Invalid Drive API response');
      }
    } catch (err) {
      console.warn('Google Drive photo sync notice:', err.message);
      state.isDriveLiveConnected = false;
      updateDriveStatusUI(false, 'Drive Sync Inactive (Using Local)');
      return false;
    }
  }

  function updateDriveStatusUI(isConnected, label) {
    if (elements.driveSyncDot) {
      elements.driveSyncDot.className = `drive-sync-dot ${isConnected ? '' : 'disconnected'}`;
      elements.driveSyncDot.title = label;
    }
    if (elements.driveConnStatus) {
      elements.driveConnStatus.className = `config-status-badge ${isConnected ? 'connected' : 'error'}`;
      elements.driveConnStatus.textContent = isConnected ? 'Connected (Live Drive)' : 'Local Fallback';
    }
  }

  /**
   * Resolves list of photos for an event, prioritizing Google Drive -> Manifest -> Local Probe
   */
  function getEventPhotos(sNo) {
    const folderKey = formatFolderKey(sNo);
    let photosList = [];
    let source = 'local';

    // 1. Check Google Drive live synchronized photos
    if (state.drivePhotosByEvent[folderKey] && state.drivePhotosByEvent[folderKey].length > 0) {
      photosList = state.drivePhotosByEvent[folderKey].map(p => ({ ...p }));
      source = 'drive';
    } 
    // 2. Check Photo Manifest
    else if (state.photoManifest[folderKey] && state.photoManifest[folderKey].photos && state.photoManifest[folderKey].photos.length > 0) {
      const manifestItem = state.photoManifest[folderKey];
      photosList = manifestItem.photos.map(p => ({
        url: `${manifestItem.folder}/${p.file}`,
        thumbnailUrl: `${manifestItem.folder}/${p.file}`,
        title: p.title || `Photo - Event ${sNo}`,
        caption: p.caption || `Captured during the ${state.currentDetailEvent ? state.currentDetailEvent.Organizer : ''} cycling expedition.`,
        source: 'manifest'
      }));
      source = 'manifest';
    } 
    // 3. Fallback probes
    else {
      photosList = [
        { url: `EventPhotos/${folderKey}/photo1.jpg`, thumbnailUrl: `EventPhotos/${folderKey}/photo1.jpg`, title: 'Event Assembly & Start', caption: 'Flag-off moments in Thrissur', source: 'local' },
        { url: `EventPhotos/${folderKey}/photo2.jpg`, thumbnailUrl: `EventPhotos/${folderKey}/photo2.jpg`, title: 'Peloton On Route', caption: 'Riders pacing through scenic route', source: 'local' },
        { url: `EventPhotos/${folderKey}/photo3.jpg`, thumbnailUrl: `EventPhotos/${folderKey}/photo3.jpg`, title: 'Celebration & Finish', caption: 'Finish line celebration and refreshments', source: 'local' }
      ];
      source = 'local';
    }

    // 4. Merge any user-added local preview photos
    if (state.userCustomPhotos[sNo]) {
      photosList = [...photosList, ...state.userCustomPhotos[sNo]];
    }

    return { photosList, source, folderKey };
  }

  /**
   * Helper to retrieve card thumbnail photo
   */
  function getEventThumbnail(sNo) {
    const folderKey = formatFolderKey(sNo);
    
    // 1. Google Drive thumbnail
    if (state.drivePhotosByEvent[folderKey] && state.drivePhotosByEvent[folderKey].length > 0) {
      const firstPhoto = state.drivePhotosByEvent[folderKey][0];
      return firstPhoto.thumbnailUrl || firstPhoto.url;
    }

    // 2. Manifest thumbnail
    const manifestItem = state.photoManifest[folderKey];
    if (manifestItem && manifestItem.photos && manifestItem.photos.length > 0) {
      return `${manifestItem.folder}/${manifestItem.photos[0].file}`;
    }

    // 3. Default path
    return `EventPhotos/${folderKey}/photo1.jpg`;
  }

  // ==========================================================================
  // DATA FETCHING & SYNCHRONIZATION (GOOGLE SHEETS & DRIVE)
  // ==========================================================================

  /**
   * Fetch live data from both Google Sheet tabs (Event & DisplayColumns) and Google Drive Photos
   */
  async function syncAllData(isManual = false) {
    const spinIcon = elements.refreshBtn.querySelector('.spin-target');
    if (spinIcon) spinIcon.classList.add('spinning');
    elements.statusLabel.textContent = 'Syncing...';

    let eventRows = [];
    let displayCols = [];
    let isSheetLive = false;

    try {
      // 1. Fetch Event Tab CSV
      const eventResp = await fetch(EVENT_SHEET_URL, { cache: 'no-cache' });
      if (!eventResp.ok) throw new Error(`Event tab HTTP ${eventResp.status}`);
      const eventCSV = await eventResp.text();
      const parsedEvent = parseCSV(eventCSV);
      eventRows = parsedEvent.rows;

      // 2. Fetch DisplayColumns Tab CSV
      const displayResp = await fetch(DISPLAY_SHEET_URL, { cache: 'no-cache' });
      if (!displayResp.ok) throw new Error(`DisplayColumns HTTP ${displayResp.status}`);
      const displayCSV = await displayResp.text();
      const parsedDisplay = parseCSV(displayCSV);
      displayCols = parsedDisplay.rows;

      isSheetLive = true;
    } catch (err) {
      console.warn('Live Google Sheet fetch failed or offline. Using verified fallback dataset.', err);
      eventRows = FALLBACK_EVENTS;
      displayCols = FALLBACK_DISPLAY_COLUMNS;
      isSheetLive = false;
    }

    // 3. Fetch local photo manifest
    try {
      const manifestResp = await fetch(MANIFEST_URL);
      if (manifestResp.ok) {
        state.photoManifest = await manifestResp.json();
      }
    } catch {
      // Keep DEFAULT_PHOTO_MANIFEST
    }

    // 4. Fetch Google Drive Photos (EventList > EventPhotos > Event{NN})
    const isDriveLive = await syncGoogleDrivePhotos();

    // Process DisplayColumns: only keep columns marked with 'Y'
    state.displayColumnsRaw = displayCols;
    const activeCols = displayCols
      .filter(item => {
        const flag = (item.Display || '').trim().toUpperCase();
        return flag === 'Y';
      })
      .map(item => (item.ColumnName || '').trim())
      .filter(Boolean);

    // If for any reason empty, fallback to standard display columns
    state.displayColumns = activeCols.length > 0 ? activeCols : ['Date', 'Organizer', 'Distance'];

    // Process Events: filter where column 'List' === 'Y'
    state.eventsRaw = eventRows.filter(row => {
      const listVal = (row.List || '').trim().toUpperCase();
      return listVal === 'Y';
    });

    state.isSheetLiveConnected = isSheetLive;
    updateSyncBadgeUI(isSheetLive);
    renderDisplayColumnsPills();
    updateStatistics();
    applyFilterAndSort();

    // If details view is currently open, refresh its gallery too
    if (state.currentDetailEvent) {
      const sNo = state.currentDetailEvent['S.No'];
      showEventDetails(sNo);
    }

    if (spinIcon) spinIcon.classList.remove('spinning');
    elements.loadingSkeleton.classList.add('hidden');

    if (isManual) {
      const syncMsg = isSheetLive
        ? (isDriveLive ? 'Synced live with Google Sheet & Drive!' : 'Synced live with Google Sheet!')
        : 'Loaded offline verified dataset.';
      showToast(syncMsg, isSheetLive ? 'success' : 'info');
    }
  }

  function updateSyncBadgeUI(isLive) {
    if (isLive) {
      elements.statusDot.className = 'status-dot pulsating';
      elements.statusLabel.textContent = 'Live Connected';
      elements.syncBadge.title = 'Live sync active with Google Drive Sheet';
    } else {
      elements.statusDot.className = 'status-dot offline';
      elements.statusLabel.textContent = 'Offline Cached';
      elements.syncBadge.title = 'Using local verified cache. Click Sync Live to reconnect.';
    }
  }

  /**
   * Render the active display columns pills at the top
   */
  function renderDisplayColumnsPills() {
    elements.activeColumnsPills.innerHTML = '';
    state.displayColumns.forEach(col => {
      const pill = document.createElement('span');
      pill.className = 'col-pill active';
      pill.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>${escapeHTML(col)}</span>
      `;
      elements.activeColumnsPills.appendChild(pill);
    });
  }

  /**
   * Update dynamic statistics cards
   */
  function updateStatistics() {
    elements.statTotalEvents.textContent = state.eventsRaw.length;
    
    // Total Distance & Organizers
    let totalDist = 0;
    const organizersSet = new Set();

    state.eventsRaw.forEach(row => {
      const dist = parseFloat(row.Distance || 0);
      if (!isNaN(dist)) totalDist += dist;
      if (row.Organizer) organizersSet.add(row.Organizer.trim());
    });

    elements.statTotalDistance.textContent = totalDist > 0 ? `${totalDist} km` : '10+ km';
    elements.statOrganizers.textContent = organizersSet.size;
    elements.statColumnsActive.textContent = `${state.displayColumns.length} Active`;
  }

  // ==========================================================================
  // FILTERING, SORTING & CHRONOLOGICAL ORDER
  // ==========================================================================

  function applyFilterAndSort() {
    const q = state.searchQuery.toLowerCase().trim();

    // 1. Filter
    let filtered = state.eventsRaw.filter(evt => {
      if (!q) return true;
      const org = (evt.Organizer || '').toLowerCase();
      const date = (evt.Date || '').toLowerCase();
      const dist = (evt.Distance || '').toLowerCase();
      const contact = (evt['Contact Person'] || '').toLowerCase();
      return org.includes(q) || date.includes(q) || dist.includes(q) || contact.includes(q);
    });

    // 2. Sort
    filtered.sort((a, b) => {
      const dateA = parseEventDate(a.Date);
      const dateB = parseEventDate(b.Date);
      const timeA = dateA ? dateA.getTime() : 0;
      const timeB = dateB ? dateB.getTime() : 0;

      switch (state.sortOption) {
        case 'date-asc': // Chronological: earliest date first (default)
          return timeA - timeB;
        case 'date-desc': // Latest date first
          return timeB - timeA;
        case 'dist-desc':
          return (parseFloat(b.Distance) || 0) - (parseFloat(a.Distance) || 0);
        case 'org-asc':
          return (a.Organizer || '').localeCompare(b.Organizer || '');
        default:
          return timeA - timeB;
      }
    });

    state.eventsFiltered = filtered;
    renderEvents();
  }

  // ==========================================================================
  // EVENT LIST RENDERING (CARDS & TABLE)
  // ==========================================================================

  function renderEvents() {
    const count = state.eventsFiltered.length;

    if (count === 0) {
      elements.cardsGrid.innerHTML = '';
      elements.tableBody.innerHTML = '';
      elements.emptyState.classList.remove('hidden');
      return;
    }

    elements.emptyState.classList.add('hidden');

    if (state.activeView === 'cards') {
      renderCardsView();
      elements.cardsGrid.classList.remove('hidden');
      elements.tableWrapper.classList.add('hidden');
    } else {
      renderTableView();
      elements.tableWrapper.classList.remove('hidden');
      elements.cardsGrid.classList.add('hidden');
    }
  }

  /**
   * Get an icon for a display column name
   */
  function getColumnIcon(colName) {
    const lower = colName.toLowerCase();
    if (lower.includes('date')) {
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
    }
    if (lower.includes('dist')) {
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    }
    if (lower.includes('organizer') || lower.includes('club')) {
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`;
    }
    if (lower.includes('contribut') || lower.includes('fee')) {
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><line x1="12" y1="6" x2="12" y2="18"/></svg>`;
    }
    if (lower.includes('contact') || lower.includes('person')) {
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    }
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`;
  }

  /**
   * Render Event Cards Grid (respecting DisplayColumns)
   */
  function renderCardsView() {
    elements.cardsGrid.innerHTML = '';

    state.eventsFiltered.forEach(evt => {
      const sNo = evt['S.No'] || '1';
      const folderKey = formatFolderKey(sNo);
      const thumbSrc = getEventThumbnail(sNo);
      const organizer = evt.Organizer || 'Cyclers Thrissur';
      const eventTitle = `${organizer} Cycling Expedition`;

      // Build fields based strictly on state.displayColumns
      let fieldsHTML = '';
      state.displayColumns.forEach(col => {
        const val = evt[col] || '—';
        const icon = getColumnIcon(col);
        const isDist = col.toLowerCase().includes('dist');
        const formattedVal = isDist && !val.toLowerCase().includes('km') ? `${val} KM` : val;

        fieldsHTML += `
          <div class="field-cell">
            <span class="field-name">${escapeHTML(col)}</span>
            <span class="field-val ${isDist ? 'accent' : ''}">
              ${icon}
              <span>${escapeHTML(formattedVal)}</span>
            </span>
          </div>
        `;
      });

      const card = document.createElement('article');
      card.className = 'event-card';
      card.dataset.sno = sNo;

      card.innerHTML = `
        <div class="card-media-wrapper">
          <img 
            src="${thumbSrc}" 
            alt="${escapeHTML(eventTitle)}" 
            class="card-media-img"
            loading="lazy"
            onerror="this.onerror=null; this.src='assets/logo_1.png';"
          >
          <div class="card-overlay"></div>
          <div class="card-badges-strip">
            <span class="sno-badge">#${escapeHTML(String(sNo).padStart(2, '0'))}</span>
            <span class="status-chip">LISTED</span>
          </div>
        </div>

        <div class="card-body">
          <h2 class="card-title">${escapeHTML(eventTitle)}</h2>
          <div class="card-organizer-sub">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
            </svg>
            <span>Organized by <strong>${escapeHTML(organizer)}</strong></span>
          </div>

          <!-- Dynamic DisplayColumns Grid -->
          <div class="card-fields-grid">
            ${fieldsHTML}
          </div>

          <div class="card-footer">
            <div class="folder-hint" title="Google Drive folder path: EventList > EventPhotos > ${folderKey}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              <span>EventPhotos &gt; ${escapeHTML(folderKey)}</span>
            </div>

            <a 
              href="#event/${encodeURIComponent(sNo)}" 
              class="details-action-link" 
              data-sno="${escapeHTML(sNo)}"
              title="Open full event photos and specifications"
            >
              <span>Details</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </div>
        </div>
      `;

      elements.cardsGrid.appendChild(card);
    });
  }

  /**
   * Render Table View (respecting DisplayColumns)
   */
  function renderTableView() {
    // 1. Table Headers
    let theadHTML = `
      <tr>
        <th style="width: 70px;">S.No</th>
    `;
    state.displayColumns.forEach(col => {
      theadHTML += `<th class="${col.toLowerCase().includes('dist') ? 'col-accent' : ''}">${escapeHTML(col)}</th>`;
    });
    theadHTML += `
        <th style="text-align: right; width: 130px;">Action</th>
      </tr>
    `;
    elements.tableHead.innerHTML = theadHTML;

    // 2. Table Rows
    elements.tableBody.innerHTML = '';
    state.eventsFiltered.forEach(evt => {
      const sNo = evt['S.No'] || '1';
      const tr = document.createElement('tr');

      let rowHTML = `
        <td><strong class="text-yellow">#${escapeHTML(String(sNo).padStart(2, '0'))}</strong></td>
      `;

      state.displayColumns.forEach(col => {
        let val = evt[col] || '—';
        if (col.toLowerCase().includes('dist') && !val.toLowerCase().includes('km')) {
          val = `${val} KM`;
        }
        rowHTML += `<td>${escapeHTML(val)}</td>`;
      });

      rowHTML += `
        <td style="text-align: right;">
          <a href="#event/${encodeURIComponent(sNo)}" class="table-details-btn" data-sno="${escapeHTML(sNo)}">
            <span>Details</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
        </td>
      `;

      tr.innerHTML = rowHTML;
      elements.tableBody.appendChild(tr);
    });
  }

  // ==========================================================================
  // DEDICATED EVENT DETAILS VIEW ("opens a new page")
  // ==========================================================================

  /**
   * Load and display dedicated event details page for the given Serial Number
   */
  function showEventDetails(sNo) {
    const evt = state.eventsRaw.find(e => String(e['S.No']).trim() === String(sNo).trim());
    if (!evt) {
      showToast(`Event #${sNo} not found. Returning to events list.`);
      navigateToEvents();
      return;
    }

    state.currentDetailEvent = evt;
    const folderKey = formatFolderKey(sNo);
    const driveHierarchyPath = `Google Drive: EventList > EventPhotos > ${folderKey}`;

    // Update Header Content
    elements.detailSnoTag.textContent = `EVENT #${String(sNo).padStart(2, '0')}`;
    elements.detailTitle.textContent = `${evt.Organizer || 'Cyclers Thrissur'} Cycling Expedition`;
    elements.detailSubtitle.textContent = `Official ride organized by ${evt.Organizer || 'Cyclers Thrissur'}`;
    elements.detailFolderPath.textContent = driveHierarchyPath;
    elements.galleryFolderCode.textContent = `EventList > EventPhotos > ${folderKey}`;

    // Google Drive Folder Link (if present)
    const driveFolderUrl = state.driveFolderUrls[folderKey];
    if (driveFolderUrl) {
      elements.detailDriveFolderLink.href = driveFolderUrl;
      elements.detailDriveFolderLink.classList.remove('hidden');
    } else {
      elements.detailDriveFolderLink.classList.add('hidden');
    }

    // Render Key Metrics Strip (from DisplayColumns)
    let metricsHTML = '';
    state.displayColumns.forEach(col => {
      const val = evt[col] || '—';
      const isDist = col.toLowerCase().includes('dist');
      metricsHTML += `
        <div class="metric-pill">
          <div>
            <div class="metric-pill-label">${escapeHTML(col)}</div>
            <div class="metric-pill-value">${escapeHTML(isDist && !val.includes('KM') ? `${val} KM` : val)}</div>
          </div>
        </div>
      `;
    });
    elements.detailKeyMetrics.innerHTML = metricsHTML;

    // Render Full Specifications Grid (All columns present in row)
    let specsHTML = '';
    const allKeys = Object.keys(evt);
    allKeys.forEach(key => {
      const isDisplay = state.displayColumns.includes(key);
      const val = evt[key] || '—';
      specsHTML += `
        <div class="spec-item ${isDisplay ? 'highlighted' : ''}">
          <span class="spec-label">${escapeHTML(key)} ${isDisplay ? '(Active Display)' : ''}</span>
          <span class="spec-value ${isDisplay ? 'is-display' : ''}">${escapeHTML(val)}</span>
        </div>
      `;
    });
    elements.specsGrid.innerHTML = specsHTML;

    // Load & Render Photos from Google Drive folder: EventList > EventPhotos > Event{NN}
    loadAndRenderGallery(sNo);

    // Switch View
    elements.eventsView.classList.add('hidden');
    elements.detailsView.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Load and render gallery photos for the selected event
   */
  function loadAndRenderGallery(sNo) {
    const { photosList, source, folderKey } = getEventPhotos(sNo);
    state.currentDetailPhotos = photosList;
    state.currentDetailSource = source;

    // Update Source Badge
    if (source === 'drive') {
      elements.gallerySourceBadge.className = 'drive-source-badge';
      elements.gallerySourceLabel.textContent = 'Google Drive Live';
    } else if (source === 'manifest') {
      elements.gallerySourceBadge.className = 'drive-source-badge offline-mode';
      elements.gallerySourceLabel.textContent = 'Local Manifest';
    } else {
      elements.gallerySourceBadge.className = 'drive-source-badge offline-mode';
      elements.gallerySourceLabel.textContent = 'Local Cache';
    }

    elements.photoCountBadge.textContent = `${photosList.length} Photos`;

    // Render Gallery Grid
    elements.galleryGrid.innerHTML = '';
    
    if (photosList.length === 0) {
      elements.galleryGrid.innerHTML = `
        <div class="empty-gallery-hint">
          <p>No photographs found in Google Drive folder <code>EventList &gt; EventPhotos &gt; ${folderKey}</code>.</p>
        </div>
      `;
      return;
    }

    photosList.forEach((photo, idx) => {
      const card = document.createElement('div');
      card.className = 'photo-card';
      card.dataset.index = idx;

      card.innerHTML = `
        <img 
          src="${photo.thumbnailUrl || photo.url}" 
          alt="${escapeHTML(photo.title)}" 
          class="photo-thumb"
          loading="lazy"
          onerror="this.onerror=null; this.parentElement.style.display='none';"
        >
        <div class="photo-info-overlay">
          <h4 class="photo-title-text">${escapeHTML(photo.title)}</h4>
          <span class="photo-click-hint">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
            Click to view in Lightbox
          </span>
        </div>
      `;

      card.addEventListener('click', () => openLightbox(idx));
      elements.galleryGrid.appendChild(card);
    });
  }

  // ==========================================================================
  // LIGHTBOX MODAL CONTROLLER
  // ==========================================================================

  function openLightbox(index) {
    if (!state.currentDetailPhotos || state.currentDetailPhotos.length === 0) return;
    state.lightboxIndex = index;
    updateLightboxUI();
    elements.lightboxModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Lock background scroll
  }

  function closeLightbox() {
    elements.lightboxModal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function nextLightbox() {
    if (!state.currentDetailPhotos || state.currentDetailPhotos.length === 0) return;
    state.lightboxIndex = (state.lightboxIndex + 1) % state.currentDetailPhotos.length;
    updateLightboxUI();
  }

  function prevLightbox() {
    if (!state.currentDetailPhotos || state.currentDetailPhotos.length === 0) return;
    state.lightboxIndex = (state.lightboxIndex - 1 + state.currentDetailPhotos.length) % state.currentDetailPhotos.length;
    updateLightboxUI();
  }

  function updateLightboxUI() {
    const photo = state.currentDetailPhotos[state.lightboxIndex];
    if (!photo) return;

    elements.lightboxImg.src = photo.url;
    elements.lightboxTitle.textContent = photo.title || 'Event Photograph';
    elements.lightboxCounter.textContent = `${state.lightboxIndex + 1} / ${state.currentDetailPhotos.length}`;
    elements.lightboxCaption.textContent = photo.caption || '';
    elements.lightboxDownloadBtn.setAttribute('data-href', photo.url);

    // Direct Google Drive link if available
    if (photo.driveUrl) {
      elements.lightboxDriveLinkBtn.href = photo.driveUrl;
      elements.lightboxDriveLinkBtn.classList.remove('hidden');
    } else {
      elements.lightboxDriveLinkBtn.classList.add('hidden');
    }
  }

  function downloadCurrentPhoto() {
    const photo = state.currentDetailPhotos[state.lightboxIndex];
    if (!photo) return;
    const a = document.createElement('a');
    a.href = photo.url;
    a.target = '_blank';
    a.download = `CyclersThrissur_${state.lightboxIndex + 1}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Downloading photograph...', 'info');
  }

  // ==========================================================================
  // GOOGLE DRIVE MODAL CONTROLLER
  // ==========================================================================

  function openDriveModal() {
    elements.appsScriptInput.value = state.appsScriptUrl || localStorage.getItem(STORAGE_KEY_SCRIPT_URL) || '';
    if (elements.driveFolderIdInput) {
      elements.driveFolderIdInput.value = state.driveFolderId || localStorage.getItem(STORAGE_KEY_FOLDER_ID) || '';
    }
    elements.driveModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeDriveModal() {
    elements.driveModal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  async function saveAndTestDriveSettings() {
    const inputUrl = elements.appsScriptInput.value.trim();
    const folderOverride = elements.driveFolderIdInput ? elements.driveFolderIdInput.value.trim() : '';

    state.appsScriptUrl = inputUrl;
    state.driveFolderId = folderOverride;
    
    if (inputUrl) {
      localStorage.setItem(STORAGE_KEY_SCRIPT_URL, inputUrl);
    } else {
      localStorage.removeItem(STORAGE_KEY_SCRIPT_URL);
    }

    if (folderOverride) {
      localStorage.setItem(STORAGE_KEY_FOLDER_ID, folderOverride);
    } else {
      localStorage.removeItem(STORAGE_KEY_FOLDER_ID);
    }

    elements.driveConnStatus.textContent = 'Testing connection...';
    elements.driveConnStatus.className = 'config-status-badge';

    if (elements.driveDiagnosticBox) {
      elements.driveDiagnosticBox.classList.remove('hidden');
      elements.diagnosticBadge.textContent = 'TESTING...';
      elements.diagnosticBadge.className = 'diagnostic-badge';
      elements.diagnosticOutput.innerHTML = `<div class="diagnostic-item">Connecting to Google Apps Script Web App...</div>`;
    }

    if (!inputUrl) {
      if (elements.driveDiagnosticBox) {
        elements.diagnosticBadge.textContent = 'OFFLINE';
        elements.diagnosticBadge.className = 'diagnostic-badge';
        elements.diagnosticOutput.innerHTML = `
          <div class="diagnostic-item" style="color:#FBBF24;">Web App URL is empty. The application will use local photo assets (EventPhotos/manifest.json).</div>
        `;
      }
      updateDriveStatusUI(false, 'Local Fallback');
      showToast('Cleared Drive URL. Using local manifest.', 'info');
      return;
    }

    try {
      // 1. Run diagnostic call to Apps Script
      let testUrl = inputUrl.includes('?') 
        ? `${inputUrl}&action=debug`
        : `${inputUrl}?action=debug`;
      
      if (folderOverride) {
        testUrl += `&folderId=${encodeURIComponent(folderOverride)}`;
      }

      const diagResp = await fetch(testUrl, { method: 'GET', mode: 'cors' });
      const diagData = await diagResp.json();

      if (elements.driveDiagnosticBox) {
        if (diagData.status === 'success') {
          elements.diagnosticBadge.textContent = 'SUCCESS (200 OK)';
          elements.diagnosticBadge.className = 'diagnostic-badge success';

          let itemsHtml = `
            <div class="diagnostic-item" style="color: #10B981; font-weight: bold;">
              ✔ Connected! Found parent folder: <code>${escapeHTML(diagData.parentFolderFound)}</code>
            </div>
          `;

          if (diagData.subfolders && diagData.subfolders.length > 0) {
            diagData.subfolders.forEach(sub => {
              const hasPhotos = sub.photosCount > 0;
              itemsHtml += `
                <div class="diagnostic-item">
                  📁 <strong>${escapeHTML(sub.folderName)}</strong> ➔ Matched: <code>${escapeHTML(sub.matchedEventKey)}</code> | 
                  <span style="color: ${hasPhotos ? '#10B981' : '#F59E0B'}; font-weight: bold;">${sub.photosCount} Photo(s)</span>
                  ${hasPhotos ? ` (First: ${escapeHTML(sub.firstPhotoName)})` : ' ⚠️ (Folder is empty)'}
                </div>
              `;
            });
          } else {
            itemsHtml += `
              <div class="diagnostic-item" style="color: #F59E0B;">
                ⚠️ No subfolders (Event01, Event02) found inside '${escapeHTML(diagData.parentFolderFound)}'. Please add folders Event01, Event02 and upload photos.
              </div>
            `;
          }

          elements.diagnosticOutput.innerHTML = itemsHtml;
        } else {
          elements.diagnosticBadge.textContent = 'DRIVE ERROR';
          elements.diagnosticBadge.className = 'diagnostic-badge error';
          elements.diagnosticOutput.innerHTML = `
            <div class="diagnostic-item" style="color: #EF4444; font-weight: bold;">
              ✖ ${escapeHTML(diagData.message || 'Error communicating with Google Drive')}
            </div>
            ${diagData.suggestion ? `<div class="diagnostic-item" style="color: #FEE715;">💡 Tip: ${escapeHTML(diagData.suggestion)}</div>` : ''}
          `;
        }
      }

      // 2. Perform live sync
      const success = await syncGoogleDrivePhotos();
      if (success) {
        showToast('Successfully synchronized with Google Drive!', 'success');
        if (state.currentDetailEvent) {
          showEventDetails(state.currentDetailEvent['S.No']);
        } else {
          renderEvents();
        }
      }
    } catch (err) {
      if (elements.driveDiagnosticBox) {
        elements.diagnosticBadge.textContent = 'FETCH FAILED';
        elements.diagnosticBadge.className = 'diagnostic-badge error';
        elements.diagnosticOutput.innerHTML = `
          <div class="diagnostic-item" style="color: #EF4444; font-weight: bold;">
            ✖ Network/CORS Error: ${escapeHTML(err.message)}
          </div>
          <div class="diagnostic-item" style="color: #FEE715;">
            💡 Common Fix: When deploying Apps Script, make sure "Who has access" is set to <strong>"Anyone"</strong> (not "Only myself").
          </div>
        `;
      }
      updateDriveStatusUI(false, 'Connection Error');
      showToast('Failed to reach Google Apps Script URL. Check permissions.', 'info');
    }
  }

  function resetDriveSettings() {
    elements.appsScriptInput.value = '';
    if (elements.driveFolderIdInput) elements.driveFolderIdInput.value = '';
    state.appsScriptUrl = '';
    state.driveFolderId = '';
    localStorage.removeItem(STORAGE_KEY_SCRIPT_URL);
    localStorage.removeItem(STORAGE_KEY_FOLDER_ID);
    if (elements.driveDiagnosticBox) elements.driveDiagnosticBox.classList.add('hidden');
    syncGoogleDrivePhotos();
    showToast('Reset to default local manifest.', 'info');
  }

  // ==========================================================================
  // SPA ROUTING CONTROLLER
  // ==========================================================================

  function handleRouting() {
    const hash = window.location.hash || '#';
    const eventMatch = hash.match(/^#event\/(.+)$/);

    if (eventMatch) {
      const sNo = decodeURIComponent(eventMatch[1]);
      showEventDetails(sNo);
    } else {
      navigateToEvents();
    }
  }

  function navigateToEvents() {
    window.location.hash = '#';
    elements.detailsView.classList.add('hidden');
    elements.eventsView.classList.remove('hidden');
    state.currentDetailEvent = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ==========================================================================
  // EVENT LISTENERS & SETUP
  // ==========================================================================

  function bindEvents() {
    // Brand Logo & Nav Click
    elements.brandHomeBtn.addEventListener('click', navigateToEvents);
    elements.backToEventsBtn.addEventListener('click', navigateToEvents);

    // Refresh Sync Button
    elements.refreshBtn.addEventListener('click', () => syncAllData(true));

    // Google Drive Setup Modal Triggers
    if (elements.driveSettingsBtn) elements.driveSettingsBtn.addEventListener('click', openDriveModal);
    if (elements.openDriveGuideBtn) elements.openDriveGuideBtn.addEventListener('click', openDriveModal);
    if (elements.driveModalCloseBtn) elements.driveModalCloseBtn.addEventListener('click', closeDriveModal);
    if (elements.closeDriveModalBtn) elements.closeDriveModalBtn.addEventListener('click', closeDriveModal);
    if (elements.driveModalBackdrop) elements.driveModalBackdrop.addEventListener('click', closeDriveModal);
    if (elements.saveTestDriveBtn) elements.saveTestDriveBtn.addEventListener('click', saveAndTestDriveSettings);
    if (elements.resetDriveDefaultBtn) elements.resetDriveDefaultBtn.addEventListener('click', resetDriveSettings);

    // Search Box
    elements.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      elements.clearSearchBtn.classList.toggle('hidden', !state.searchQuery);
      applyFilterAndSort();
    });

    elements.clearSearchBtn.addEventListener('click', () => {
      elements.searchInput.value = '';
      state.searchQuery = '';
      elements.clearSearchBtn.classList.add('hidden');
      applyFilterAndSort();
    });

    elements.resetFiltersBtn.addEventListener('click', () => {
      elements.searchInput.value = '';
      state.searchQuery = '';
      state.sortOption = 'date-asc';
      elements.sortSelect.value = 'date-asc';
      elements.clearSearchBtn.classList.add('hidden');
      applyFilterAndSort();
    });

    // Sort Dropdown
    elements.sortSelect.addEventListener('change', (e) => {
      state.sortOption = e.target.value;
      applyFilterAndSort();
    });

    // View Switches (Cards vs Table)
    elements.viewCardsBtn.addEventListener('click', () => {
      state.activeView = 'cards';
      elements.viewCardsBtn.classList.add('active');
      elements.viewCardsBtn.setAttribute('aria-pressed', 'true');
      elements.viewTableBtn.classList.remove('active');
      elements.viewTableBtn.setAttribute('aria-pressed', 'false');
      renderEvents();
    });

    elements.viewTableBtn.addEventListener('click', () => {
      state.activeView = 'table';
      elements.viewTableBtn.classList.add('active');
      elements.viewTableBtn.setAttribute('aria-pressed', 'true');
      elements.viewCardsBtn.classList.remove('active');
      elements.viewCardsBtn.setAttribute('aria-pressed', 'false');
      renderEvents();
    });

    // Share Event Button
    elements.shareEventBtn.addEventListener('click', () => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href);
        showToast('Direct link copied to clipboard!', 'success');
      } else {
        showToast('Link: ' + window.location.href);
      }
    });

    // Local Photo Picker (allows previewing additional photos directly)
    elements.localPhotoInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0 || !state.currentDetailEvent) return;

      const sNo = state.currentDetailEvent['S.No'];
      if (!state.userCustomPhotos[sNo]) state.userCustomPhotos[sNo] = [];

      files.forEach((file) => {
        const objUrl = URL.createObjectURL(file);
        state.userCustomPhotos[sNo].push({
          url: objUrl,
          thumbnailUrl: objUrl,
          title: file.name.replace(/\.[^/.]+$/, ""),
          caption: `Custom added photo: ${file.name}`,
          source: 'local_upload'
        });
      });

      loadAndRenderGallery(sNo);
      showToast(`Added ${files.length} photo(s) to this gallery preview.`, 'success');
    });

    // Lightbox Controls
    elements.lightboxBackdrop.addEventListener('click', closeLightbox);
    elements.lightboxCloseBtn.addEventListener('click', closeLightbox);
    elements.lightboxNextBtn.addEventListener('click', nextLightbox);
    elements.lightboxPrevBtn.addEventListener('click', prevLightbox);
    elements.lightboxDownloadBtn.addEventListener('click', downloadCurrentPhoto);

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (!elements.lightboxModal.classList.contains('hidden')) {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') nextLightbox();
        if (e.key === 'ArrowLeft') prevLightbox();
      } else if (!elements.driveModal.classList.contains('hidden')) {
        if (e.key === 'Escape') closeDriveModal();
      }
    });

    // Hash routing
    window.addEventListener('hashchange', handleRouting);
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  document.addEventListener('DOMContentLoaded', async () => {
    bindEvents();
    await syncAllData(false);
    handleRouting();
  });

})();
