"use client";

import { useContext } from "react";
import { useTranslation as useTrans } from "react-i18next";
import { I18nLayoutContext } from "./LayoutTranslationsProvider";

type UseTranslationArguments = Parameters<typeof useTrans>;
type UseTranslationReturnType = ReturnType<typeof useTrans>;

export function useLayoutTranslation(
  ns?: UseTranslationArguments[0],
  options?: UseTranslationArguments[1],
): UseTranslationReturnType {
  const context = useContext(I18nLayoutContext);
  return useTrans(ns, { i18n: context?.i18n, ...options });
}
