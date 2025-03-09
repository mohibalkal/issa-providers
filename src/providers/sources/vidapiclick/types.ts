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

export interface VidApiClickResponse {
  streams: VidApiClickStream[];
  success?: boolean;
  message?: string;
}
