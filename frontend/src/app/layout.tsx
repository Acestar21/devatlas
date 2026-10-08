import './globals.css';
import './themes.css';
import './tokens.css';
import { JetBrains_Mono, Outfit, Space_Grotesk } from 'next/font/google';
import { THEME_IDS } from '@/themes/registry';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});


export const metadata = {
  title: 'DevAtlas',
  description: 'The identity layer for developers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${outfit.variable} ${jetbrainsMono.variable}`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `try { var validThemes = ${JSON.stringify(THEME_IDS)}; var match = document.cookie.match(/(?:^|; )devatlas-theme=([^;]+)/); var theme = match ? decodeURIComponent(match[1]) : localStorage.getItem('devatlas-theme'); if (validThemes.indexOf(theme) !== -1) document.documentElement.dataset.theme = theme; } catch (error) {}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
