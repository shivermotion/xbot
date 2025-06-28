import { TwitterApi } from 'twitter-api-v2';
import { logger } from './logger';
import axios from 'axios';

export interface TrendData {
  hashtag: string;
  tweetVolume: number;
  category: string;
  isPromoted: boolean;
  query: string;
}

export interface TrendContext {
  trendingTopics: string[];
  lastUpdated: Date;
  trendSources: {
    trendingTopics: TrendSource[];
  };
}

export interface TrendSource {
  trend: string;
  source: 'twitter_api' | 'static_bank' | 'external_api';
  method?: string;
  engagement?: number;
  frequency?: number;
  category?: string;
}

class TrendMonitor {
  private twitterClient?: TwitterApi;
  private trendCache: { data: TrendContext; timestamp: number } | null = null;
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
  private apiCallCount = 0;
  private readonly FREE_TIER_READ_LIMIT = 100; // Free tier: 100 read requests per month

  constructor() {
    this.initializeTwitterClient();
  }

  private initializeTwitterClient(): void {
    const { TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET } = process.env;
    if (!TWITTER_API_KEY || !TWITTER_API_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_TOKEN_SECRET) {
      logger.warn('Twitter credentials missing — trend monitoring disabled.');
      return;
    }

    try {
      this.twitterClient = new TwitterApi({
        appKey: TWITTER_API_KEY,
        appSecret: TWITTER_API_SECRET,
        accessToken: TWITTER_ACCESS_TOKEN,
        accessSecret: TWITTER_ACCESS_TOKEN_SECRET,
      });
      logger.info('Twitter client initialized for free tier usage');
    } catch (err) {
      logger.warn('Failed to initialize Twitter client for trend monitoring.');
    }
  }

  /**
   * Check if we can make API calls within free tier limits
   */
  private canMakeApiCall(): boolean {
    if (this.apiCallCount >= this.FREE_TIER_READ_LIMIT) {
      logger.warn(`Free tier read limit reached (${this.FREE_TIER_READ_LIMIT}/month). Using static bank only.`);
      return false;
    }
    return true;
  }

  /**
   * Get trends from Google Trends via SerpApi
   */
  private async getGoogleTrends(): Promise<TrendSource[]> {
    const trends: TrendSource[] = [];
    
    try {
      const SERP_API_KEY = process.env.SERP_API_KEY;
      
      if (!SERP_API_KEY) {
        logger.warn('SERP_API_KEY not configured — skipping Google Trends');
        return trends;
      }

      // SerpApi Google Trends API
      const response = await axios.get('https://serpapi.com/search.json', {
        params: {
          engine: 'google_trends',
          api_key: SERP_API_KEY,
          data_type: 'TIMESERIES',
          geo: 'US',
          date: 'today 12-m' // Last 12 months
        },
        timeout: 10000
      });

      if (response.data?.interest_over_time?.timeline_data) {
        // Get the most recent trending topics
        const timelineData = response.data.interest_over_time.timeline_data;
        const recentData = timelineData.slice(-5); // Last 5 data points
        
        recentData.forEach((dataPoint: any) => {
          if (dataPoint.values && Array.isArray(dataPoint.values)) {
            dataPoint.values.forEach((trend: any) => {
              if (trend.query && trend.value > 50) { // Only include trends with significant interest
                trends.push({
                  trend: trend.query.startsWith('#') ? trend.query : `#${trend.query.replace(/\s+/g, '')}`,
                  source: 'external_api',
                  method: 'serpapi_google_trends',
                  engagement: trend.value,
                  category: 'trending'
                });
              }
            });
          }
        });
      }

      // Also try to get trending searches
      const trendingResponse = await axios.get('https://serpapi.com/search.json', {
        params: {
          engine: 'google_trends',
          api_key: SERP_API_KEY,
          data_type: 'GEO_MAP',
          geo: 'US',
          date: 'today 1-d' // Today's trends
        },
        timeout: 10000
      });

      if (trendingResponse.data?.interest_by_region?.regions) {
        trendingResponse.data.interest_by_region.regions.forEach((region: any) => {
          if (region.keywords && Array.isArray(region.keywords)) {
            region.keywords.slice(0, 3).forEach((keyword: any) => {
              if (keyword.query && keyword.value > 30) {
                trends.push({
                  trend: keyword.query.startsWith('#') ? keyword.query : `#${keyword.query.replace(/\s+/g, '')}`,
                  source: 'external_api',
                  method: 'serpapi_google_trends',
                  engagement: keyword.value,
                  category: 'trending'
                });
              }
            });
          }
        });
      }
      
      logger.info(`Pulled ${trends.length} trends from SerpApi Google Trends`);
    } catch (error) {
      logger.warn('Error getting Google Trends via SerpApi:', error);
    }
    
    return trends;
  }

