import { getSearchProvider } from '@/lib/config/serverRegistry';
import { searchSearxng } from '@/lib/searxng';
import { searchWeb, type WebSearchResult } from '@/lib/search';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const websitesForTopic = {
  tech: {
    query: ['technology news', 'latest tech', 'AI', 'science and innovation'],
    links: ['techcrunch.com', 'wired.com', 'theverge.com'],
  },
  finance: {
    query: ['finance news', 'economy', 'stock market', 'investing'],
    links: ['bloomberg.com', 'cnbc.com', 'marketwatch.com'],
  },
  art: {
    query: ['art news', 'culture', 'modern art', 'cultural events'],
    links: ['artnews.com', 'hyperallergic.com', 'theartnewspaper.com'],
  },
  sports: {
    query: ['sports news', 'latest sports', 'cricket football tennis'],
    links: ['espn.com', 'bbc.com/sport', 'skysports.com'],
  },
  entertainment: {
    query: ['entertainment news', 'movies', 'TV shows', 'celebrities'],
    links: ['hollywoodreporter.com', 'variety.com', 'deadline.com'],
  },
};

type Topic = keyof typeof websitesForTopic;

const dedupeResults = (results: WebSearchResult[]) => {
  const seenUrls = new Set();

  return results.filter((item) => {
    const url = item.url?.toLowerCase().trim();
    if (seenUrls.has(url)) return false;
    seenUrls.add(url);
    return true;
  });
};

export const GET = async (req: Request) => {
  try {
    const params = new URL(req.url).searchParams;

    const mode: 'normal' | 'preview' =
      (params.get('mode') as 'normal' | 'preview') || 'normal';
    const topic: Topic = (params.get('topic') as Topic) || 'tech';

    const selectedTopic = websitesForTopic[topic];
    const searchProvider = getSearchProvider();

    let data: WebSearchResult[] = [];

    if (searchProvider === 'seltz') {
      if (mode === 'normal') {
        data = dedupeResults(
          (
            await Promise.all(
              selectedTopic.query.map(async (query) => {
                return (
                  await searchWeb(query, {
                    provider: 'seltz',
                    scope: 'news',
                    includeDomains: selectedTopic.links,
                    maxResults: 10,
                  })
                ).results;
              }),
            )
          ).flat(),
        )
          .sort(() => Math.random() - 0.5);
      } else {
        data = (
          await searchWeb(
            selectedTopic.query[
              Math.floor(Math.random() * selectedTopic.query.length)
            ],
            {
              provider: 'seltz',
              scope: 'news',
              includeDomains: [
                selectedTopic.links[
                  Math.floor(Math.random() * selectedTopic.links.length)
                ],
              ],
              maxResults: 10,
            },
          )
        ).results;
      }
    } else if (mode === 'normal') {
      data = dedupeResults(
        (
          await Promise.all(
            selectedTopic.links.flatMap((link) =>
              selectedTopic.query.map(async (query) => {
                return (
                  await searchSearxng(`site:${link} ${query}`, {
                    engines: ['bing news'],
                    pageno: 1,
                    language: 'en',
                  })
                ).results;
              }),
            ),
          )
        ).flat(),
      ).sort(() => Math.random() - 0.5);
    } else {
      data = (
        await searchSearxng(
          `site:${selectedTopic.links[Math.floor(Math.random() * selectedTopic.links.length)]} ${selectedTopic.query[Math.floor(Math.random() * selectedTopic.query.length)]}`,
          {
            engines: ['bing news'],
            pageno: 1,
            language: 'en',
          },
        )
      ).results;
    }

    return Response.json(
      {
        blogs: data,
      },
      {
        status: 200,
      },
    );
  } catch (err) {
    console.error(`An error occurred in discover route: ${err}`);
    return Response.json(
      {
        message: err instanceof Error ? err.message : 'An error has occurred',
      },
      {
        status: 500,
      },
    );
  }
};
