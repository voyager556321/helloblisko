import type { Metadata, Viewport } from "next";
import { Nunito_Sans } from "next/font/google";
import "./globals.css";

const nunito = Nunito_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HaloBlisko",
  description: "Znajdz pomoc blisko siebie",
  openGraph: { title: "HaloBlisko", description: "Znajdz pomoc blisko siebie" },
  applicationName: "HaloBlisko",
  appleWebApp: { capable: true, title: "HaloBlisko", statusBarStyle: "default" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F4F7FB",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body className={`${nunito.className} antialiased`}>{children}</body>
    </html>
  );
}
