const DEFAULT_API_BASE_URL = 'https://move-x-xpress-production.up.railway.app';

function normalizeBaseUrl(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\/+$/, '');
}

export const API_BASE_URL =
  normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL) || DEFAULT_API_BASE_URL;
