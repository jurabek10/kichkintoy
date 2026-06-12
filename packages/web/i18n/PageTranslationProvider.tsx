"use client";

import type { ReactNode } from "react";
import { createInstance, type Resource } from "i18next";
import { I18nextProvider } from "react-i18next";
import initTranslations from "./server/initTranslations";

export default function PageTranslationsProvider({
  children,
  locale,
  namespaces,
  resources,
}: {
  children: ReactNode;
  locale: string;
  namespaces: string[];
  resources: Resource;
}) {
  const i18n = createInstance();

  void initTranslations(locale, namespaces, i18n, resources);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
