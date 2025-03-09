export interface EE3Stream {
  url: string;
  quality: string;
  type?: 'hls' | 'mp4';
  label?: string;
  size?: string;
  default?: boolean;
}

export interface EE3Subtitle {
  url: string;
  lang: string;
  language?: string;
  label?: string;
  kind?: string;
}

export interface EE3Response {
  status: boolean;
  message?: string;
  result?: {
    sources: EE3Stream[];
    subtitles?: EE3Subtitle[];
    server?: string;
    title?: string;
    hash?: string;
    quality?: string;
    backup_sources?: EE3Stream[];
  };
} 