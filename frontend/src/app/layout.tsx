import './globals.css';
import './themes.css';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';

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

const inter = Inter({
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
        className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `try { var match = document.cookie.match(/(?:^|; )devatlas-theme=([^;]+)/); var theme = match ? decodeURIComponent(match[1]) : localStorage.getItem('devatlas-theme'); if (theme === 'terminal' || theme === 'coffee' || theme === 'forest') document.documentElement.dataset.theme = theme; } catch (error) {}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
