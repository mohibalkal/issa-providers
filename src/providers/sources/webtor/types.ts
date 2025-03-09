export interface WebtorStream {
  url: string;
  quality?: string;
  size?: string;
  type?: string;
}

export interface WebtorFile {
  name: string;
  length: number;
  path: string;
  type: string;
}

export interface WebtorResponse {
  files: WebtorFile[];
  infoHash: string;
  name: string;
  length: number;
  pieceLength: number;
  lastPieceLength: number;
  announce: string[];
  urlList: string[];
  comment?: string;
  createdBy?: string;
  creationDate?: number;
  private?: boolean;
}

export interface WebtorSearchResponse {
  magnets: string[];
}

export interface WebtorStreamResponse {
  streamUrl: string;
}
