/**
 * ============================================================================
 * CYCLERS THRISSUR - GOOGLE DRIVE PHOTO SYNC (GOOGLE APPS SCRIPT v2.0)
 * ============================================================================
 * 
 * Automatically reads and serves event photos from your Google Drive folder hierarchy:
 * 
 *   Google Drive
 *   └── EventList (or directly EventPhotos)
 *       └── EventPhotos
 *           ├── Event01 (or Even01, Event 01, 01, 1)
 *           │   ├── photo1.jpg
 *           │   ├── photo2.jpg
 *           │   └── ...
 *           ├── Event02
 *           │   └── ...
 *           └── Event{NN}
 * 
 * ----------------------------------------------------------------------------
 * HOW TO DEPLOY:
 * ----------------------------------------------------------------------------
 * 1. In your Google Sheet (or https://script.google.com), click: Extensions -> Apps Script
 * 2. Paste this entire script into Code.gs (replacing everything).
 * 3. (Optional) If you have a specific Google Drive folder ID, paste it into
 *    CUSTOM_FOLDER_ID below, otherwise leave it empty for automatic search!
 * 4. Click "Deploy" (top right) -> "New deployment"
 *    - Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone  <-- (IMPORTANT!)
 * 5. Click "Deploy", authorize permissions, and copy the Web App URL.
 * 6. Paste the Web App URL into the "Drive Photos" modal in the web app!
 * ============================================================================
 */

// OPTIONAL CONFIGURATION:
// Leave empty ("") to automatically search Drive for 'EventList' or 'EventPhotos'.
// Or paste your Google Drive Folder ID or URL here:
var CUSTOM_FOLDER_ID = ""; // e.g. "1a2b3c4d5e6f..." or folder URL

/**
 * Handle HTTP GET requests from web application
 */
