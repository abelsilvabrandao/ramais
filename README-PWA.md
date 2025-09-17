# PWA Setup for Ramais Intermarítima

This guide will help you set up the Progressive Web App (PWA) for the Ramais system.

## Prerequisites

1. Node.js (v14 or later)
2. npm (comes with Node.js)

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Generate Icons**
   - Place your `icone.png` file in the root directory
   - Run the icon generation script:
     ```bash
     node generate-icons.js
     ```
   - This will create all necessary icon sizes in the `icons` directory

3. **Deploy the Application**
   - Upload all files to your web server
   - Ensure the server is configured to serve the `manifest.json` file with the correct MIME type (`application/manifest+json`)
   - The site must be served over HTTPS (required for service workers)

## PWA Features

- **Installable**: Users can add the app to their home screen on both iOS and Android
- **Offline Access**: The app works offline after the first visit
- **Fast Loading**: Assets are cached for faster loading on subsequent visits
- **Native App Feel**: Runs in full-screen mode when launched from the home screen

## Testing the PWA

1. **Chrome DevTools**
   - Open DevTools (F12)
   - Go to the "Application" tab
   - Check "Service Workers" and "Manifest" sections
   - Use "Add to homescreen" in the "Application" > "Manifest" section

2. **Lighthouse Audit**
   - Open Chrome DevTools
   - Go to the "Lighthouse" tab
   - Run an audit for PWA

## Troubleshooting

- **Icons not showing up**
  - Verify all icon files were generated correctly
  - Check the paths in `manifest.json`
  - Clear site data and reload

- **App not installing**
  - Ensure the site is served over HTTPS
  - Check the console for any service worker errors
  - Verify the `start_url` in `manifest.json` is correct

## Browser Support

- Chrome for Android (v40+)
- Safari for iOS (11.3+)
- Samsung Internet (v4+)
- Microsoft Edge (v17+)
- Firefox for Android (v58+)

## License

This project is proprietary software of Intermarítima.
