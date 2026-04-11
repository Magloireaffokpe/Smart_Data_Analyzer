// src/lib/api.ts

import type { FullResponse, SummaryResponse } from '@/types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Upload un fichier et demande l'analyse complète (mode full)
 */
export async function analyzeFull(file: File, useAi: boolean = true): Promise<FullResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const url = new URL(`${API_BASE_URL}/analyze/full`);
  url.searchParams.append('use_ai', String(useAi));

  const response = await fetch(url.toString(), {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || `Erreur ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Upload un fichier et demande l'analyse résumée (mode summary)
 * @param target - colonne cible optionnelle
 */
export async function analyzeSummary(
  file: File,
  target?: string,
  useAi: boolean = true
): Promise<SummaryResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const url = new URL(`${API_BASE_URL}/analyze/summary`);
  if (target) url.searchParams.append('target', target);
  url.searchParams.append('use_ai', String(useAi));

  const response = await fetch(url.toString(), {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || `Erreur ${response.status}: ${response.statusText}`);
  }

  return response.json();
}