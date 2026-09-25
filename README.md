# Cyclers Thrissur Events (SPA)

A modern Single Page Application (SPA) designed with an **electric yellow & deep carbon black** cycling club aesthetic for **Cyclers Thrissur**.

The application automatically connects with Google Drive & Google Sheets to display club ride expeditions in chronological order, dynamically respecting the display columns configuration, with dedicated photo gallery pages for each event.

---

## 🌟 Key Features

1. **Google Sheets Live Synchronization**:
   - **Google Sheet ID**: `1wmHbzg3cnkCNLcKLeZLU_IxzNZpbkxkAQ7pLu4FWBW8`
   - **Tab `Event`**: Reads events and filters exclusively rows where the column `List` has value `"Y"`.
   - **Tab `DisplayColumns`**: Dynamically renders only the columns marked with `"Y"` in the `DisplayColumns` tab (currently: `Date`, `Organizer`, and `Distance`).
   - Real-time **Sync Live** button with pulsating connection status badge.
   - Built-in graceful offline fallback ensures the application works smoothly even without an active internet connection.

2. **Chronological Sorting & Smart Filtering**:
   - Parses `DD-MM-YYYY`, `DD/MM/YYYY`, and ISO date formats.
   - Chronological order by date (earliest upcoming rides first) by default.
   - Live search by organizer, date, or distance.
   - Sorting options: Chronological (Earliest first), Latest first, Distance (High to Low), and Organizer (A-Z).
   - Layout toggle: **Grid Cards View** and **Compact Table View**.

3. **Event "Details" Page**:
   - Each event row/card includes a prominent **Details →** action link.
   - Uses SPA hash routing (`#event/1`, `#event/2`) with full browser history (Back button support).
   - Full event specification breakdown displaying both active display fields and complete metadata.

4. **Event Photo Gallery**:
   - Photos are loaded per event folder:
     - Event Serial Number 1: `EventPhotos\Event01`
     - Event Serial Number 2: `EventPhotos\Event02`
     - Event Serial Number $N$: `EventPhotos\Event{NN}`
   - **Fullscreen Interactive Lightbox**:
     - High-resolution viewer with zoom animation.
     - Previous / Next navigation controls (`←`, `→` arrow keys).
     - Image counter (`1 / 3`), titles, and captions.
     - Direct photo download capability.
   - **Drag-and-Drop / Local Photo Uploader**:
     - Allows instant in-browser preview of additional photos from local folders.

5. **Signature Yellow & Black Design System**:
   - Incorporates the official **Cyclers Thrissur** club logo in the header and footer.
   - High-contrast electric racing yellow (`#FEE715`) accents on dark asphalt backgrounds.
   - Typography: Google Fonts `Outfit` (bold athletic headings) and `Inter` (crisp UI body).

---

## 📁 Project Structure

```
CyclersThrissurEvents/
├── index.html                   # Main SPA container & semantic structure
├── styles.css                   # Yellow & Black cycling theme stylesheet
├── app.js                       # Core SPA controller, Sheet sync & routing
├── README.md                    # Project documentation
├── assets/
│   ├── favicon.svg              # Cycling helmet / bike SVG favicon
│   ├── logo_1.png               # Cyclers Thrissur logo (Dark text)
│   └── logo_2.png               # Cyclers Thrissur logo (White text for dark header)
└── EventPhotos/
    ├── manifest.json            # Photo manifest with captions & titles
    ├── Event01/                 # Photos for Event #01 (Jubilee)
    │   ├── photo1.jpg
    │   ├── photo2.jpg
    │   └── photo3.jpg
    └── Event02/                 # Photos for Event #02 (Hindu)
        ├── photo1.jpg
        ├── photo2.jpg
        └── photo3.jpg
```

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
2. **Add Photos**:
   - Create a folder: `EventPhotos\Event03` (matching the Serial Number).
   - Place photos (`photo1.jpg`, `photo2.jpg`, etc.) inside the folder.
   - Optionally register them in `EventPhotos\manifest.json` with custom titles and captions.
