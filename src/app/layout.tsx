import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Lora, Roboto } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { NavBar } from "@/components/NavBar";
import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";

// Polices reprises du site de l'association (gatinemois.com) : Lora pour les
// titres, Roboto pour le texte courant.
const lora = Lora({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const roboto = Roboto({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "La Gâtinelle",
  description: "Gestion de la monnaie locale la Gâtinelle",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Gâtinelle",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f8fc0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${lora.variable} ${roboto.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Script id="register-sw" strategy="beforeInteractive">
          {`if ("serviceWorker" in navigator) { navigator.serviceWorker.register("/sw.js").catch(function(){}); }`}
        </Script>
        <Providers>
          <NavBar />
          <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 pb-24 md:pb-8">{children}</main>
          <Footer />
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