function doGet(e) {
  try {
    var params = e ? e.parameter : {};
    var action = params.action || 'getAllEventsPhotos';
    var eventParam = params.event || ''; // e.g. "Event01" or "1"
    var folderIdParam = params.folderId || CUSTOM_FOLDER_ID || '';
    
    var responseData = {};

    if (action === 'debug' || action === 'test') {
      responseData = runDiagnostic(folderIdParam);
    } else if (action === 'getEventPhotos' && eventParam) {
      responseData = fetchSingleEventPhotos(eventParam, folderIdParam);
    } else {
      // Default: fetch all events photos
      responseData = fetchAllEventsPhotos(folderIdParam);
    }

    return ContentService.createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    var errorOutput = {
      status: "error",
      message: err.toString(),
      stack: err.stack,
      hint: "Make sure you have a folder named 'EventList' containing 'EventPhotos' (or a folder named 'EventPhotos') with subfolders like Event01, Event02."
    };
    return ContentService.createTextOutput(JSON.stringify(errorOutput))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Extract clean folder ID if user pasted full Google Drive URL
 */
function cleanFolderId(idOrUrl) {
  if (!idOrUrl) return "";
  var str = String(idOrUrl).trim();
  // Match folder ID from Google Drive URL: /folders/1a2b3c4d...
  var match = str.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // Match id= parameter
  var idMatch = str.match(/id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }
  return str;
}

/**
 * Robust folder discovery: Searches Drive with multiple fallbacks
 */
function findPhotosParentFolder(explicitId) {
  var cleanId = cleanFolderId(explicitId);
  
  // 1. If explicit ID provided, load it directly
  if (cleanId) {
    try {
      var folder = DriveApp.getFolderById(cleanId);
      if (folder) {
        // If this folder contains 'EventPhotos' as a subfolder, use that subfolder
        var subPhotos = folder.getFoldersByName("EventPhotos");
        if (subPhotos.hasNext()) return subPhotos.next();
        return folder;
      }
    } catch (e) {
      // Proceed to search if explicit ID failed
    }
  }

  // 2. Search for 'EventPhotos' folder directly (case-insensitive & search query)
  var queries = [
    "title = 'EventPhotos' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
    "title = 'Event Photos' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
    "title = 'eventphotos' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
  ];

  for (var i = 0; i < queries.length; i++) {
    var searchResult = DriveApp.searchFolders(queries[i]);
    if (searchResult.hasNext()) {
      return searchResult.next();
    }
  }

  // 3. Search for root 'EventList' folder and check inside
  var listQueries = [
    "title = 'EventList' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
    "title = 'Event List' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
    "title = 'eventlist' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
  ];

  for (var j = 0; j < listQueries.length; j++) {
    var listResult = DriveApp.searchFolders(listQueries[j]);
    if (listResult.hasNext()) {
      var eventListFolder = listResult.next();
      var subFolders = eventListFolder.getFolders();
      while (subFolders.hasNext()) {
        var sub = subFolders.next();
        var subName = sub.getName().toLowerCase().replace(/[\s_-]/g, "");
        if (subName.indexOf("photo") !== -1 || subName.indexOf("event") !== -1) {
          return sub;
        }
      }
      return eventListFolder;
    }
  }

  // 4. Standard name fallback
  var direct = DriveApp.getFoldersByName("EventPhotos");
  if (direct.hasNext()) return direct.next();

  var directList = DriveApp.getFoldersByName("EventList");
  if (directList.hasNext()) return directList.next();

  throw new Error("Could not locate 'EventList' or 'EventPhotos' folder in Google Drive. Please create folder 'EventList > EventPhotos' or provide your Google Drive Folder ID.");
}

/**
 * Normalizes folder names like "Even01", "Event 01", "event_1", "01", "1" to "Event01"
 */
function normalizeEventKey(name) {
  if (!name) return "Event01";
  var clean = String(name).trim();
  var numMatch = clean.match(/\d+/);
  if (numMatch) {
    var num = parseInt(numMatch[0], 10);
    return "Event" + (num < 10 ? "0" + num : String(num));
  }
  return clean;
}

/**
 * Fetch photos from all event subfolders in Drive
 */
function fetchAllEventsPhotos(explicitFolderId) {
  var parentFolder = findPhotosParentFolder(explicitFolderId);
  var subFolders = parentFolder.getFolders();
  var eventsData = {};
  var folderSummary = [];

  while (subFolders.hasNext()) {
    var folder = subFolders.next();
    var rawName = folder.getName();
    var normalizedKey = normalizeEventKey(rawName);
    
    var photos = getPhotosFromFolder(folder);
    
    eventsData[normalizedKey] = {
      rawFolderName: rawName,
      normalizedKey: normalizedKey,
      folderId: folder.getId(),
      folderUrl: folder.getUrl(),
      photoCount: photos.length,
      photos: photos
    };

    folderSummary.push({
      folderName: rawName,
      key: normalizedKey,
      photoCount: photos.length
    });
  }

  return {
    status: "success",
    source: "Google Drive Live",
    parentFolderName: parentFolder.getName(),
    parentFolderId: parentFolder.getId(),
    parentFolderUrl: parentFolder.getUrl(),
    totalEventFolders: Object.keys(eventsData).length,
    folderSummary: folderSummary,
    timestamp: new Date().toISOString(),
    events: eventsData
  };
}

/**
 * Fetch photos for a specific event (e.g. "Event01", "Even01", "1")
 */
function fetchSingleEventPhotos(eventIdentifier, explicitFolderId) {
  var parentFolder = findPhotosParentFolder(explicitFolderId);
  var targetKey = normalizeEventKey(eventIdentifier);
  
  var subFolders = parentFolder.getFolders();
  var targetFolder = null;

  while (subFolders.hasNext()) {
    var folder = subFolders.next();
    var currKey = normalizeEventKey(folder.getName());
    if (currKey === targetKey || folder.getName().toLowerCase() === eventIdentifier.toLowerCase()) {
      targetFolder = folder;
      break;
    }
  }

  if (!targetFolder) {
    return {
      status: "not_found",
      requestedEvent: eventIdentifier,
      normalizedKey: targetKey,
      parentFolderName: parentFolder.getName(),
      message: "Subfolder for '" + targetKey + "' not found under '" + parentFolder.getName() + "'.",
      photos: []
    };
  }

  var photos = getPhotosFromFolder(targetFolder);

  return {
    status: "success",
    event: targetKey,
    rawFolderName: targetFolder.getName(),
    folderId: targetFolder.getId(),
    folderUrl: targetFolder.getUrl(),
    photoCount: photos.length,
    photos: photos
  };
}

/**
 * Extracts and formats images from a folder
 */
function getPhotosFromFolder(folder) {
  var files = folder.getFiles();
  var photoList = [];

  var validMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/heic",
    "image/heif"
  ];

  while (files.hasNext()) {
    var file = files.next();
    var mimeType = file.getMimeType();
    var fileName = file.getName();
    var fileExt = fileName.split('.').pop().toLowerCase();

    var isImage = validMimeTypes.indexOf(mimeType) !== -1 ||
                  ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'heic'].indexOf(fileExt) !== -1;

    if (isImage) {
      var fileId = file.getId();
      var title = formatPhotoTitle(fileName);

      // Ensure public read access so images load reliably across web browsers
      try {
        if (file.getSharingAccess() !== DriveApp.Access.ANYONE_WITH_LINK) {
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        }
      } catch (permErr) {
        // Continue if permission change is not permitted
      }
      
      photoList.push({
        id: fileId,
        name: fileName,
        title: title,
        description: file.getDescription() || "",
        caption: file.getDescription() || ("Captured during ride • " + fileName),
        size: file.getSize(),
        created: file.getDateCreated().toISOString(),
        mimeType: mimeType,
        // High-speed CDN links
        url: "https://lh3.googleusercontent.com/d/" + fileId,
        thumbnailUrl: "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w1600",
        cardThumbnailUrl: "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w600",
        driveUrl: file.getUrl()
      });
    }
  }

  // Sort photos naturally (e.g. photo1, photo2, photo10)
  photoList.sort(function(a, b) {
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });

  return photoList;
}

