import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// The public site links into the web app for auth. Point NEXT_PUBLIC_APP_URL
// at the deployed web app; locally it falls back to the dev server.
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const loginUrl = `${appUrl}/login`;
export const signupUrl = `${appUrl}/signup`;
