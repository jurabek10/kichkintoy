import type { Metadata } from "next";
import { Inter, Baloo_2, Comfortaa } from "next/font/google";
import { cookies } from "next/headers";
import LayoutTranslationsProvider from "@/i18n/LayoutTranslationsProvider";
import initTranslations from "@/i18n/server/initTranslations";
import {
  cookieName,
  fallbackLng,
  isSupportedLanguage,
} from "@kichkintoy/translations/settings";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  display: "swap",
  variable: "--font-inter",
});

// Chunky rounded font for the Kichkintoy wordmark and display headings —
// the same brand face the web app uses.
const baloo = Baloo_2({
  weight: ["600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-brand",
});

// Rounded fallback with Cyrillic coverage — Baloo 2 is Latin-only, so
// Russian display headings fall through to Comfortaa (same as the web app).
const comfortaa = Comfortaa({
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
  variable: "--font-kids",
});

const layoutNamespaces = ["home"];

async function resolveLanguage() {
  const cookieStore = await cookies();
  const requested = cookieStore.get(cookieName)?.value ?? fallbackLng;
  return isSupportedLanguage(requested) ? requested : fallbackLng;
}

export async function generateMetadata(): Promise<Metadata> {
  const language = await resolveLanguage();
  const { t } = await initTranslations(language, layoutNamespaces);
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const language = await resolveLanguage();
  const { resources } = await initTranslations(language, layoutNamespaces);

  return (
    <html
      lang={language}
      className={`${inter.variable} ${baloo.variable} ${comfortaa.variable}`}
    >
      <body className="font-sans">
        <LayoutTranslationsProvider
          namespaces={layoutNamespaces}
          locale={language}
          resources={resources}
        >
          {children}
        </LayoutTranslationsProvider>
      </body>
    </html>
  );
}
