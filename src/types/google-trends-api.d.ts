declare module "google-trends-api" {
  interface InterestOpts {
    keyword: string | string[];
    geo?: string;
    startTime?: Date;
    endTime?: Date;
    hl?: string;
    category?: number;
    property?: string;
  }

  interface GoogleTrendsApi {
    interestOverTime: (opts: InterestOpts) => Promise<string>;
    interestByRegion: (opts: InterestOpts) => Promise<string>;
    relatedQueries: (opts: InterestOpts) => Promise<string>;
    relatedTopics: (opts: InterestOpts) => Promise<string>;
    autoComplete: (opts: InterestOpts) => Promise<string>;
    dailyTrends: (opts: { geo?: string; trendDate?: Date }) => Promise<string>;
    realTimeTrends: (opts: { geo?: string; category?: string }) => Promise<string>;
  }

  const api: GoogleTrendsApi;
  export default api;
}
