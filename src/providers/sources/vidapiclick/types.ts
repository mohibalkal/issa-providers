export interface VidapiStream {
  url: string;
  quality: string;
  type: string;
}

export interface VidapiResponse {
  streams: VidapiStream[];
  subtitles?: {
    url: string;
    lang: string;
  }[];
}

export interface VidApiClickStream {
  file: string;
  label?: string;
  type?: string;
}

export interface VidApiClickSource {
  file: string;
  label?: string;
  type?: string;
}

export interface VidApiClickSubtitle {
  file: string;
  label: string;
  kind: string;
}

export interface VidApiClickResponse {
  success: boolean;
  data?: {
    sources: VidApiClickSource[];
    tracks?: VidApiClickSubtitle[];
  };
  message?: string;
}
