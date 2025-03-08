export const flags = {
  CORS_ALLOWED: 'cors-allowed',
  WATERMARK: 'watermark',
  DIRECT_STREAM: 'direct-stream',
  HIGH_QUALITY: 'high-quality',
  LOW_QUALITY: 'low-quality',
  REGIONAL: 'regional',
  IP_LOCKED: 'ip-locked',
  SLOW: 'slow',
  FAST: 'fast',
  BROKEN: 'broken',
  UNSTABLE: 'unstable',
  STABLE: 'stable',
  RISKY: 'risky',
  SAFE: 'safe',
  PREMIUM: 'premium',
  FREE: 'free',
} as const;

export type Flags = (typeof flags)[keyof typeof flags];
