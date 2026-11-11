# Lumen — Plain Image Search Engine (TypeScript)

A clean, distraction-free, high-resolution image discovery engine built with **TypeScript**, **semantic HTML5**, and **modern CSS**.

---

## 🎯 What's New & Core Principles

- **Pure & Plain Image Discovery**: Completely removed source switcher pills and orientation filter pills. The interface is clean, focused, and minimal.
- **No Saving Functionality**: Removed bookmarks, heart icons, saved collections, and drawers.
- **Realistic Photo Preview**: High-definition photographic presentation with deep ambient matte backdrop, true natural aspect ratios, creator attribution, realistic dimension tags (e.g. `4800 × 3200 px · Landscape`), and license specifications.
- **Direct High-Resolution Download**: One-click download button in both the grid cards and the realistic preview modal that immediately triggers a direct file download with clean file naming.
- **Built with TypeScript**: Completely rebuilt from scratch using strict TypeScript (`.ts` files compiled via `tsc`).

---

## 🚀 Getting Started

### 1. Compile TypeScript
```bash
npm run build
# or run the watcher
npm run watch
```

### 2. Run the Development Server
```bash
npm start
```
Then navigate to **http://127.0.0.1:4173** in your browser.

---

## 📁 Project Structure

```
IMAGE-SEARCH-ENGINE/
├── index.html            # Clean semantic HTML5 layout & realistic preview modal
├── package.json          # Node scripts and dependencies
├── tsconfig.json         # Strict TypeScript compiler options
├── server.js             # Lightweight local HTTP dev server
├── css/
│   └── styles.css        # Editorial typography, fluid masonry grid & realistic photo frame
├── src/
│   ├── types.ts          # ImageItem, SearchResult type contracts
│   ├── api.ts            # High-resolution REST API service
│   ├── lightbox.ts       # Realistic photo preview controller & direct download
│   └── app.ts            # Main application bootstrap & debounced search
└── dist/
    ├── api.js
    ├── app.js
    ├── lightbox.js
    └── types.js
```
