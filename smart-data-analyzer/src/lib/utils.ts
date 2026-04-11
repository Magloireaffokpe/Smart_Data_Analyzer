// src/lib/utils.ts

// ============================================================
// LOADING STEPS (utilisé dans LoadingScreen.tsx)
// ============================================================
export const LOADING_STEPS = [
  { label: 'Loading file…', ms: 800 },
  { label: 'Parsing data types…', ms: 600 },
  { label: 'Computing statistics…', ms: 1000 },
  { label: 'Calculating correlations…', ms: 1200 },
  { label: 'Calling AI model…', ms: 1400 },
  { label: 'Generating insights…', ms: 800 },
];

// ============================================================
// FORMATAGE NOMBRE
// ============================================================
export function fmt(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  // Arrondi à 2 décimales si petit, sinon séparateur de milliers
  if (Math.abs(value) < 0.01 && value !== 0) return value.toExponential(2);
  if (Number.isInteger(value)) return value.toLocaleString('fr-FR');
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

// ============================================================
// QUALITÉ COULEUR (pour les badges)
// ============================================================
export function qualityColor(label: string): string {
  switch (label) {
    case 'excellent':
      return 'tag-mint';
    case 'good':
      return 'tag-indigo';
    case 'moderate':
      return 'tag-amber';
    case 'poor':
      return 'tag-coral';
    default:
      return 'tag-cream';
  }
}