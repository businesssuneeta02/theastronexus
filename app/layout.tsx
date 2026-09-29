import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TheAstroNexus | Ancient wisdom. Modern guidance.',
  description: 'Personalised astrology consultations, guidance and astrology courses from TheAstroNexus.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
