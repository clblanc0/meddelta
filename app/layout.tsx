import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'MedDelta | Discharge review',
  description:
    'Compare synthetic discharge medication instructions and inspect the source evidence. An early MedDelta prototype.',
  icons: { icon: '/meddelta-logo.png' },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
