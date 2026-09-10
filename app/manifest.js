// Web App Manifest (Next.js metadata route -> served at /manifest.webmanifest).
// Makes Wingman installable as a PWA / "Add to Home Screen".
export default function manifest() {
  return {
    name: 'Wingman — Your friends swipe for you',
    short_name: 'Wingman',
    description:
      'The Rutgers dating app where your friends swipe on your behalf. A match only forms when both crews swipe right.',
    // Launch straight into the app; middleware sends signed-out users to /login.
    start_url: '/feed',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    // Splash/launch background (dark, so the pink icon tile pops) + brand toolbar color.
    background_color: '#17110f',
    theme_color: '#e0447f',
    categories: ['social', 'lifestyle'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
