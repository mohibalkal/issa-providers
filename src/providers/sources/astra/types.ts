export interface AstraStream {
  url: string;
  quality: string;
}

export interface AstraResponse {
  streams: AstraStream[];
} 