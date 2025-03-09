import { flags } from '@/entrypoint/utils/targets';
import { makeSourcerer } from '@/providers/base';
import { scrapeInsertUnitMovie, scrapeInsertUnitShow } from './scrape';

export const insertunitScraper = makeSourcerer({
  id: 'insertunit',
  name: 'InsertUnit',
  disabled: false,
  rank: 200,
  flags: [flags.CORS_ALLOWED],
  scrapeMovie: scrapeInsertUnitMovie,
  scrapeShow: scrapeInsertUnitShow,
});
