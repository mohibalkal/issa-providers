export interface Subtitle {
  url: string;
  name: string;
  label?: string;
  lang?: string;
}

export interface Episode {
  episode: string;
  id: number;
  videoKey: string;
  hls: string;
  audio: {
    names: string[];
    order: number[];
  };
  cc: Subtitle[];
  duration: number;
  title: string;
  download: string;
  sections: string[];
  poster: string;
  preview: {
    src: string;
  };
  server?: string;
  hash?: string;
}

export interface Season {
  season: number;
  blocked: boolean;
  episodes: Episode[];
}

export interface InsertUnitResponse {
  status: string;
  message?: string;
  result: {
    seasons: Season[];
    server?: string;
    hash?: string;
  };
}
