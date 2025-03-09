import { Embed, Sourcerer } from '@/providers/base';
import { insertunitScraper } from '@/providers/sources/insertunit';
import { uiraLiveScraper } from '@/providers/sources/uiralive';
import { vidApiClickScraper } from '@/providers/sources/vidapiclick';

import { astraScraper } from './sources/astra';
import { ee3Scraper } from './sources/ee3';
import { embedSuScraper } from './sources/embedsu';
import { mp4HydraScraper } from './sources/mp4hydra';
import { orionScraper } from './sources/orion';
import { vidsrcScraper } from './sources/vidsrc';
import { vidsrcSuScraper } from './sources/vidsrcsu';
import { webtorScraper } from './sources/webtor';

export function gatherAllSources(): Array<Sourcerer> {
  // all sources are gathered here
  return [
    mp4HydraScraper,
    insertunitScraper,
    vidsrcScraper,
    astraScraper,
    orionScraper,
    webtorScraper,
    ee3Scraper,
    vidsrcSuScraper,
    embedSuScraper,
    uiraLiveScraper,
    vidApiClickScraper
  ];
}

export function gatherAllEmbeds(): Array<Embed> {
  // all embeds are gathered here
  return [];
}
