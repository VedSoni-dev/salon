import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-serif", subsets: ["latin"], weight: "400" });

const TITLE = "Salon: group chats with anyone in history";
const DESCRIPTION =
  "Chat one-on-one with AI characters, or put Einstein and Joe Rogan in a group chat and watch. Make your own character in one sentence. Free and open source.";
const OG_IMAGE = { url: "/media/og.jpg", width: 1200, height: 630, alt: "Salon's home screen: pick your people for a group chat" };

export const metadata: Metadata = {
  metadataBase: new URL("https://salon-gc.vercel.app"),
  title: TITLE,
  description: DESCRIPTION,
  icons: { icon: "/icon.svg" },
  openGraph: { type: "website", siteName: "Salon", url: "/", title: TITLE, description: DESCRIPTION, images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [OG_IMAGE.url] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f2ec" },
    { media: "(prefers-color-scheme: dark)", color: "#110f12" },
  ],
};

// No sign-in here: the landing page at / is public. Only the software at /app is behind Sign in with publik.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} h-full antialiased`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
