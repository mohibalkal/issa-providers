import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';
import { NotFoundError } from '@/utils/errors';
import { flags } from '@/entrypoint/utils/targets';
import { WebtorResponse, WebtorFile } from './types';
import { buildStreamUrl, buildTorrentUrl, buildFileUrl, headers, baseUrl } from './utils';
import { SourcererOutput } from '@/providers/base';
import { Stream, FileBasedStream } from '@/providers/streams';

async function getMagnetLink(ctx: MovieScrapeContext | ShowScrapeContext): Promise<string> {
  try {
    const url = buildStreamUrl(ctx);
    console.log(`[Webtor] Fetching magnet link from: ${url}`);
    
    const response = await ctx.proxiedFetcher<{ magnet: string }>(url, {
      headers: {
        ...headers,
        'Referer': baseUrl
      }
    });

    if (!response?.magnet) {
      console.error('[Webtor] No magnet link found in response');
      throw new NotFoundError('No magnet link found');
    }

    console.log('[Webtor] Successfully retrieved magnet link');
    return response.magnet;
  } catch (error) {
    console.error('[Webtor] Error getting magnet link:', error);
    throw new NotFoundError('Failed to get magnet link');
  }
}

async function getTorrentInfo(ctx: MovieScrapeContext | ShowScrapeContext, infoHash: string): Promise<WebtorResponse> {
  try {
    const url = buildTorrentUrl(infoHash);
    console.log(`[Webtor] Fetching torrent info from: ${url}`);
    
    const response = await ctx.proxiedFetcher<WebtorResponse>(url, {
      headers: {
        ...headers,
        'Referer': baseUrl
      }
    });

    if (!response?.files?.length) {
      console.error('[Webtor] No files found in torrent');
      throw new NotFoundError('No files found in torrent');
    }

    console.log(`[Webtor] Found ${response.files.length} files in torrent`);
    return response;
  } catch (error) {
    console.error('[Webtor] Error getting torrent info:', error);
    throw new NotFoundError('Failed to get torrent info');
  }
}

function findVideoFiles(files: WebtorFile[]): WebtorFile[] {
  const videoExtensions = ['.mp4', '.mkv', '.avi', '.m4v', '.mov'];
  return files
    .filter(file => {
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      return videoExtensions.includes(ext);
    })
    .sort((a, b) => b.length - a.length); // Sort by size, largest first
}

function getQualityFromFileName(fileName: string): string {
  const qualityPatterns = [
    { pattern: /2160p|4k|uhd/i, quality: '2160p' },
    { pattern: /1080p|fhd/i, quality: '1080p' },
    { pattern: /720p|hd/i, quality: '720p' },
    { pattern: /480p|sd/i, quality: '480p' }
  ];

  for (const { pattern, quality } of qualityPatterns) {
    if (pattern.test(fileName)) {
      return quality;
    }
  }

  return 'unknown';
}

function processVideoFiles(files: WebtorFile[], infoHash: string, ctx: MovieScrapeContext | ShowScrapeContext): Stream[] {
  return files.map((file, index) => {
    const quality = getQualityFromFileName(file.name);
    console.log(`[Webtor] Processing file: ${file.name} (Quality: ${quality})`);

    const stream: FileBasedStream = {
      id: `webtor_${ctx.media.tmdbId}_${index}`,
      type: 'file',
      qualities: {
        [quality]: {
          type: 'mp4',
          url: buildFileUrl(infoHash, file.path)
        }
      },
      flags: [flags.CORS_ALLOWED],
      captions: [],
      preferredHeaders: {
        'Origin': baseUrl,
        'Referer': baseUrl
      },
      headers: {
        ...headers,
        'Referer': baseUrl
      }
    };

    return stream;
  });
}

export async function getStreamUrl(ctx: MovieScrapeContext | ShowScrapeContext): Promise<SourcererOutput> {
  try {
    console.log(`[Webtor] Starting stream extraction for ${ctx.media.type} with TMDB ID: ${ctx.media.tmdbId}`);
    
    // Get magnet link
    const magnetLink = await getMagnetLink(ctx);
    const infoHash = magnetLink.match(/btih:([a-fA-F0-9]+)/i)?.[1];
    
    if (!infoHash) {
      console.error('[Webtor] Could not extract info hash from magnet link');
      throw new NotFoundError('Invalid magnet link format');
    }

    // Get torrent info
    const torrentInfo = await getTorrentInfo(ctx, infoHash);
    
    // Find and process video files
    const videoFiles = findVideoFiles(torrentInfo.files);
    if (videoFiles.length === 0) {
      console.error('[Webtor] No video files found in torrent');
      throw new NotFoundError('No video files found');
    }

    console.log(`[Webtor] Found ${videoFiles.length} video files`);
    const streams = processVideoFiles(videoFiles, infoHash, ctx);

    // Validate streams
    const validStreams = streams.filter((stream): stream is Stream => {
      return stream.type === 'file' && 'qualities' in stream && Object.keys(stream.qualities).length > 0;
    });

    console.log(`[Webtor] Found ${validStreams.length} valid streams`);

    if (validStreams.length === 0) {
      throw new NotFoundError('No valid streams found');
    }

    return {
      stream: validStreams,
      embeds: []
    };
  } catch (error) {
    console.error('[Webtor] Error in getStreamUrl:', error);
    if (error instanceof NotFoundError) throw error;
    throw new NotFoundError('Failed to fetch streams');
  }
}
