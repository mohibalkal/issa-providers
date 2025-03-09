export interface VidSrcSource {
  url: string;
  quality: string;
  type: 'hls' | 'mp4' | string;
  label?: string;
  size?: string;
}

export interface VidSrcSubtitle {
  url: string;
  lang: string;
  language: string;
  label?: string;
}

export interface VidSrcResponse {
  status: boolean;
  message?: string;
  result?: {
    sources: VidSrcSource[];
    subtitles?: VidSrcSubtitle[];
    server?: string;
    title?: string;
    hash?: string;
  };
} 