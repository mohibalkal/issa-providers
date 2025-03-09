(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? factory(exports, require("iso-639-1"), require("form-data")) : typeof define === "function" && define.amd ? define(["exports", "iso-639-1", "form-data"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.index = {}, global["iso-639-1"], global["form-data"]));
})(this, function(exports2, ISO6391, FormData) {
  "use strict";
  class NotFoundError extends Error {
    constructor(reason) {
      super(`Couldn't find a stream: ${reason ?? "not found"}`);
      this.name = "NotFoundError";
    }
  }
  function formatSourceMeta(v) {
    const types = [];
    if (v.scrapeMovie) types.push("movie");
    if (v.scrapeShow) types.push("show");
    return {
      type: "source",
      id: v.id,
      rank: v.rank,
      name: v.name,
      mediaTypes: types
    };
  }
  function formatEmbedMeta(v) {
    return {
      type: "embed",
      id: v.id,
      rank: v.rank,
      name: v.name
    };
  }
  function getAllSourceMetaSorted(list) {
    return list.sources.sort((a, b) => b.rank - a.rank).map(formatSourceMeta);
  }
  function getAllEmbedMetaSorted(list) {
    return list.embeds.sort((a, b) => b.rank - a.rank).map(formatEmbedMeta);
  }
  function getSpecificId(list, id) {
    const foundSource = list.sources.find((v) => v.id === id);
    if (foundSource) {
      return formatSourceMeta(foundSource);
    }
    const foundEmbed = list.embeds.find((v) => v.id === id);
    if (foundEmbed) {
      return formatEmbedMeta(foundEmbed);
    }
    return null;
  }
  function makeFullUrl(url, ops) {
    let leftSide = (ops == null ? void 0 : ops.baseUrl) ?? "";
    let rightSide = url;
    if (leftSide.length > 0 && !leftSide.endsWith("/")) leftSide += "/";
    if (rightSide.startsWith("/")) rightSide = rightSide.slice(1);
    const fullUrl = leftSide + rightSide;
    if (!fullUrl.startsWith("http://") && !fullUrl.startsWith("https://"))
      throw new Error(`Invald URL -- URL doesn't start with a http scheme: '${fullUrl}'`);
    const parsedUrl = new URL(fullUrl);
    Object.entries((ops == null ? void 0 : ops.query) ?? {}).forEach(([k, v]) => {
      parsedUrl.searchParams.set(k, v);
    });
    return parsedUrl.toString();
  }
  function makeFetcher(fetcher) {
    const newFetcher = (url, ops) => {
      return fetcher(url, {
        headers: (ops == null ? void 0 : ops.headers) ?? {},
        method: (ops == null ? void 0 : ops.method) ?? "GET",
        query: (ops == null ? void 0 : ops.query) ?? {},
        baseUrl: (ops == null ? void 0 : ops.baseUrl) ?? "",
        readHeaders: (ops == null ? void 0 : ops.readHeaders) ?? [],
        body: ops == null ? void 0 : ops.body
      });
    };
    const output = async (url, ops) => (await newFetcher(url, ops)).body;
    output.full = newFetcher;
    return output;
  }
  const flags$1 = {
    // CORS are set to allow any origin
    CORS_ALLOWED: "cors-allowed",
    // the stream is locked on IP, so only works if
    // request maker is same as player (not compatible with proxies)
    IP_LOCKED: "ip-locked",
    // The source/embed is blocking cloudflare ip's
    // This flag is not compatible with a proxy hosted on cloudflare
    CF_BLOCKED: "cf-blocked"
  };
  const targets = {
    // browser with CORS restrictions
    BROWSER: "browser",
    // browser, but no CORS restrictions through a browser extension
    BROWSER_EXTENSION: "browser-extension",
    // native app, so no restrictions in what can be played
    NATIVE: "native",
    // any target, no target restrictions
    ANY: "any"
  };
  const targetToFeatures = {
    browser: {
      requires: [flags$1.CORS_ALLOWED],
      disallowed: []
    },
    "browser-extension": {
      requires: [],
      disallowed: []
    },
    native: {
      requires: [],
      disallowed: []
    },
    any: {
      requires: [],
      disallowed: []
    }
  };
  function getTargetFeatures(target, consistentIpForRequests) {
    const features = targetToFeatures[target];
    if (!consistentIpForRequests) features.disallowed.push(flags$1.IP_LOCKED);
    return features;
  }
  function flagsAllowedInFeatures(features, inputFlags) {
    const hasAllFlags = features.requires.every((v) => inputFlags.includes(v));
    if (!hasAllFlags) return false;
    const hasDisallowedFlag = features.disallowed.some((v) => inputFlags.includes(v));
    if (hasDisallowedFlag) return false;
    return true;
  }
  function makeSourcerer(state) {
    const mediaTypes = [];
    if (state.scrapeMovie) mediaTypes.push("movie");
    if (state.scrapeShow) mediaTypes.push("show");
    return {
      ...state,
      type: "source",
      disabled: state.disabled ?? false,
      mediaTypes
    };
  }
  function makeEmbed(state) {
    return {
      ...state,
      type: "embed",
      disabled: state.disabled ?? false,
      mediaTypes: void 0
    };
  }
  const flags = {
    CORS_ALLOWED: "cors-allowed",
    WATERMARK: "watermark",
    DIRECT_STREAM: "direct-stream",
    HIGH_QUALITY: "high-quality",
    LOW_QUALITY: "low-quality",
    REGIONAL: "regional",
    IP_LOCKED: "ip-locked",
    SLOW: "slow",
    FAST: "fast",
    BROKEN: "broken",
    UNSTABLE: "unstable",
    STABLE: "stable",
    RISKY: "risky",
    SAFE: "safe",
    PREMIUM: "premium",
    FREE: "free"
  };
  async function getStream(url) {
    try {
      const response = await fetch(url);
      const data = await response.json();
      return [
        {
          id: "warezcdn_mp4",
          type: "file",
          qualities: {
            [data.quality]: {
              type: "mp4",
              url: data.url
            }
          },
          flags: [flags.CORS_ALLOWED],
          captions: []
        }
      ];
    } catch (error) {
      console.error("Error fetching WarezCDN MP4:", error);
      return [];
    }
  }
  const warezcdnembedMp4Scraper = makeEmbed({
    id: "warezcdn_mp4",
    name: "WarezCDN MP4",
    rank: 150,
    async scrape(input) {
      try {
        const streams = await getStream(input.url.toString());
        return { stream: streams };
      } catch (error) {
        console.error("Error scraping WarezCDN MP4:", error);
        return { stream: [] };
      }
    }
  });
  const SKIP_VALIDATION_CHECK_IDS = [warezcdnembedMp4Scraper.id];
  function isValidStream(stream) {
    if (!stream) return false;
    if (stream.type === "hls") {
      if (!stream.playlist) return false;
      return true;
    }
    if (stream.type === "file") {
      const validQualities = Object.values(stream.qualities).filter((v) => v.url.length > 0);
      if (validQualities.length === 0) return false;
      return true;
    }
    return false;
  }
  async function validatePlayableStream(stream, ops, sourcererId) {
    if (SKIP_VALIDATION_CHECK_IDS.includes(sourcererId)) return stream;
    if (stream.type === "hls") {
      const result = await ops.fetcher.full(stream.playlist, {
        method: "GET",
        headers: {
          ...stream.preferredHeaders,
          ...stream.headers
        }
      });
      if (result.statusCode < 200 || result.statusCode >= 400) return null;
      return stream;
    }
    if (stream.type === "file") {
      const validQualitiesResults = await Promise.all(
        Object.values(stream.qualities).map(
          (quality) => ops.fetcher.full(quality.url, {
            method: "GET",
            headers: {
              ...stream.preferredHeaders,
              ...stream.headers,
              Range: "bytes=0-1"
            }
          })
        )
      );
      const validQualities = stream.qualities;
      Object.keys(stream.qualities).forEach((quality, index) => {
        if (validQualitiesResults[index].statusCode < 200 || validQualitiesResults[index].statusCode >= 400) {
          delete validQualities[quality];
        }
      });
      if (Object.keys(validQualities).length === 0) return null;
      return { ...stream, qualities: validQualities };
    }
    return null;
  }
  async function validatePlayableStreams(streams, ops, sourcererId) {
    if (SKIP_VALIDATION_CHECK_IDS.includes(sourcererId)) return streams;
    return (await Promise.all(streams.map((stream) => validatePlayableStream(stream, ops, sourcererId)))).filter(
      (v) => v !== null
    );
  }
  async function scrapeInvidualSource(list, ops) {
    const sourceScraper = list.sources.find((v) => ops.id === v.id);
    if (!sourceScraper) throw new Error("Source with ID not found");
    if (ops.media.type === "movie" && !sourceScraper.scrapeMovie) throw new Error("Source is not compatible with movies");
    if (ops.media.type === "show" && !sourceScraper.scrapeShow) throw new Error("Source is not compatible with shows");
    const contextBase = {
      fetcher: ops.fetcher,
      proxiedFetcher: ops.proxiedFetcher,
      progress(val) {
        var _a, _b;
        (_b = (_a = ops.events) == null ? void 0 : _a.update) == null ? void 0 : _b.call(_a, {
          id: sourceScraper.id,
          percentage: val,
          status: "pending"
        });
      }
    };
    let output = null;
    if (ops.media.type === "movie" && sourceScraper.scrapeMovie)
      output = await sourceScraper.scrapeMovie({
        ...contextBase,
        media: ops.media
      });
    else if (ops.media.type === "show" && sourceScraper.scrapeShow)
      output = await sourceScraper.scrapeShow({
        ...contextBase,
        media: ops.media
      });
    if (output == null ? void 0 : output.stream) {
      output.stream = output.stream.filter((stream) => isValidStream(stream)).filter((stream) => flagsAllowedInFeatures(ops.features, stream.flags));
    }
    if (!output) throw new Error("output is null");
    output.embeds = output.embeds.filter((embed) => {
      const e = list.embeds.find((v) => v.id === embed.embedId);
      if (!e || e.disabled) return false;
      return true;
    });
    if ((!output.stream || output.stream.length === 0) && output.embeds.length === 0)
      throw new NotFoundError("No streams found");
    if (output.stream && output.stream.length > 0 && output.embeds.length === 0) {
      const playableStreams = await validatePlayableStreams(output.stream, ops, sourceScraper.id);
      if (playableStreams.length === 0) throw new NotFoundError("No playable streams found");
      output.stream = playableStreams;
    }
    return output;
  }
  async function scrapeIndividualEmbed(list, ops) {
    const embedScraper = list.embeds.find((v) => ops.id === v.id);
    if (!embedScraper) throw new Error("Embed with ID not found");
    const output = await embedScraper.scrape({
      fetcher: ops.fetcher,
      proxiedFetcher: ops.proxiedFetcher,
      url: ops.url,
      progress(val) {
        var _a, _b;
        (_b = (_a = ops.events) == null ? void 0 : _a.update) == null ? void 0 : _b.call(_a, {
          id: embedScraper.id,
          percentage: val,
          status: "pending"
        });
      }
    });
    output.stream = output.stream.filter((stream) => isValidStream(stream)).filter((stream) => flagsAllowedInFeatures(ops.features, stream.flags));
    if (output.stream.length === 0) throw new NotFoundError("No streams found");
    const playableStreams = await validatePlayableStreams(output.stream, ops, embedScraper.id);
    if (playableStreams.length === 0) throw new NotFoundError("No playable streams found");
    output.stream = playableStreams;
    return output;
  }
  function reorderOnIdList(order, list) {
    const copy = [...list];
    copy.sort((a, b) => {
      const aIndex = order.indexOf(a.id);
      const bIndex = order.indexOf(b.id);
      if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex;
      if (bIndex >= 0) return 1;
      if (aIndex >= 0) return -1;
      return b.rank - a.rank;
    });
    return copy;
  }
  async function runAllProviders(list, ops) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n;
    const sources = reorderOnIdList(ops.sourceOrder ?? [], list.sources).filter((source) => {
      if (ops.media.type === "movie") return !!source.scrapeMovie;
      if (ops.media.type === "show") return !!source.scrapeShow;
      return false;
    });
    const embeds = reorderOnIdList(ops.embedOrder ?? [], list.embeds);
    const embedIds = embeds.map((embed) => embed.id);
    let lastId = "";
    const contextBase = {
      fetcher: ops.fetcher,
      proxiedFetcher: ops.proxiedFetcher,
      progress(val) {
        var _a2, _b2;
        (_b2 = (_a2 = ops.events) == null ? void 0 : _a2.update) == null ? void 0 : _b2.call(_a2, {
          id: lastId,
          percentage: val,
          status: "pending"
        });
      }
    };
    (_b = (_a = ops.events) == null ? void 0 : _a.init) == null ? void 0 : _b.call(_a, {
      sourceIds: sources.map((v) => v.id)
    });
    for (const source of sources) {
      (_d = (_c = ops.events) == null ? void 0 : _c.start) == null ? void 0 : _d.call(_c, source.id);
      lastId = source.id;
      let output = null;
      try {
        if (ops.media.type === "movie" && source.scrapeMovie)
          output = await source.scrapeMovie({
            ...contextBase,
            media: ops.media
          });
        else if (ops.media.type === "show" && source.scrapeShow)
          output = await source.scrapeShow({
            ...contextBase,
            media: ops.media
          });
        if (output) {
          output.stream = (output.stream ?? []).filter(isValidStream).filter((stream) => flagsAllowedInFeatures(ops.features, stream.flags));
        }
        if (!output || !((_e = output.stream) == null ? void 0 : _e.length) && !output.embeds.length) {
          throw new NotFoundError("No streams found");
        }
      } catch (error) {
        const updateParams = {
          id: source.id,
          percentage: 100,
          status: error instanceof NotFoundError ? "notfound" : "failure",
          reason: error instanceof NotFoundError ? error.message : void 0,
          error: error instanceof NotFoundError ? void 0 : error
        };
        (_g = (_f = ops.events) == null ? void 0 : _f.update) == null ? void 0 : _g.call(_f, updateParams);
        continue;
      }
      if (!output) throw new Error("Invalid media type");
      if ((_h = output.stream) == null ? void 0 : _h[0]) {
        const playableStream = await validatePlayableStream(output.stream[0], ops, source.id);
        if (!playableStream) throw new NotFoundError("No streams found");
        return {
          sourceId: source.id,
          stream: playableStream
        };
      }
      const sortedEmbeds = output.embeds.filter((embed) => {
        const e = list.embeds.find((v) => v.id === embed.embedId);
        return e && !e.disabled;
      }).sort((a, b) => embedIds.indexOf(a.embedId) - embedIds.indexOf(b.embedId));
      if (sortedEmbeds.length > 0) {
        (_j = (_i = ops.events) == null ? void 0 : _i.discoverEmbeds) == null ? void 0 : _j.call(_i, {
          embeds: sortedEmbeds.map((embed, i) => ({
            id: [source.id, i].join("-"),
            embedScraperId: embed.embedId
          })),
          sourceId: source.id
        });
      }
      for (const [ind, embed] of sortedEmbeds.entries()) {
        const scraper = embeds.find((v) => v.id === embed.embedId);
        if (!scraper) throw new Error("Invalid embed returned");
        const id = [source.id, ind].join("-");
        (_l = (_k = ops.events) == null ? void 0 : _k.start) == null ? void 0 : _l.call(_k, id);
        lastId = id;
        let embedOutput;
        try {
          embedOutput = await scraper.scrape({
            ...contextBase,
            url: embed.url
          });
          embedOutput.stream = embedOutput.stream.filter(isValidStream).filter((stream) => flagsAllowedInFeatures(ops.features, stream.flags));
          if (embedOutput.stream.length === 0) {
            throw new NotFoundError("No streams found");
          }
          const playableStream = await validatePlayableStream(embedOutput.stream[0], ops, embed.embedId);
          if (!playableStream) throw new NotFoundError("No streams found");
          embedOutput.stream = [playableStream];
        } catch (error) {
          const updateParams = {
            id: source.id,
            percentage: 100,
            status: error instanceof NotFoundError ? "notfound" : "failure",
            reason: error instanceof NotFoundError ? error.message : void 0,
            error: error instanceof NotFoundError ? void 0 : error
          };
          (_n = (_m = ops.events) == null ? void 0 : _m.update) == null ? void 0 : _n.call(_m, updateParams);
          continue;
        }
        return {
          sourceId: source.id,
          embedId: scraper.id,
          stream: embedOutput.stream[0]
        };
      }
    }
    return null;
  }
  function makeControls(ops) {
    const list = {
      embeds: ops.embeds,
      sources: ops.sources
    };
    const providerRunnerOps = {
      features: ops.features,
      fetcher: makeFetcher(ops.fetcher),
      proxiedFetcher: makeFetcher(ops.proxiedFetcher ?? ops.fetcher)
    };
    return {
      runAll(runnerOps) {
        return runAllProviders(list, {
          ...providerRunnerOps,
          ...runnerOps
        });
      },
      runSourceScraper(runnerOps) {
        return scrapeInvidualSource(list, {
          ...providerRunnerOps,
          ...runnerOps
        });
      },
      runEmbedScraper(runnerOps) {
        return scrapeIndividualEmbed(list, {
          ...providerRunnerOps,
          ...runnerOps
        });
      },
      getMetadata(id) {
        return getSpecificId(list, id);
      },
      listSources() {
        return getAllSourceMetaSorted(list);
      },
      listEmbeds() {
        return getAllEmbedMetaSorted(list);
      }
    };
  }
  function removeDuplicatedLanguages(list) {
    const beenSeen = {};
    return list.filter((sub) => {
      if (beenSeen[sub.language]) return false;
      beenSeen[sub.language] = true;
      return true;
    });
  }
  async function getCaptions(data) {
    let captions = [];
    for (const subtitle of data) {
      let language = "";
      if (subtitle.name.includes("Рус")) {
        language = "ru";
      } else if (subtitle.name.includes("Укр")) {
        language = "uk";
      } else if (subtitle.name.includes("Eng")) {
        language = "en";
      } else {
        continue;
      }
      captions.push({
        id: subtitle.url,
        url: subtitle.url,
        language,
        type: "vtt",
        hasCorsRestrictions: false
      });
    }
    captions = removeDuplicatedLanguages(captions);
    return captions;
  }
  const insertUnitBase = "https://insertunit.com/";
  async function parseShowData(data) {
    const seasonDataJSONregex = /seasons\s*:\s*(\[[^\]]*\])/;
    const seasonData = seasonDataJSONregex.exec(data);
    if (!(seasonData == null ? void 0 : seasonData[1])) {
      throw new NotFoundError("No seasons data found");
    }
    try {
      return JSON.parse(seasonData[1].replace(/'/g, '"'));
    } catch (error) {
      throw new NotFoundError("Invalid seasons data");
    }
  }
  async function parseMovieData(data) {
    const streamRegex = /hls\s*:\s*"([^"]*)"/;
    const streamData = streamRegex.exec(data);
    if (!(streamData == null ? void 0 : streamData[1])) {
      throw new NotFoundError("No stream data found");
    }
    const subtitleRegex = /cc\s*:\s*(\[[^\]]*\])/;
    const subtitleJSONData = subtitleRegex.exec(data);
    let captions = [];
    if (subtitleJSONData == null ? void 0 : subtitleJSONData[1]) {
      try {
        const subtitleData = JSON.parse(subtitleJSONData[1].replace(/'/g, '"'));
        captions = await getCaptions(subtitleData);
      } catch (error) {
        console.warn("Failed to parse captions:", error);
      }
    }
    return {
      stream: streamData[1],
      captions
    };
  }
  async function scrapeInsertUnitShow(ctx) {
    try {
      const playerData = await ctx.proxiedFetcher(`/api/embed/imdb/${ctx.media.imdbId}`, {
        baseUrl: insertUnitBase,
        headers: {
          "Referer": insertUnitBase
        }
      });
      ctx.progress(30);
      const seasonTable = await parseShowData(playerData);
      ctx.progress(60);
      const currentSeason = seasonTable.find(
        (seasonElement) => seasonElement.season === ctx.media.season.number && !seasonElement.blocked
      );
      if (!currentSeason) {
        throw new NotFoundError("Season not found");
      }
      const currentEpisode = currentSeason.episodes.find(
        (episodeElement) => episodeElement.episode === ctx.media.episode.number.toString()
      );
      if (!(currentEpisode == null ? void 0 : currentEpisode.hls)) {
        throw new NotFoundError("Episode not found");
      }
      let captions = [];
      if (currentEpisode.cc) {
        try {
          captions = await getCaptions(currentEpisode.cc);
        } catch (error) {
          console.warn("Failed to get captions:", error);
        }
      }
      ctx.progress(95);
      return {
        embeds: [],
        stream: [
          {
            id: "primary",
            playlist: currentEpisode.hls,
            type: "hls",
            flags: [flags$1.CORS_ALLOWED],
            captions
          }
        ]
      };
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new NotFoundError("Failed to scrape show");
    }
  }
  async function scrapeInsertUnitMovie(ctx) {
    try {
      const playerData = await ctx.proxiedFetcher(`/api/embed/imdb/${ctx.media.imdbId}`, {
        baseUrl: insertUnitBase,
        headers: {
          "Referer": insertUnitBase
        }
      });
      ctx.progress(35);
      const { stream, captions } = await parseMovieData(playerData);
      ctx.progress(90);
      return {
        embeds: [],
        stream: [
          {
            id: "primary",
            type: "hls",
            playlist: stream,
            flags: [flags$1.CORS_ALLOWED],
            captions
          }
        ]
      };
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new NotFoundError("Failed to scrape movie");
    }
  }
  async function scrapeMovie(ctx) {
    return scrapeInsertUnitMovie(ctx);
  }
  async function scrapeShow(ctx) {
    return scrapeInsertUnitShow(ctx);
  }
  const insertunitScraper = makeSourcerer({
    id: "insertunit",
    name: "Insertunit",
    disabled: false,
    rank: 200,
    flags: [flags$1.CORS_ALLOWED],
    scrapeMovie,
    scrapeShow
  });
  async function searchContent(fetcher, query) {
    const searchUrl = `https://uira.live/search?q=${encodeURIComponent(query)}`;
    const data = await fetcher(searchUrl, {
      method: "GET",
      headers: {
        Referer: "https://uira.live/",
        "User-Agent": "Mozilla/5.0"
      }
    });
    return data.results || [];
  }
  async function extractStreams(fetcher, contentId) {
    const url = `https://uira.live/api/content/${contentId}/streams`;
    const data = await fetcher(url, {
      method: "GET",
      headers: {
        Referer: "https://uira.live/",
        "User-Agent": "Mozilla/5.0"
      }
    });
    return data.streams.map((stream, index) => ({
      id: `uira_${contentId}_${index}`,
      type: "hls",
      playlist: stream.url,
      flags: [],
      captions: [],
      headers: {
        Referer: "https://uira.live/",
        "User-Agent": "Mozilla/5.0"
      }
    }));
  }
  const uiraLiveScraper = makeSourcerer({
    id: "uira.live",
    name: "Uira Live",
    rank: 120,
    flags: [],
    async scrapeMovie(input) {
      const { media, fetcher } = input;
      const searchQuery = `${media.title} ${media.releaseYear}`;
      try {
        const searchResults = await searchContent(fetcher, searchQuery);
        if (searchResults.length === 0) {
          return { embeds: [], stream: [] };
        }
        const streams = await extractStreams(fetcher, searchResults[0]);
        return {
          embeds: [],
          stream: streams
        };
      } catch (error) {
        console.error("Error scraping uira.live:", error);
        return { embeds: [], stream: [] };
      }
    },
    async scrapeShow(input) {
      const { media, fetcher } = input;
      const searchQuery = `${media.title} season ${media.season.number} episode ${media.episode.number}`;
      try {
        const searchResults = await searchContent(fetcher, searchQuery);
        if (searchResults.length === 0) {
          return { embeds: [], stream: [] };
        }
        const streams = await extractStreams(fetcher, searchResults[0]);
        return {
          embeds: [],
          stream: streams
        };
      } catch (error) {
        console.error("Error scraping uira.live:", error);
        return { embeds: [], stream: [] };
      }
    }
  });
  const baseUrl$6 = "https://vidapi.click";
  function buildStreamUrl$5(ctx) {
    let url = `${baseUrl$6}/api/source/${ctx.media.type}/${ctx.media.tmdbId}`;
    if (ctx.media.type === "show") {
      url += `/season/${ctx.media.season.number}/episode/${ctx.media.episode.number}`;
    }
    return url;
  }
  const headers$6 = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Pragma": "no-cache",
    "Cache-Control": "no-cache",
    "Content-Type": "application/json"
  };
  async function getStreamUrl$8(ctx) {
    var _a;
    try {
      const url = buildStreamUrl$5(ctx);
      const data = await ctx.proxiedFetcher(url, {
        headers: headers$6,
        method: "GET"
      });
      if (!(data == null ? void 0 : data.success) || !((_a = data == null ? void 0 : data.streams) == null ? void 0 : _a.length)) {
        throw new NotFoundError("No streams found");
      }
      const streams = data.streams.map((stream, index) => {
        const baseStream = {
          id: `vidapiclick_${ctx.media.tmdbId}_${index}`,
          flags: [flags$1.CORS_ALLOWED],
          captions: [],
          preferredHeaders: {
            "Origin": baseUrl$6,
            "Referer": baseUrl$6
          },
          headers: {
            ...headers$6
          }
        };
        return {
          ...baseStream,
          type: "hls",
          playlist: stream.file
        };
      });
      const validStreams = streams.filter((stream) => {
        if (stream.type === "hls" && stream.playlist) return true;
        return false;
      });
      if (validStreams.length === 0) {
        throw new NotFoundError("No valid streams found");
      }
      return {
        stream: validStreams,
        embeds: []
      };
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new NotFoundError("Failed to fetch streams");
    }
  }
  const vidApiClickScraper = makeSourcerer({
    id: "vidapiclick",
    name: "VidApiClick",
    rank: 180,
    flags: [flags$1.CORS_ALLOWED],
    disabled: false,
    scrapeMovie: getStreamUrl$8,
    scrapeShow: getStreamUrl$8
  });
  const baseUrl$5 = "https://astra.tv";
  function buildStreamUrl$4(ctx) {
    let url = `${baseUrl$5}/api/v1/${ctx.media.type}/${ctx.media.tmdbId}`;
    if (ctx.media.type === "show") {
      url += `/season/${ctx.media.season.number}/episode/${ctx.media.episode.number}`;
    }
    return url;
  }
  const headers$5 = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Pragma": "no-cache",
    "Cache-Control": "no-cache",
    "Referer": "https://astra.tv/"
  };
  async function getStreamUrl$7(ctx) {
    var _a;
    try {
      const url = buildStreamUrl$4(ctx);
      const data = await ctx.proxiedFetcher(url, { headers: headers$5 });
      if (!((_a = data == null ? void 0 : data.streams) == null ? void 0 : _a.length)) {
        throw new NotFoundError("No streams found");
      }
      const streams = data.streams.map((stream, index) => {
        const baseStream = {
          id: `astra_${ctx.media.tmdbId}_${index}`,
          flags: [flags$1.CORS_ALLOWED],
          captions: [],
          preferredHeaders: {
            "Origin": baseUrl$5,
            "Referer": baseUrl$5
          },
          headers: {
            ...headers$5
          }
        };
        return {
          ...baseStream,
          type: "hls",
          playlist: stream.url
        };
      });
      const validStreams = streams.filter((stream) => {
        if (stream.type === "hls" && stream.playlist) return true;
        return false;
      });
      if (validStreams.length === 0) {
        throw new NotFoundError("No valid streams found");
      }
      return {
        stream: validStreams,
        embeds: []
      };
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new NotFoundError("Failed to fetch streams");
    }
  }
  const astraScraper = makeSourcerer({
    id: "astra",
    name: "Astra",
    rank: 710,
    flags: [flags$1.CORS_ALLOWED],
    disabled: false,
    scrapeMovie: getStreamUrl$7,
    scrapeShow: getStreamUrl$7
  });
  const baseUrl$4 = "https://ee3.me";
  function buildStreamUrl$3(ctx) {
    let url = `${baseUrl$4}/api/media/${ctx.media.type}/${ctx.media.tmdbId}`;
    if (ctx.media.type === "show") {
      url += `/season/${ctx.media.season.number}/episode/${ctx.media.episode.number}`;
    }
    return url;
  }
  const headers$4 = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Pragma": "no-cache",
    "Cache-Control": "no-cache"
  };
  async function getStreamUrl$6(ctx) {
    var _a;
    try {
      const url = buildStreamUrl$3(ctx);
      const data = await ctx.proxiedFetcher(url, { headers: headers$4 });
      if (!((_a = data == null ? void 0 : data.streams) == null ? void 0 : _a.length)) {
        throw new NotFoundError("No streams found");
      }
      const streams = data.streams.map((stream, index) => {
        const baseStream = {
          id: `ee3_${ctx.media.tmdbId}_${index}`,
          flags: [flags$1.CORS_ALLOWED],
          captions: [],
          preferredHeaders: {
            "Origin": baseUrl$4,
            "Referer": baseUrl$4
          },
          headers: {
            ...headers$4
          }
        };
        return {
          ...baseStream,
          type: "hls",
          playlist: stream.url
        };
      });
      const validStreams = streams.filter((stream) => {
        if (stream.type === "hls" && stream.playlist) return true;
        return false;
      });
      if (validStreams.length === 0) {
        throw new NotFoundError("No valid streams found");
      }
      return {
        stream: validStreams,
        embeds: []
      };
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new NotFoundError("Failed to fetch streams");
    }
  }
  const ee3Scraper = makeSourcerer({
    id: "ee3",
    name: "EE3",
    rank: 150,
    flags: [flags$1.CORS_ALLOWED],
    disabled: false,
    scrapeMovie: getStreamUrl$6,
    scrapeShow: getStreamUrl$6
  });
  const baseUrl$3 = "https://embed.su";
  function buildStreamUrl$2(ctx) {
    if (!ctx.media.imdbId) {
      throw new Error("IMDB ID is required");
    }
    let url = `${baseUrl$3}/api/source/${ctx.media.imdbId}`;
    if (ctx.media.type === "show") {
      url += `/season/${ctx.media.season.number}/episode/${ctx.media.episode.number}`;
    }
    return url;
  }
  const headers$3 = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Pragma": "no-cache",
    "Cache-Control": "no-cache"
  };
  async function getStreamUrl$5(ctx) {
    var _a;
    try {
      if (!ctx.media.imdbId) {
        throw new NotFoundError("IMDB ID is required");
      }
      const url = buildStreamUrl$2(ctx);
      const data = await ctx.proxiedFetcher(url, { headers: headers$3 });
      if (!((_a = data == null ? void 0 : data.streams) == null ? void 0 : _a.length)) {
        throw new NotFoundError("No streams found");
      }
      const streams = data.streams.map((stream, index) => {
        const baseStream = {
          id: `embedsu_${ctx.media.imdbId}_${index}`,
          flags: [flags$1.CORS_ALLOWED],
          captions: [],
          preferredHeaders: {
            "Origin": baseUrl$3,
            "Referer": baseUrl$3
          },
          headers: {
            ...headers$3
          }
        };
        return {
          ...baseStream,
          type: "hls",
          playlist: stream.file
        };
      });
      const validStreams = streams.filter((stream) => {
        if (stream.type === "hls" && stream.playlist) return true;
        return false;
      });
      if (validStreams.length === 0) {
        throw new NotFoundError("No valid streams found");
      }
      return {
        stream: validStreams,
        embeds: []
      };
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new NotFoundError("Failed to fetch streams");
    }
  }
  const embedSuScraper = makeSourcerer({
    id: "embedsu",
    name: "EmbedSu",
    rank: 170,
    flags: [flags$1.CORS_ALLOWED],
    disabled: false,
    scrapeMovie: getStreamUrl$5,
    scrapeShow: getStreamUrl$5
  });
  const baseUrl$2 = "https://mp4hydra.org";
  function buildStreamUrl$1(ctx) {
    let url = `${baseUrl$2}/api/v2/${ctx.media.type}/${ctx.media.tmdbId}`;
    if (ctx.media.type === "show") {
      url += `/season/${ctx.media.season.number}/episode/${ctx.media.episode.number}`;
    }
    return url;
  }
  const headers$2 = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Pragma": "no-cache",
    "Cache-Control": "no-cache"
  };
  async function getStreamUrl$4(ctx) {
    var _a, _b;
    try {
      const url = buildStreamUrl$1(ctx);
      const data = await ctx.proxiedFetcher(url, {
        headers: {
          ...headers$2,
          "Origin": baseUrl$2,
          "Referer": baseUrl$2
        }
      });
      if (!((_a = data == null ? void 0 : data.streams) == null ? void 0 : _a.length)) {
        throw new NotFoundError("No streams found");
      }
      const validStreams = data.streams.filter((stream) => stream.url && stream.url.length > 0);
      if (validStreams.length === 0) {
        throw new NotFoundError("No valid streams found");
      }
      return {
        embeds: validStreams.map((stream, index) => ({
          embedId: `mp4hydra-${index + 1}`,
          url: stream.url,
          quality: stream.quality || "unknown",
          type: "file",
          flags: [flags$1.CORS_ALLOWED]
        })),
        captions: ((_b = data.captions) == null ? void 0 : _b.map((caption) => ({
          id: caption.id,
          url: caption.url,
          language: caption.language,
          type: caption.type || "srt"
        }))) || []
      };
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new NotFoundError("Failed to fetch streams");
    }
  }
  const mp4HydraScraper = makeSourcerer({
    id: "mp4hydra",
    name: "Mp4Hydra",
    rank: 300,
    flags: [flags$1.CORS_ALLOWED],
    disabled: false,
    scrapeMovie: getStreamUrl$4,
    scrapeShow: getStreamUrl$4
  });
  async function getStreamUrl$3(fetcher, tmdbId, type, season, episode) {
    var _a;
    let url = `https://orion.tv/api/v1/${type}/${tmdbId}`;
    if (type === "show" && season && episode) {
      url += `/season/${season}/episode/${episode}`;
    }
    const data = await fetcher(url, {
      method: "GET",
      headers: {
        Referer: "https://orion.tv/",
        "User-Agent": "Mozilla/5.0"
      }
    });
    if (!((_a = data.streams) == null ? void 0 : _a.length)) {
      return [];
    }
    return data.streams.map((stream, index) => ({
      id: `orion_${tmdbId}_${index}`,
      type: "hls",
      playlist: stream.url,
      flags: [],
      captions: [],
      headers: {
        Referer: "https://orion.tv/",
        "User-Agent": "Mozilla/5.0"
      }
    }));
  }
  const orionScraper = makeSourcerer({
    id: "orion",
    name: "Orion",
    rank: 190,
    flags: [],
    async scrapeMovie(input) {
      const { media, fetcher } = input;
      try {
        const streams = await getStreamUrl$3(fetcher, media.tmdbId, "movie");
        return {
          embeds: [],
          stream: streams
        };
      } catch (error) {
        console.error("Error scraping orion:", error);
        return { embeds: [], stream: [] };
      }
    },
    async scrapeShow(input) {
      const { media, fetcher } = input;
      try {
        const streams = await getStreamUrl$3(fetcher, media.tmdbId, "show", media.season.number, media.episode.number);
        return {
          embeds: [],
          stream: streams
        };
      } catch (error) {
        console.error("Error scraping orion:", error);
        return { embeds: [], stream: [] };
      }
    }
  });
  const baseUrl$1 = "https://vidsrc.me";
  function buildStreamUrl(ctx) {
    let url = `${baseUrl$1}/api/source/${ctx.media.type}/${ctx.media.tmdbId}`;
    if (ctx.media.type === "show") {
      url += `/season/${ctx.media.season.number}/episode/${ctx.media.episode.number}`;
    }
    return url;
  }
  const headers$1 = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Pragma": "no-cache",
    "Cache-Control": "no-cache",
    "Content-Type": "application/json"
  };
  async function getStreamUrl$2(ctx) {
    var _a, _b;
    try {
      const url = buildStreamUrl(ctx);
      const data = await ctx.proxiedFetcher(url, { headers: headers$1 });
      if (!data.status || !((_b = (_a = data.result) == null ? void 0 : _a.sources) == null ? void 0 : _b.length)) {
        throw new NotFoundError("No streams found");
      }
      const captions = (data.result.subtitles || []).filter((sub) => sub.lang && sub.url).map((sub) => ({
        id: `vidsrc_${sub.lang}`,
        language: sub.lang,
        url: sub.url,
        type: sub.url.endsWith(".vtt") ? "vtt" : "srt",
        hasCorsRestrictions: false
      }));
      const streams = data.result.sources.map((stream, index) => {
        const isHLS = stream.type === "hls" || stream.url.includes(".m3u8");
        if (isHLS) {
          const hlsStream = {
            id: `vidsrc_${ctx.media.tmdbId}_${index}`,
            type: "hls",
            playlist: stream.url,
            flags: [flags$1.CORS_ALLOWED],
            captions,
            preferredHeaders: {
              "Origin": baseUrl$1,
              "Referer": baseUrl$1
            },
            headers: {
              ...headers$1
            }
          };
          return hlsStream;
        }
        const fileStream = {
          id: `vidsrc_${ctx.media.tmdbId}_${index}`,
          type: "file",
          qualities: {
            [stream.quality]: {
              type: "mp4",
              url: stream.url
            }
          },
          flags: [flags$1.CORS_ALLOWED],
          captions,
          preferredHeaders: {
            "Origin": baseUrl$1,
            "Referer": baseUrl$1
          },
          headers: {
            ...headers$1
          }
        };
        return fileStream;
      });
      const validStreams = streams.filter((stream) => {
        if (stream.type === "hls" && "playlist" in stream) return true;
        if (stream.type === "file" && "qualities" in stream && Object.keys(stream.qualities).length > 0) return true;
        return false;
      });
      if (validStreams.length === 0) {
        throw new NotFoundError("No valid streams found");
      }
      return {
        stream: validStreams,
        embeds: []
      };
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new NotFoundError("Failed to fetch streams");
    }
  }
  const vidsrcScraper = makeSourcerer({
    id: "vidsrc",
    name: "VidSrc",
    rank: 210,
    flags: [flags$1.CORS_ALLOWED],
    disabled: false,
    scrapeMovie: getStreamUrl$2,
    scrapeShow: getStreamUrl$2
  });
  async function getStreamUrl$1(fetcher, tmdbId, type, season, episode) {
    var _a;
    let url = `https://vidsrc.su/api/source/${type}/${tmdbId}`;
    if (type === "show" && season && episode) {
      url += `/season/${season}/episode/${episode}`;
    }
    const data = await fetcher(url, {
      method: "GET",
      headers: {
        Referer: "https://vidsrc.su/",
        "User-Agent": "Mozilla/5.0"
      }
    });
    if (!((_a = data.sources) == null ? void 0 : _a.length)) {
      return [];
    }
    return data.sources.map((source, index) => ({
      id: `vidsrcsu_${tmdbId}_${index}`,
      type: "hls",
      playlist: source.url,
      flags: [],
      captions: [],
      headers: {
        Referer: "https://vidsrc.su/",
        "User-Agent": "Mozilla/5.0"
      }
    }));
  }
  const vidsrcSuScraper = makeSourcerer({
    id: "vidsrc.su",
    name: "VidSrc.su",
    rank: 140,
    flags: [],
    async scrapeMovie(input) {
      const { media, fetcher } = input;
      try {
        const streams = await getStreamUrl$1(fetcher, media.tmdbId, "movie");
        return {
          embeds: [],
          stream: streams
        };
      } catch (error) {
        console.error("Error scraping vidsrc.su:", error);
        return { embeds: [], stream: [] };
      }
    },
    async scrapeShow(input) {
      const { media, fetcher } = input;
      try {
        const streams = await getStreamUrl$1(fetcher, media.tmdbId, "show", media.season.number, media.episode.number);
        return {
          embeds: [],
          stream: streams
        };
      } catch (error) {
        console.error("Error scraping vidsrc.su:", error);
        return { embeds: [], stream: [] };
      }
    }
  });
  const baseUrl = "https://webtor.io";
  function buildSearchQuery(ctx) {
    if (ctx.media.type === "movie") {
      return `${ctx.media.title} ${ctx.media.releaseYear}`;
    }
    return `${ctx.media.title} S${ctx.media.season.number.toString().padStart(2, "0")}E${ctx.media.episode.number.toString().padStart(2, "0")}`;
  }
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Pragma": "no-cache",
    "Cache-Control": "no-cache",
    "Content-Type": "application/json"
  };
  async function getStreamUrl(ctx) {
    var _a;
    try {
      const searchQuery = buildSearchQuery(ctx);
      const searchData = await ctx.proxiedFetcher("/api/search", {
        baseUrl,
        headers,
        query: {
          q: searchQuery
        }
      });
      if (!((_a = searchData == null ? void 0 : searchData.magnets) == null ? void 0 : _a.length)) {
        throw new NotFoundError("No magnets found");
      }
      const streamData = await ctx.proxiedFetcher("/api/stream/create", {
        baseUrl,
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ magnet: searchData.magnets[0] })
      });
      if (!(streamData == null ? void 0 : streamData.streamUrl)) {
        throw new NotFoundError("No stream URL found");
      }
      const stream = {
        id: `webtor_${searchData.magnets[0].slice(0, 20)}`,
        type: "hls",
        playlist: streamData.streamUrl,
        flags: [flags$1.CORS_ALLOWED],
        captions: [],
        preferredHeaders: {
          "Origin": baseUrl,
          "Referer": baseUrl
        },
        headers: {
          ...headers
        }
      };
      if (!stream.playlist) {
        throw new NotFoundError("Invalid stream URL");
      }
      return {
        stream: [stream],
        embeds: []
      };
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new NotFoundError("Failed to fetch stream");
    }
  }
  const webtorScraper = makeSourcerer({
    id: "webtor",
    name: "Webtor",
    rank: 160,
    flags: [flags$1.CORS_ALLOWED],
    disabled: false,
    scrapeMovie: getStreamUrl,
    scrapeShow: getStreamUrl
  });
  function gatherAllSources() {
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
  function gatherAllEmbeds() {
    return [];
  }
  function getBuiltinSources() {
    return gatherAllSources().filter((v) => !v.disabled);
  }
  function getBuiltinEmbeds() {
    return gatherAllEmbeds().filter((v) => !v.disabled);
  }
  function hasDuplicates(values) {
    return new Set(values).size !== values.length;
  }
  function getProviders(features, list) {
    const sources = list.sources.filter((v) => !(v == null ? void 0 : v.disabled));
    const embeds = list.embeds.filter((v) => !(v == null ? void 0 : v.disabled));
    const combined = [...sources, ...embeds];
    const anyDuplicateId = hasDuplicates(combined.map((v) => v.id));
    const anyDuplicateSourceRank = hasDuplicates(sources.map((v) => v.rank));
    const anyDuplicateEmbedRank = hasDuplicates(embeds.map((v) => v.rank));
    if (anyDuplicateId) throw new Error("Duplicate id found in sources/embeds");
    if (anyDuplicateSourceRank) throw new Error("Duplicate rank found in sources");
    if (anyDuplicateEmbedRank) throw new Error("Duplicate rank found in embeds");
    return {
      sources: sources.filter((s) => flagsAllowedInFeatures(features, s.flags)),
      embeds
    };
  }
  function makeProviders(ops) {
    const features = getTargetFeatures(ops.target, ops.consistentIpForRequests ?? false);
    const list = getProviders(features, {
      embeds: getBuiltinEmbeds(),
      sources: getBuiltinSources()
    });
    return makeControls({
      embeds: list.embeds,
      sources: list.sources,
      features,
      fetcher: ops.fetcher,
      proxiedFetcher: ops.proxiedFetcher
    });
  }
  function buildProviders() {
    let consistentIpForRequests = false;
    let target = null;
    let fetcher = null;
    let proxiedFetcher = null;
    const embeds = [];
    const sources = [];
    const builtinSources = getBuiltinSources();
    const builtinEmbeds = getBuiltinEmbeds();
    return {
      enableConsistentIpForRequests() {
        consistentIpForRequests = true;
        return this;
      },
      setFetcher(f) {
        fetcher = f;
        return this;
      },
      setProxiedFetcher(f) {
        proxiedFetcher = f;
        return this;
      },
      setTarget(t) {
        target = t;
        return this;
      },
      addSource(input) {
        if (typeof input !== "string") {
          sources.push(input);
          return this;
        }
        const matchingSource = builtinSources.find((v) => v.id === input);
        if (!matchingSource) throw new Error("Source not found");
        sources.push(matchingSource);
        return this;
      },
      addEmbed(input) {
        if (typeof input !== "string") {
          embeds.push(input);
          return this;
        }
        const matchingEmbed = builtinEmbeds.find((v) => v.id === input);
        if (!matchingEmbed) throw new Error("Embed not found");
        embeds.push(matchingEmbed);
        return this;
      },
      addBuiltinProviders() {
        sources.push(...builtinSources);
        embeds.push(...builtinEmbeds);
        return this;
      },
      build() {
        if (!target) throw new Error("Target not set");
        if (!fetcher) throw new Error("Fetcher not set");
        const features = getTargetFeatures(target, consistentIpForRequests);
        const list = getProviders(features, {
          embeds,
          sources
        });
        return makeControls({
          fetcher,
          proxiedFetcher: proxiedFetcher ?? void 0,
          embeds: list.embeds,
          sources: list.sources,
          features
        });
      }
    };
  }
  const isReactNative = () => {
    try {
      require("react-native");
      return true;
    } catch (e) {
      return false;
    }
  };
  function serializeBody(body) {
    if (body === void 0 || typeof body === "string" || body instanceof URLSearchParams || body instanceof FormData) {
      if (body instanceof URLSearchParams && isReactNative()) {
        return {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: body.toString()
        };
      }
      return {
        headers: {},
        body
      };
    }
    return {
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    };
  }
  function getHeaders(list, res) {
    const output = new Headers();
    list.forEach((header) => {
      var _a;
      const realHeader = header.toLowerCase();
      const value = res.headers.get(realHeader);
      const extraValue = (_a = res.extraHeaders) == null ? void 0 : _a.get(realHeader);
      if (!value) return;
      output.set(realHeader, extraValue ?? value);
    });
    return output;
  }
  function makeStandardFetcher(f) {
    const normalFetch = async (url, ops) => {
      var _a;
      const fullUrl = makeFullUrl(url, ops);
      const seralizedBody = serializeBody(ops.body);
      const res = await f(fullUrl, {
        method: ops.method,
        headers: {
          ...seralizedBody.headers,
          ...ops.headers
        },
        body: seralizedBody.body
      });
      let body;
      const isJson = (_a = res.headers.get("content-type")) == null ? void 0 : _a.includes("application/json");
      if (isJson) body = await res.json();
      else body = await res.text();
      return {
        body,
        finalUrl: res.extraUrl ?? res.url,
        headers: getHeaders(ops.readHeaders, res),
        statusCode: res.status
      };
    };
    return normalFetch;
  }
  const headerMap = {
    cookie: "X-Cookie",
    referer: "X-Referer",
    origin: "X-Origin",
    "user-agent": "X-User-Agent",
    "x-real-ip": "X-X-Real-Ip"
  };
  const responseHeaderMap = {
    "x-set-cookie": "Set-Cookie"
  };
  function makeSimpleProxyFetcher(proxyUrl, f) {
    const proxiedFetch = async (url, ops) => {
      const fetcher = makeStandardFetcher(async (a, b) => {
        const res = await f(a, b);
        res.extraHeaders = new Headers();
        Object.entries(responseHeaderMap).forEach((entry) => {
          var _a;
          const value = res.headers.get(entry[0]);
          if (!value) return;
          (_a = res.extraHeaders) == null ? void 0 : _a.set(entry[0].toLowerCase(), value);
        });
        res.extraUrl = res.headers.get("X-Final-Destination") ?? res.url;
        return res;
      });
      const fullUrl = makeFullUrl(url, ops);
      const headerEntries = Object.entries(ops.headers).map((entry) => {
        const key = entry[0].toLowerCase();
        if (headerMap[key]) return [headerMap[key], entry[1]];
        return entry;
      });
      return fetcher(proxyUrl, {
        ...ops,
        query: {
          destination: fullUrl
        },
        headers: Object.fromEntries(headerEntries),
        baseUrl: void 0
      });
    };
    return proxiedFetch;
  }
  exports2.NotFoundError = NotFoundError;
  exports2.buildProviders = buildProviders;
  exports2.flags = flags$1;
  exports2.getBuiltinEmbeds = getBuiltinEmbeds;
  exports2.getBuiltinSources = getBuiltinSources;
  exports2.makeProviders = makeProviders;
  exports2.makeSimpleProxyFetcher = makeSimpleProxyFetcher;
  exports2.makeStandardFetcher = makeStandardFetcher;
  exports2.targets = targets;
  Object.defineProperty(exports2, Symbol.toStringTag, { value: "Module" });
});
