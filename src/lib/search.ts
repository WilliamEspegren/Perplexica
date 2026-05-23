import {
  getSearchProvider,
  getSeltzApiKey,
} from './config/serverRegistry';
import {
  searchSearxng,
  type SearxngSearchOptions,
  type SearxngSearchResult,
} from './searxng';
import type { SearchParams } from 'seltz';

export type SearchProvider = 'searxng' | 'seltz';

export type WebSearchOptions = SearxngSearchOptions & {
  provider?: SearchProvider;
  maxResults?: number;
  scope?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  fromDate?: string;
  toDate?: string;
};

export type WebSearchResult = SearxngSearchResult;

const getHostnameTitle = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Seltz result';
  }
};

const getFaviconUrl = (url: string) =>
  `https://s2.googleusercontent.com/s2/favicons?domain_url=${encodeURIComponent(url)}&sz=128`;

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const getSearxngOptions = (
  opts?: WebSearchOptions,
): SearxngSearchOptions | undefined => {
  if (!opts) return undefined;

  const searxngOptions: SearxngSearchOptions = {};

  if (opts.categories) searxngOptions.categories = opts.categories;
  if (opts.engines) searxngOptions.engines = opts.engines;
  if (opts.language) searxngOptions.language = opts.language;
  if (opts.pageno) searxngOptions.pageno = opts.pageno;

  return Object.keys(searxngOptions).length > 0 ? searxngOptions : undefined;
};

export const searchSeltz = async (query: string, opts?: WebSearchOptions) => {
  const apiKey = String(
    getSeltzApiKey() || process.env.SELTZ_API_KEY || '',
  ).trim();

  if (!apiKey) {
    throw new Error(
      'Seltz API key is not configured. Set SELTZ_API_KEY or add it in Settings > Search.',
    );
  }

  const { Seltz, SeltzError } = await import('seltz');

  const params: SearchParams = {
    query,
    maxResults: opts?.maxResults ?? 10,
  };

  if (opts?.scope) params.scope = opts.scope;
  if (opts?.includeDomains?.length) {
    params.includeDomains = opts.includeDomains;
  }
  if (opts?.excludeDomains?.length) {
    params.excludeDomains = opts.excludeDomains;
  }
  if (opts?.fromDate) params.fromDate = opts.fromDate;
  if (opts?.toDate) params.toDate = opts.toDate;

  try {
    const client = new Seltz({ apiKey });
    const response = await withTimeout(
      client.search(params),
      12000,
      'Seltz search timed out',
    );

    const results = response.documents.reduce<WebSearchResult[]>(
      (results, document) => {
        const url = document.url?.trim();
        if (!url) return results;

        const title = getHostnameTitle(url);
        const content = document.content?.trim() || title;

        results.push({
          title,
          url,
          content,
          thumbnail: getFaviconUrl(url),
        });

        return results;
      },
      [],
    );

    return {
      results,
      suggestions: [],
    };
  } catch (err) {
    if (err instanceof SeltzError) {
      throw new Error(`Seltz search failed: ${err.message}`);
    }

    throw err;
  }
};

export const searchWeb = async (query: string, opts?: WebSearchOptions) => {
  const provider = opts?.provider || getSearchProvider();

  if (provider === 'seltz') {
    return searchSeltz(query, opts);
  }

  return searchSearxng(query, getSearxngOptions(opts));
};
