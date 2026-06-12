import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { Toaster } from "@/components/ui/sonner";
import LayoutTranslationsProvider from "@/i18n/LayoutTranslationsProvider";
import initTranslations from "@/i18n/server/initTranslations";
import { cookieName, fallbackLng, isSupportedLanguage } from "@/i18n/settings";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Kichkintoy",
  description: "Kindergarten communication platform for Uzbekistan",
};

const layoutNamespaces = [
  "common",
  "nav",
  "app",
  "reports",
  "classes",
  "attendance",
];

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const requestedLanguage = cookieStore.get(cookieName)?.value ?? fallbackLng;
  const language = isSupportedLanguage(requestedLanguage)
    ? requestedLanguage
    : fallbackLng;
  const { resources } = await initTranslations(language, layoutNamespaces);

  return (
    <html lang={language} className={inter.variable}>
      <body className="font-sans">
        <LayoutTranslationsProvider
          namespaces={layoutNamespaces}
          locale={language}
          resources={resources}
        >
          <Providers>{children}</Providers>
        </LayoutTranslationsProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
