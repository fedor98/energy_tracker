# Icon and PWA Setup Guide

This document explains how the favicon and Progressive Web App (PWA) icons are set up for the Energy Tracker application, based on the Lucide React Zap icon design.

## Overview

The application uses a lightning bolt (Zap) icon from Lucide React as the basis for all icons. This creates a consistent brand identity across browser tabs, mobile home screens, and app launchers.

**Important:** The SVG source is created at high resolution (512x512 viewBox) to ensure crisp rendering on modern high-DPI displays. This prevents pixelation when scaled to large sizes like 1024x1024.

## Icon Files

All icon files are located in the `public/` directory:

| File | Size | Purpose | Background |
|------|------|---------|------------|
| `favicon.svg` | Scalable (512x512 viewBox) | Browser tab icon (modern browsers) | Transparent |
| `favicon-16x16.png` | 16x16 | Legacy browser fallback | Transparent |
| `favicon-32x32.png` | 32x32 | Legacy browser fallback | Transparent |
| `apple-touch-icon.png` | 180x180 | iOS home screen icon | Indigo (#4f46e5) |
| `icon-192.png` | 192x192 | PWA icon (Android) | Indigo (#4f46e5) |
| `icon-512.png` | 512x512 | PWA icon (Android) | Indigo (#4f46e5) |
| `icon-1024.png` | 1024x1024 | PWA icon (high-res Android/iOS) | Indigo (#4f46e5) |

## Where to Place Icon Files

**All icon files must be placed in the `frontend/public/` directory.**

This is the only directory from which files are served at the root path (`/`). React Router (and most React frameworks) automatically serves files in `public/` at the root URL.

```
frontend/
├── public/                    ← Put all icon files here
│   ├── favicon.svg
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── apple-touch-icon.png
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-1024.png
│   └── manifest.json
├── app/
│   └── root.tsx              ← References icons via "/favicon.svg"
└── ...
```

**Important:** Do NOT place icons in `app/`, `src/`, or other directories. They won't be accessible at the root URL and browsers won't find them.

## SVG Favicon Design

The SVG favicon (`favicon.svg`) uses a high-resolution version of the Zap icon:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none" stroke="#eab308" stroke-width="40" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="208 32 48 224 192 224 176 352 336 160 192 160 208 32"/>
</svg>
```

**Why 512x512 viewBox?**
- Lucide icons are designed at 24x24, but we need high resolution for mobile home screens
- A 32x32 viewBox scaled to 1024x1024 results in pixelated, blurry icons
- 512x512 provides 16x more detail, ensuring crisp icons at all sizes
- The stroke-width is scaled proportionally (2.5 × 16 = 40)
- The polygon coordinates are scaled from the original 32x32 design

**Scaling Math:**
```
Original viewBox: 32x32
New viewBox: 512x512 (32 × 16 = 512)
Original stroke-width: 2.5
New stroke-width: 40 (2.5 × 16 = 40)
Original point: 13,2
New point: 208,32 (13 × 16 = 208, 2 × 16 = 32)
```

**Color:** Yellow (#eab308) - matches the ElectricityIcon component

## Generating PNG Icons from SVG

### Prerequisites

You need ImageMagick installed (version 7 or later):

```bash
# macOS
brew install imagemagick

# Ubuntu/Debian
sudo apt-get install imagemagick

# Check version
magick --version
```

### Generation Commands

Navigate to the `public/` directory and run these commands:

```bash
cd frontend/public

# Remove old icons (optional but recommended)
rm -f favicon-16x16.png favicon-32x32.png apple-touch-icon.png icon-192.png icon-512.png icon-1024.png

# Small favicons (transparent background)
magick favicon.svg -resize 16x16 favicon-16x16.png
magick favicon.svg -resize 32x32 favicon-32x32.png

# PWA icons with indigo background (matches app theme)
magick favicon.svg -background "#4f46e5" -resize 180x180 -gravity center -extent 180x180 apple-touch-icon.png
magick favicon.svg -background "#4f46e5" -resize 192x192 -gravity center -extent 192x192 icon-192.png
magick favicon.svg -background "#4f46e5" -resize 512x512 -gravity center -extent 512x512 icon-512.png
magick favicon.svg -background "#4f46e5" -resize 1024x1024 -gravity center -extent 1024x1024 icon-1024.png

# Verify all files were created
ls -lh *.png
```

**Notes:**
- The `-extent` flag ensures the icon is centered on the colored background
- PWA icons need a background color because iOS/Android don't support transparent app icons well
- The indigo color (#4f46e5) matches the primary color used in the application
- Always generate from the high-res SVG to avoid pixelation

### Why 1024x1024?

Modern iPhones and Android devices have very high-DPI displays:
- iPhone 14 Pro: 460 ppi
- Samsung Galaxy S23: 425 ppi

A 180x180 or 192x192 icon appears blurry on these screens. Including a 1024x1024 icon ensures:
- Crisp icons on all current and future devices
- The OS can downscale instead of upscaling (which causes blur)
- Future-proof for even higher resolution displays

## PWA Manifest

The `manifest.json` file configures how the app appears when installed on mobile devices:

```json
{
  "name": "Energy Tracker",
  "short_name": "Energy Tracker",
  "description": "Track your electricity, water, and gas consumption with ease",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4f46e5",
  "orientation": "portrait-primary",
  "scope": "/",
  "lang": "en",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-1024.png",
      "sizes": "1024x1024",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### Key Fields

- **`short_name`**: Maximum 12 characters for home screen labels
- **`display: standalone`**: Removes browser UI, feels like native app
- **`theme_color`**: Affects Android status bar and task switcher
- **`purpose: maskable`**: Allows Android to crop the icon to different shapes

### Adding the Manifest

The manifest must be linked in `app/root.tsx`:

```tsx
export const links: Route.LinksFunction = () => [
  { rel: "manifest", href: "/manifest.json" },
  // ... other links
];
```

## Meta Tags in root.tsx

The application includes these meta tags in the HTML head:

```tsx
<meta name="theme-color" content="#4f46e5" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Energy Tracker" />
<meta name="application-name" content="Energy Tracker" />
<meta name="mobile-web-app-capable" content="yes" />
```

And these link tags:

```tsx
{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
{ rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
{ rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
{ rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
{ rel: "manifest", href: "/manifest.json" },
```

## Adding to Home Screen

### iOS (Safari)

1. Open the Energy Tracker app in Safari
2. Tap the share button (square with arrow up)
3. Scroll down and tap "Add to Home Screen"
4. The app icon will appear with the yellow Zap on indigo background
5. **Important:** If you previously added the app, delete it first and re-add to see the updated high-res icon

### Android (Chrome)

1. Open the Energy Tracker app in Chrome
2. Tap the menu (three dots)
3. Select "Add to Home screen" or "Install app"
4. The app will install as a PWA with offline capabilities
5. **Note:** Chrome may cache the old icon - clear Chrome's cache if the new icon doesn't appear

## Customizing the Icon

To change the icon design:

1. **Edit `favicon.svg`** in `frontend/public/`
2. **Keep 512x512 viewBox** for high resolution
3. **Scale stroke-width proportionally** (if changing size)
4. **Regenerate PNGs** - Run the ImageMagick commands above
5. **Update app colors** - Ensure `manifest.json` and meta tags use matching colors
6. **Clear browser caches** on mobile devices to see changes

## Troubleshooting

### Icon not showing in browser tab

- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Check that `favicon.svg` is accessible at `/favicon.svg`
- Verify the link tags are in the correct order (SVG first, then PNG fallbacks)
- Ensure the file is in `frontend/public/`, not in `app/` or elsewhere

### iOS shows pixelated/generic icon

**Most common cause:** Using a low-resolution SVG (32x32 viewBox) scaled up

**Solutions:**
- Verify `favicon.svg` has `viewBox="0 0 512 512"`
- Check that `apple-touch-icon.png` is exactly 180x180 pixels
- The icon must have a solid background (not transparent)
- **Delete the existing home screen icon** and re-add it
- Restart Safari or reboot device to clear icon cache

### Android shows pixelated/generic icon

- Check that `manifest.json` is served with `Content-Type: application/json`
- Verify icons are accessible at their specified paths
- Ensure `icon-192.png` exists for the install prompt
- Clear Chrome cache: Settings → Privacy → Clear browsing data → Cached images and files

### Icons appear blurry after regeneration

**Cause:** ImageMagick is caching an old render of the SVG

**Solution:**
```bash
# Force ImageMagick to re-read the SVG
magick -version  # Check it's using the latest
rm -f *.png
magick favicon.svg ...  # Regenerate with fresh read
```

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| SVG Favicon | 80+ | 41+ | 9+ | 80+ |
| PWA Install | All | No | 16.4+ (limited) | All |
| Maskable Icons | 78+ | No | No | 78+ |
| Theme Color | All | No | 15+ | All |

## References

- [Lucide React Icons](https://lucide.dev/)
- [MDN Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Apple Web Apps Guide](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
- [Google PWA Documentation](https://web.dev/progressive-web-apps/)
- [ImageMagick Documentation](https://imagemagick.org/script/command-line-processing.php)
