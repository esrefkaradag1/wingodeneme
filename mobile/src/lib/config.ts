/** Canlı Wingo Deneme API — mevcut backend'e dokunmadan okur. */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://api.wingodeneme.com/api/v1';

export const WINGOLINK_URL = 'https://wingolink.com.tr';

export type PlatformMode = 'yks_lgs' | 'kpss';

export const DEFAULT_PLATFORM: PlatformMode = 'yks_lgs';
