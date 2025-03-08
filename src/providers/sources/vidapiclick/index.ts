import { flags } from '@/entrypoint/utils/targets';
import { makeSourcerer } from '@/providers/base';
import { getStreamUrl } from './scrape';

export const vidapiClickScraper = makeSourcerer({
  id: 'vidapiclick',
  name: 'VidAPI',
  rank: 4,
  flags: [flags.CORS_ALLOWED],
  scrapeMovie: getStreamUrl,
  scrapeShow: getStreamUrl,
});
