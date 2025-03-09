export interface AstraStream {
  url: string;
  quality: string;
  type?: 'hls' | 'mp4';
  label?: string;
  size?: string;
}

export interface AstraSubtitle {
  url: string;
  lang: string;
  language?: string;
  label?: string;
}

export interface AstraResponse {
  status: boolean;
  message?: string;
  result?: {
    sources: AstraStream[];
    subtitles?: AstraSubtitle[];
    server?: string;
    title?: string;
    hash?: string;
    quality?: string;
  };
} 