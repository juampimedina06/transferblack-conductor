/**
 * Centralized theme tokens for the Trip Offer Liquid Glass Card.
 * Modify these tokens to quickly adjust glass intensity, opacity, borders and palette.
 */
export interface TripOfferTheme {
  isDark: boolean;

  // Glass Surface Tokens (modify here to adjust glass level across the card)
  blurIntensity: number; // BlurView intensity (40 - 60 recommended)
  glassOpacity: number; // Base surface opacity
  borderOpacity: number; // 1px border opacity
  specularOpacity: number; // 1px top specular highlight line
  glassBackground: string; // Underlying tinted background
  glassBorderColor: string; // Border RGBA
  innerSurfaceBg: string; // Internal card container background
  innerSurfaceBorder: string; // Internal card container border

  // Brand Accents (TransferBlack Signature Gold & Emerald)
  accent: string; // Gold #D4AF37
  accentForeground: string; // Text on accent button
  accentSoft: string; // Gold soft glow/badge background
  accentBorder: string; // Gold badge border
  cashAccent: string; // Emerald #10B981 for cash trips
  cashSoft: string; // Emerald soft badge background
  cashBorder: string; // Emerald badge border
  urgentAccent: string; // Red/Amber for expiring timer (< 5s)
  urgentSoft: string;

  // Typography & Content
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textSubtle: string;

  // Layout & Geometry
  radiusCard: number; // Concentric outer radius: 32
  radiusInner: number; // Concentric inner radius: 20
  radiusPill: number; // Pill badges: 999
  paddingHorizontal: number; // Internal padding: 22
  paddingVertical: number; // 20
}

export const getTripOfferTheme = (isDark: boolean): TripOfferTheme => {
  if (isDark) {
    return {
      isDark: true,
      blurIntensity: 50,
      glassOpacity: 0.82,
      borderOpacity: 0.32,
      specularOpacity: 0.45,
      glassBackground: 'rgba(10, 11, 16, 0.82)',
      glassBorderColor: 'rgba(255, 255, 255, 0.25)',
      innerSurfaceBg: 'rgba(255, 255, 255, 0.04)',
      innerSurfaceBorder: 'rgba(255, 255, 255, 0.12)',

      accent: '#D4AF37',
      accentForeground: '#0A0A0C',
      accentSoft: 'rgba(212, 175, 55, 0.15)',
      accentBorder: 'rgba(212, 175, 55, 0.35)',

      cashAccent: '#34D399',
      cashSoft: 'rgba(52, 211, 153, 0.14)',
      cashBorder: 'rgba(52, 211, 153, 0.35)',

      urgentAccent: '#EF4444',
      urgentSoft: 'rgba(239, 68, 68, 0.16)',

      textPrimary: '#FFFFFF',
      textSecondary: '#E2E8F0',
      textMuted: '#94A3B8',
      textSubtle: '#64748B',

      radiusCard: 32,
      radiusInner: 20,
      radiusPill: 999,
      paddingHorizontal: 22,
      paddingVertical: 20,
    };
  }

  // Light Mode (Uber-luxury crisp frosted glass)
  return {
    isDark: false,
    blurIntensity: 55,
    glassOpacity: 0.88,
    borderOpacity: 0.35,
    specularOpacity: 0.65,
    glassBackground: 'rgba(255, 255, 255, 0.85)',
    glassBorderColor: 'rgba(255, 255, 255, 0.65)',
    innerSurfaceBg: 'rgba(15, 23, 42, 0.04)',
    innerSurfaceBorder: 'rgba(15, 23, 42, 0.08)',

    accent: '#C59A27',
    accentForeground: '#0A0A0C',
    accentSoft: 'rgba(197, 154, 39, 0.16)',
    accentBorder: 'rgba(197, 154, 39, 0.38)',

    cashAccent: '#059669',
    cashSoft: 'rgba(5, 150, 105, 0.12)',
    cashBorder: 'rgba(5, 150, 105, 0.32)',

    urgentAccent: '#DC2626',
    urgentSoft: 'rgba(220, 38, 38, 0.14)',

    textPrimary: '#0F172A',
    textSecondary: '#1E293B',
    textMuted: '#475569',
    textSubtle: '#64748B',

    radiusCard: 32,
    radiusInner: 20,
    radiusPill: 999,
    paddingHorizontal: 22,
    paddingVertical: 20,
  };
};
