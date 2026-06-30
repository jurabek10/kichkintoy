/**
 * Icon/colour values for places Tailwind classes can't reach — chiefly the
 * `color` prop on `@expo/vector-icons`. Layout, spacing, radius, and surface
 * colours all live in Tailwind classes (see tailwind.config.js); these mirror
 * the same palette for imperative use.
 */
export const colors = {
  primary: '#3B8FF3',
  textPrimary: '#2B2D31',
  textSecondary: '#8A8F99',
  textMuted: '#AEB4BE',
} as const;
