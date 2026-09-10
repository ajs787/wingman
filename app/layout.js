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
            __html: `(function(){try{var key='wingman-theme';var saved=localStorage.getItem(key);var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var theme=saved||(prefersDark?'dark':'light');if(theme==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
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
