export interface Mp4HydraStream {
  url: string;
  quality: string;
}

export interface Mp4HydraResponse {
  streams: Mp4HydraStream[];
}
