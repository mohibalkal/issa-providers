export interface EmbedSuStream {
  file: string;
  label: string;
  type?: string;
  default?: boolean;
}

export interface EmbedSuSubtitle {
  file: string;
  label: string;
  language?: string;
  kind?: string;
}

export interface EmbedSuResponse {
  status: boolean;
  message?: string;
  result?: {
    sources: EmbedSuStream[];
    tracks?: EmbedSuSubtitle[];
    server?: string;
    title?: string;
    hash?: string;
  };
} 