# AlmostMine Mobile & PWA Test Guide

This document details verification protocols for running AlmostMine as an installable Progressive Web App (PWA) across Android and iOS devices.

---

## 1. Android Chrome Installation Protocol
1. Open the published URL in Google Chrome for Android (`https://...`).
2. Verify the custom install banner or tap the **Install App** button in the header or in **Settings > Appearance**.
3. Confirm the system installation dialog displays the app name "AlmostMine", forest green AM icon, and description.
4. Open the installed AlmostMine icon from the home screen / app launcher.
5. Verify it launches in full `standalone` window mode (no browser URL bar or Chrome bottom navigation).

---

## 2. iOS Safari "Add to Home Screen" Protocol
1. Open the application in Apple Safari on iOS.
2. Tap the browser **Share** button in the center of the Safari bottom toolbar.
3. Scroll down and select **Add to Home Screen**.
4. Confirm the preview shows the high-resolution 180px AM rounded square icon and title "AlmostMine".
5. Launch AlmostMine from the iOS Home Screen. Verify full-screen display without Safari browser chrome.

---

## 3. Standalone Sign-In Behavior
- **Desktop / Regular Browser**: Uses standard `signInWithPopup` with Google Auth.
- **Mobile Standalone Mode**: Automatically invokes `signInWithRedirect` with `getRedirectResult` on startup to ensure seamless authentication without external popup window blocking inside the standalone WebApp container.
- *Domain Setup Note*: Ensure the Firebase authorized domains list in the Firebase console includes your hosting / applet domain.

---

## 4. Offline Fallback Verification
1. Load the application while connected to the internet to allow the service worker (`/sw.js`) to cache static assets and `/offline.html`.
2. Toggle device into **Airplane Mode** (or disable network in Chrome DevTools).
3. Attempt to navigate to a new route.
4. Verify `/offline.html` displays with the AlmostMine branded card, informing the user of the connection state with a "Retry Connection" button.
5. Restore network connectivity and verify clicking retry restores the app.

---

## 5. Camera & Photo Upload Handling
1. Navigate to **Add an Item** (`/items/new`) or **Settings > Profile**.
2. Tap "Add photo" or "Change avatar".
3. On mobile, confirm the device offers options:
   - "Take Photo" (hardware camera)
   - "Photo Library" (device storage)
4. Upload a photo: confirm it is resized on the client canvas to under 1024px JPEG (under 250KB) before saving.
5. HEIC photos display a friendly, clear prompt if native decode is unsupported.

---

## 6. Safe Area Insets (Notch & Home Bar)
- Header includes `safe-top` padding utilizing `env(safe-area-inset-top)`.
- Mobile bottom navigation includes `safe-bottom` padding utilizing `env(safe-area-inset-bottom)`.
- Sticky Save & Discard bar in Settings floats above the mobile tab bar with proper safe margins.
- Viewport uses `viewport-fit=cover` and dynamic viewport units (`dvh` instead of `100vh`) to prevent address bar jitter.

---

## 7. Responsiveness & Accessibility
- **Screen Widths**: Verified layout down to 360px viewport width with no horizontal overflow.
- **Touch Targets**: All primary buttons and touch controls are at least 44px in height.
- **Form Inputs**: Text inputs use 16px font size on mobile to prevent automatic iOS Safari zoom-in on focus.
- **Typography Scale**: Supports user text-size settings (`small`, `medium`, `large`).
- **Dark Mode**: Persists system or user choice (`light`, `dark`, `system`) before first paint to prevent white flash.
- **Hardware Back Button**: Android system back button traverses React Router navigation history cleanly.
