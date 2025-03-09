export interface VidSrcSource {
  url: string;
  quality: string;
  type: string;
}

export interface VidSrcSubtitle {
  url: string;
  lang: string;
  language: string;
}

export interface VidSrcResponse {
  status: boolean;
  result: {
    sources: VidSrcSource[];
    subtitles: VidSrcSubtitle[];
  };
} 