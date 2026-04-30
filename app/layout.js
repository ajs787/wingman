import { Bricolage_Grotesque, Manrope } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

const displayFont = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const bodyFont = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata = {
  title: 'Wingman — Your friends swipe for you.',
  description: 'The Rutgers dating app where your friends swipe on your behalf.',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`} suppressHydrationWarning>
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
      </body>
    </html>
  );
}
