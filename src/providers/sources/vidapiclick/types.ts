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