  /**
   * Get trends from Reddit (free)
   */
  private async getRedditTrends(): Promise<TrendSource[]> {
    const trends: TrendSource[] = [];
    
    try {
      // Reddit API (free, no auth required for public data)
      const subreddits = ['popular', 'trending', 'news', 'technology', 'entertainment'];
      const randomSubreddit = subreddits[Math.floor(Math.random() * subreddits.length)];
      
      const response = await axios.get(`https://www.reddit.com/r/${randomSubreddit}/hot.json`, {
        params: { limit: 10 },
        timeout: 5000,
        headers: {
          'User-Agent': 'XBot/1.0 (Trend Monitor)'
        }
      });

      if (response.data?.data?.children) {
        response.data.data.children.forEach((post: any, index: number) => {
          const title = post.data?.title || '';
          if (title && index < 5) { // Limit to top 5
            // Extract hashtags or create from title
            const hashtags = title.match(/#\w+/g) || [];
            if (hashtags.length > 0) {
              hashtags.forEach((tag: string) => {
                trends.push({
                  trend: tag,
                  source: 'external_api',
                  method: 'reddit_hot',
                  engagement: post.data?.score || 0,
                  category: 'viral'
                });
              });
            } else {
              // Create hashtag from title
              const cleanTitle = title.replace(/[^\w\s]/g, '').replace(/\s+/g, '');
              if (cleanTitle.length > 3) {
                trends.push({
                  trend: `#${cleanTitle.slice(0, 20)}`,
                  source: 'external_api',
                  method: 'reddit_hot',
                  engagement: post.data?.score || 0,
                  category: 'viral'
                });
              }
            }
          }
        });
      }
      
      logger.info(`Pulled ${trends.length} trends from Reddit (r/${randomSubreddit})`);
    } catch (error) {
      logger.warn('Error getting Reddit trends:', error);
    }
    
    return trends;
  }

  /**
   * Get trends from News APIs (free)
   */
  private async getNewsTrends(): Promise<TrendSource[]> {
    const trends: TrendSource[] = [];
    
    try {
      // NewsAPI.org (free tier: 100 requests/day)
      const NEWS_API_KEY = process.env.NEWS_API_KEY;
      
      if (NEWS_API_KEY) {
        const response = await axios.get('https://newsapi.org/v2/top-headlines', {
          params: {
            country: 'us',
            apiKey: NEWS_API_KEY,
            pageSize: 10
          },
          timeout: 5000
        });

        if (response.data?.articles) {
          response.data.articles.forEach((article: any, index: number) => {
            const title = article.title || '';
            if (title && index < 5) {
              // Extract keywords from title
              const keywords = title.split(' ')
                .filter((word: string) => word.length > 3)
                .slice(0, 3);
              
              keywords.forEach((keyword: string) => {
                const cleanKeyword = keyword.replace(/[^\w]/g, '');
                if (cleanKeyword.length > 3) {
                  trends.push({
                    trend: `#${cleanKeyword}`,
                    source: 'external_api',
                    method: 'news_api',
                    engagement: 100 - index * 10, // Simulate engagement based on position
                    category: 'current_events'
                  });
                }
              });
            }
          });
        }
        
        logger.info(`Pulled ${trends.length} trends from News API`);
      } else {
        logger.info('News API key not configured, skipping news trends');
      }
    } catch (error) {
      logger.warn('Error getting news trends:', error);
    }
    
    return trends;
  }

  /**
   * Get trends from Twitter API (limited free tier)
   */
  private async getTwitterTrends(): Promise<TrendSource[]> {
    const trends: TrendSource[] = [];
    
    if (!this.twitterClient || !this.canMakeApiCall()) {
      return trends;
    }
    
    try {
      // Note: Twitter API v2 doesn't have trendingTopics method in free tier
      // This is a placeholder for future implementation
      logger.info('Twitter API trending topics not available in free tier');
    } catch (error: any) {
      logger.warn('Error getting Twitter trends:', error.message);
    }
    
    return trends;
  }

  /**
   * Get current trending topics and context (enhanced with free APIs)
   */
  async getTrendContext(): Promise<TrendContext> {
    // Check cache first
    if (this.trendCache && Date.now() - this.trendCache.timestamp < this.CACHE_DURATION) {
      logger.info('Using cached trend data');
      return this.trendCache.data;
    }

    try {
      logger.info('Fetching fresh trend data from external APIs...');
      
      // Get trends from external APIs only (no static bank)
      const [googleTrends, redditTrends, newsTrends, twitterTrends] = await Promise.allSettled([
        this.getGoogleTrends(),
        this.getRedditTrends(),
        this.getNewsTrends(),
        this.getTwitterTrends()
      ]);

      // Combine all successful results
      const allTrends: TrendSource[] = [];
      
      if (googleTrends.status === 'fulfilled') {
        allTrends.push(...googleTrends.value);
      }
      if (redditTrends.status === 'fulfilled') {
        allTrends.push(...redditTrends.value);
      }
      if (newsTrends.status === 'fulfilled') {
        allTrends.push(...newsTrends.value);
      }
      if (twitterTrends.status === 'fulfilled') {
        allTrends.push(...twitterTrends.value);
      }

      // Remove duplicates
      const uniqueTrends = allTrends.filter((trend, index, self) => 
        index === self.findIndex(t => t.trend === trend.trend)
      );

      // Sort trends by source priority: External APIs > Twitter API
      const sortedTrends = uniqueTrends.sort((a, b) => {
        const getPriority = (source: string) => {
          switch (source) {
            case 'external_api': return 2; // Highest priority
            case 'twitter_api': return 1;  // Lower priority
            default: return 0;
          }
        };
        return getPriority(b.source) - getPriority(a.source);
      });

      // Distribute trends across categories based on available data
      const totalTrends = sortedTrends.length;
      
      if (totalTrends === 0) {
        logger.warn('No trends available from external APIs - returning empty context');
        return this.getEmptyContext();
      }

      // All trends go into trending topics (no artificial categorization)
      const trendingTopics = sortedTrends;

      const trendContext: TrendContext = {
        trendingTopics: trendingTopics.map((t: TrendSource) => t.trend),
        lastUpdated: new Date(),
        trendSources: {
          trendingTopics
        }
      };

      // Update cache
      this.trendCache = {
        data: trendContext,
        timestamp: Date.now()
      };

      // Log detailed trend information
      this.logTrendSummary(trendContext);

      return trendContext;
    } catch (error) {
      logger.error('Error getting trend context:', error);
      // Return cached data if available, otherwise empty context
      return this.trendCache?.data || this.getEmptyContext();
    }
  }

  /**
   * Log detailed summary of trends and their sources
   */
  private logTrendSummary(trendContext: TrendContext): void {
    logger.info('=== TREND SUMMARY ===');
    logger.info('Sources: Google Trends, Reddit, News API');
    
    // Trending Topics
    logger.info(`Trending Topics (${trendContext.trendingTopics.length}):`);
    trendContext.trendSources.trendingTopics.forEach((source, i) => {
      const sourceLabel = source.source === 'twitter_api' ? '[Twitter API]' : 
                         '[External API]';
      const methodInfo = source.method ? ` (${source.method})` : '';
      const categoryInfo = source.category ? ` - Category: ${source.category}` : '';
      logger.info(`  ${i + 1}. ${source.trend} ${sourceLabel}${methodInfo}${categoryInfo}`);
    });

    // Source summary
    const sourceCounts = {
      twitter_api: 0,
      external_api: 0
    };

    Object.values(trendContext.trendSources).forEach(sources => {
      sources.forEach(source => {
        if (source.source === 'twitter_api' || source.source === 'external_api') {
          sourceCounts[source.source]++;
        }
      });
    });

    logger.info('=== SOURCE BREAKDOWN ===');
    logger.info(`Twitter API: ${sourceCounts.twitter_api} trends`);
    logger.info(`External APIs: ${sourceCounts.external_api} trends`);
    logger.info('=== END TREND SUMMARY ===');
  }

  /**
   * Get a random trending topic (API-only)
   */
  async getRandomTrendingTopic(): Promise<string | undefined> {
    try {
      const trendContext = await this.getTrendContext();
      
      // Create a weighted list prioritizing external API sources
      const weightedTopics: { topic: string; weight: number; source: string }[] = [];
      
      // Add trending topics with high weight (external APIs prioritized)
      trendContext.trendSources.trendingTopics.forEach(source => {
        const weight = source.source === 'external_api' ? 3 : source.source === 'twitter_api' ? 2 : 1;
        weightedTopics.push({ topic: source.trend, weight, source: source.source });
      });
      
      if (weightedTopics.length > 0) {
        // Create weighted selection array
        const selectionArray: string[] = [];
        weightedTopics.forEach(({ topic, weight }) => {
          // Add topic multiple times based on weight (higher weight = more entries)
          for (let i = 0; i < Math.ceil(weight * 10); i++) {
            selectionArray.push(topic);
          }
        });
        
        const randomTopic = selectionArray[Math.floor(Math.random() * selectionArray.length)];
        const selectedSource = weightedTopics.find(wt => wt.topic === randomTopic)?.source || 'unknown';
        const sourceLabel = selectedSource === 'external_api' ? 'external API' : 
                           selectedSource === 'twitter_api' ? 'Twitter API' : 
                           'unknown source';
        
        logger.info(`Selected random trending topic: ${randomTopic} (from ${sourceLabel})`);
        return randomTopic;
      }
      
      return undefined;
    } catch (error) {
      logger.error('Error getting random trending topic:', error);
      return undefined;
    }
  }

  /**
   * Check if a topic is trending (API-only)
   */
  async isTopicTrending(topic: string): Promise<boolean> {
    // Check if topic is in our API-sourced trends
    try {
      const trendContext = await this.getTrendContext();
      const allSources = trendContext.trendSources.trendingTopics;
      
      const matchingSource = allSources.find(t => t.trend.toLowerCase().includes(topic.toLowerCase()));
      if (matchingSource) {
        const sourceLabel = matchingSource.source === 'external_api' ? 'external API' : 
                           matchingSource.source === 'twitter_api' ? 'Twitter API' : 
                           'unknown source';
        logger.info(`Topic "${topic}" found in ${sourceLabel}`);
        return true;
      } else {
        logger.info(`Topic "${topic}" not found in any API source`);
        return false;
      }
    } catch (error) {
      logger.error('Error checking if topic is trending:', error);
      return false;
    }
  }

  /**
   * Get API usage statistics (free tier monitoring)
   */
  getApiUsageStats(): { used: number; limit: number; remaining: number } {
    return {
      used: this.apiCallCount,
      limit: this.FREE_TIER_READ_LIMIT,
      remaining: Math.max(0, this.FREE_TIER_READ_LIMIT - this.apiCallCount)
    };
  }

  /**
   * Reset API call counter (call monthly)
   */
  resetApiCallCounter(): void {
    this.apiCallCount = 0;
    logger.info('API call counter reset for new month');
  }

  /**
   * Get empty context for fallback
   */
  private getEmptyContext(): TrendContext {
    return {
      trendingTopics: [],
      lastUpdated: new Date(),
      trendSources: {
        trendingTopics: []
      }
    };
  }
}

export const trendMonitor = new TrendMonitor(); 