/**
 * Diagnostic helper to test folder paths and display clear summary
 */
function runDiagnostic(explicitFolderId) {
  try {
    var parentFolder = findPhotosParentFolder(explicitFolderId);
    var subFolders = parentFolder.getFolders();
    var details = [];

    while (subFolders.hasNext()) {
      var f = subFolders.next();
      var photos = getPhotosFromFolder(f);
      details.push({
        folderName: f.getName(),
        matchedEventKey: normalizeEventKey(f.getName()),
        folderId: f.getId(),
        photosCount: photos.length,
        firstPhotoName: photos.length > 0 ? photos[0].name : "none",
        folderLink: f.getUrl()
      });
    }

    return {
      status: "success",
      diagnostic: "PASSED",
      parentFolderFound: parentFolder.getName(),
      parentFolderId: parentFolder.getId(),
      parentFolderUrl: parentFolder.getUrl(),
      totalSubfoldersFound: details.length,
      subfolders: details,
      instructions: "If photos count is 0, ensure your image files (.jpg, .png) are inside the subfolders (Event01, Event02, etc.)."
    };
  } catch (err) {
    return {
      status: "error",
      diagnostic: "FAILED",
      message: err.toString(),
      stack: err.stack,
      suggestion: "Create folder 'EventList' in Google Drive, create subfolder 'EventPhotos', and create 'Event01', 'Event02' inside it."
    };
  }
}

/**
 * Photo title formatter
 */
function formatPhotoTitle(filename) {
  if (!filename) return "Event Photograph";
  var base = filename.replace(/\.[^/.]+$/, "");
  base = base.replace(/[_-]+/g, " ").trim();
  return base.replace(/\b\w/g, function(l) { return l.toUpperCase(); });
}
