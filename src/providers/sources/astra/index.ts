import { flags } from '@/entrypoint/utils/targets';
import { makeSourcerer } from '@/providers/base';
import { getStreamUrl } from './scrape';

export const astraScraper = makeSourcerer({
  id: 'astra',
  name: 'Astra',
  rank: 710,
  flags: [flags.CORS_ALLOWED],
  disabled: false,
  scrapeMovie: getStreamUrl,
  scrapeShow: getStreamUrl,
});
