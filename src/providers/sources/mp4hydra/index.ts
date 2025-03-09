import { flags } from '@/entrypoint/utils/targets';
import { makeSourcerer } from '@/providers/base';
import { getStreamUrl } from './scrape';

export const mp4HydraScraper = makeSourcerer({
  id: 'mp4hydra',
  name: 'Mp4Hydra',
  rank: 300,
  flags: [flags.CORS_ALLOWED],
  disabled: false,
  scrapeMovie: getStreamUrl,
  scrapeShow: getStreamUrl,
});
