/**
 * The headline feeds on the Schportz page: the four "sites" tabs of the 2011 page, and the
 * four league tabs. The 2011 league feeds (nfl.com, nba.com, nhl.com, mlb.com) are gone, so
 * those tabs use ESPN's league feeds. All checked working in November 2026.
 */
export interface FeedSource {
  id: string;
  label: string;
  url: string;
}

export const SCHPORTZ_FEEDS: readonly FeedSource[] = [
  { id: 'yahoo', label: 'Yahoo!', url: 'https://sports.yahoo.com/rss/' },
  { id: 'cbs', label: 'CBS', url: 'https://www.cbssports.com/rss/headlines/' },
  { id: 'espn', label: 'ESPN', url: 'https://www.espn.com/espn/rss/news' },
  {
    id: 'google',
    label: 'Google',
    url: 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-US&gl=US&ceid=US:en',
  },
  { id: 'nfl', label: 'NFL', url: 'https://www.espn.com/espn/rss/nfl/news' },
  { id: 'nba', label: 'NBA', url: 'https://www.espn.com/espn/rss/nba/news' },
  { id: 'mlb', label: 'MLB', url: 'https://www.espn.com/espn/rss/mlb/news' },
  { id: 'nhl', label: 'NHL', url: 'https://www.espn.com/espn/rss/nhl/news' },
];

/** Headlines kept per feed (the 2011 page showed 12). */
export const ITEMS_PER_FEED = 12;
