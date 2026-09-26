# Cyclers Thrissur Events (SPA)

A modern Single Page Application (SPA) designed with an **electric yellow & deep carbon black** cycling club aesthetic for **Cyclers Thrissur**.

The application automatically connects with Google Drive & Google Sheets to display club ride expeditions in chronological order, dynamically respecting the display columns configuration, with dedicated photo gallery pages for each event loaded from Google Drive folders `EventList > EventPhotos > Event01`, `Event02`, etc.

---

## 🌟 Key Features

1. **Google Sheets Live Synchronization**:
   - **Google Sheet ID**: `1wmHbzg3cnkCNLcKLeZLU_IxzNZpbkxkAQ7pLu4FWBW8`
   - **Tab `Event`**: Reads events and filters exclusively rows where the column `List` has value `"Y"`.
   - **Tab `DisplayColumns`**: Dynamically renders only the columns marked with `"Y"` in the `DisplayColumns` tab (currently: `Date`, `Organizer`, and `Distance`).
   - Real-time **Sync Live** button with pulsating connection status badge.
   - Built-in graceful offline fallback ensures the application works smoothly even without an active internet connection.

2. **Google Drive Live Photo Synchronization (`EventList > EventPhotos > Event{NN}`)**:
   - Reads event photos directly from your Google Drive folder hierarchy:
     ```
     Google Drive
     └── EventList
         └── EventPhotos
             ├── Event01/       # Photos for Event S.No 1
             │   ├── photo1.jpg
             │   ├── photo2.jpg
             │   └── ...
             ├── Event02/       # Photos for Event S.No 2
             └── Event{NN}/      # Photos for Event S.No N
     ```
   - Includes high-resolution thumbnails, direct Google Drive links, and download capability.
   - Powered by a lightweight, zero-maintenance **Google Apps Script Web App** (`google_apps_script.js`).
   - Built-in in-app **Drive Photos** configuration modal with live connection testing.

3. **Chronological Sorting & Smart Filtering**:
   - Parses `DD-MM-YYYY`, `DD/MM/YYYY`, and ISO date formats.
   - Chronological order by date (earliest upcoming rides first) by default.
   - Live search by organizer, date, or distance.
   - Sorting options: Chronological (Earliest first), Latest first, Distance (High to Low), and Organizer (A-Z).
   - Layout toggle: **Grid Cards View** and **Compact Table View**.

4. **Event "Details" Page**:
   - Each event row/card includes a prominent **Details →** action link.
   - Uses SPA hash routing (`#event/1`, `#event/2`) with full browser history (Back button support).
   - Full event specification breakdown displaying both active display fields and complete metadata.
   - Direct Google Drive folder breadcrumbs (`Google Drive: EventList > EventPhotos > Event01`).

5. **Event Photo Gallery & Fullscreen Lightbox**:
   - High-resolution viewer with zoom animation.
   - Previous / Next navigation controls (`←`, `→` arrow keys).
   - Image counter (`1 / 3`), titles, and captions.
   - Direct photo download and "Open in Google Drive" buttons.
   - **Drag-and-Drop / Local Photo Uploader** for instant in-browser preview of additional photos.

6. **Signature Yellow & Black Design System**:
   - Incorporates the official **Cyclers Thrissur** club logo in the header and footer.
   - High-contrast electric racing yellow (`#FEE715`) accents on dark asphalt backgrounds.
   - Typography: Google Fonts `Outfit` (bold athletic headings) and `Inter` (crisp UI body).

---

## 📁 Project Structure

```
CyclersThrissurEvents/
├── index.html                   # Main SPA container & semantic structure
├── styles.css                   # Yellow & Black cycling theme stylesheet
├── app.js                       # Core SPA controller, Sheet & Drive sync, routing
├── google_apps_script.js        # Google Apps Script for Google Drive photo API
├── README.md                    # Project documentation
├── assets/
│   ├── favicon.svg              # Cycling helmet / bike SVG favicon
│   ├── logo_1.png               # Cyclers Thrissur logo (Dark text)
│   └── logo_2.png               # Cyclers Thrissur logo (White text for dark header)
└── EventPhotos/
    ├── manifest.json            # Local photo manifest fallback
    ├── Event01/                 # Local fallback photos for Event #01 (Jubilee)
    │   ├── photo1.jpg
    │   ├── photo2.jpg
    │   └── photo3.jpg
    └── Event02/                 # Local fallback photos for Event #02 (Hindu)
        ├── photo1.jpg
        ├── photo2.jpg
        └── photo3.jpg
```

---

## ⚡ How to Set Up Google Drive Photo Live Sync (2 Minutes)

1. Open your Google Drive (or linked Google Sheet):
   - In Google Sheet, click: **Extensions > Apps Script** (or visit https://script.google.com).
2. Open [`google_apps_script.js`](file:///c:/Users/briju/Desktop/Study/MyProjects/CyclersThrissurEvents/google_apps_script.js) from this repository, copy the entire code, and paste it into `Code.gs`.
3. Click the blue **Deploy** button (top right) -> **New deployment**.
4. Configure:
   - **Type**: Web app
   - **Description**: Cyclers Thrissur Event Photos API
   - **Execute as**: Me
   - **Who has access**: Anyone
5. Click **Deploy**, authorize permissions, and copy the **Web App URL**.
6. On the website:
   - Click the **Drive Photos** button in the top navigation bar.
   - Paste the Web App URL and click **Save & Test**.
   - Your photos from `EventList > EventPhotos > Event01`, `Event02`, etc. will immediately load live!

---

## 🚀 How to Run Locally

You can run this project with any local web server:

### Option A: Using Python (Recommended)
```powershell
cd c:\Users\briju\Desktop\Study\MyProjects\CyclersThrissurEvents
python -m http.server 8085
```
Then navigate to: **`http://localhost:8085/`**

### Option B: Using VS Code Live Server or Direct File
- Right-click `index.html` and select **Open with Live Server**, or open `index.html` directly in any modern browser.

---

## 🔄 Adding New Events & Photos

1. **Google Sheets**:
   - Add a new row in tab `Event` with `S.No` (e.g. `3`), `Date`, `Organizer`, `Distance`, etc., and set `List = "Y"`.
   - To show/hide columns on the webpage, simply toggle `"Y"` or `"N"` in the `DisplayColumns` tab.
2. **Google Drive Photos**:
   - In your Google Drive folder `EventList > EventPhotos`, create a folder named `Event03` (matching the `S.No`).
   - Upload all photos into `Event03`.
   - Hit **Sync Live** on the website and the new photos appear instantly!
