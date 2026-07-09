"use client";

import { createContext, createElement, useMemo, type ReactNode } from "react";
import { createInstance, type Resource } from "i18next";
import initTranslations from "./server/initTranslations";

export const I18nLayoutContext = createContext<any>(undefined);

function I18LayoutProvider({
  i18n,
  defaultNS,
  children,
}: {
  i18n: unknown;
  defaultNS?: string;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ i18n, defaultNS }), [i18n, defaultNS]);
  return createElement(I18nLayoutContext.Provider, { value }, children);
}

export default function LayoutTranslationsProvider({
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

  return <I18LayoutProvider i18n={i18n}>{children}</I18LayoutProvider>;
}
