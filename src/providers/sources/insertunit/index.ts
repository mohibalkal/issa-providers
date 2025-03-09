import { flags } from '@/entrypoint/utils/targets';
import { makeSourcerer } from '@/providers/base';
import { scrapeMovie } from './scrape-movie';
import { scrapeShow } from './scrape-show';

export const insertunitScraper = makeSourcerer({
  id: 'insertunit',
  name: 'Insertunit',
  disabled: false,
  rank: 200,
  flags: [flags.CORS_ALLOWED],
  scrapeMovie,
  scrapeShow,
});
