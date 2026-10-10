import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ServiceWorkerRegistrar } from '@/components/service-worker';

export const metadata = {
  metadataBase: new URL('https://www.wingman33.com'),
  title: 'Wingman — Your friends swipe for you.',
  description: 'The Rutgers dating app where your friends swipe on your behalf.',
  applicationName: 'Wingman',
  // Icons come from the app-dir file conventions (app/icon.svg, app/apple-icon.png),
  // which take precedence over a metadata.icons object in the App Router.
  // iOS "Add to Home Screen": run full-screen with a translucent status bar.
  appleWebApp: {
    capable: true,
    title: 'Wingman',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport = {
  themeColor: '#e0447f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k='wingman-theme';var s=localStorage.getItem(k);var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=(s==='light'||s==='dark'||s==='warm')?s:(d?'dark':'light');var e=document.documentElement;e.classList.remove('dark','warm');if(t!=='light'){e.classList.add(t);}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen">
        {children}
        <Toaster />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
