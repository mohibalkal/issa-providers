export interface Mp4HydraStream {
  url: string;
  quality: string;
}

export interface Mp4HydraCaption {
  id: string;
  url: string;
  language: string;
  type?: 'srt' | 'vtt';
}

export interface Mp4HydraResponse {
  streams: Mp4HydraStream[];
  captions?: Mp4HydraCaption[];
}
