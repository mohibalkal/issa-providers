export interface WebtorStream {
  url: string;
  quality?: string;
  size?: string;
  type?: string;
}

export interface WebtorResponse {
  streams: WebtorStream[];
  title?: string;
  hash?: string;
}
