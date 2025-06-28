import { TwitterApi } from 'twitter-api-v2';
import { logger } from './logger';

export interface TrendData {
  hashtag: string;
  tweetVolume: number;
  category: string;
  isPromoted: boolean;
  query: string;
}

export interface TrendContext {
  trendingTopics: string[];
  viralHashtags: string[];
  currentEvents: string[];
  popularKeywords: string[];
  lastUpdated: Date;
  trendSources: {
    trendingTopics: TrendSource[];
    viralHashtags: TrendSource[];
    currentEvents: TrendSource[];
    popularKeywords: TrendSource[];
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
   * Get trends from static bank (free tier compatible)
   */
  private async getStaticTrends(): Promise<TrendSource[]> {
    const staticTrends: TrendSource[] = [];
    
    try {
      // Comprehensive static trend bank organized by category
      const categoryTrends = {
        technology: [
          '#AI', '#Tech', '#Programming', '#Coding', '#Software', '#MachineLearning', 
          '#DataScience', '#WebDev', '#MobileApp', '#Startup', '#Innovation', '#Future'
        ],
        gaming: [
          '#Gaming', '#Gamer', '#Esports', '#Streaming', '#Twitch', '#GamingNews',
          '#PCGaming', '#ConsoleGaming', '#MobileGaming', '#IndieGame', '#GameDev'
        ],
        politics: [
          '#Politics', '#News', '#Breaking', '#Election', '#Congress', '#Democracy',
          '#Vote', '#Policy', '#Government', '#PoliticalNews', '#Civics'
        ],
        entertainment: [
          '#Entertainment', '#Celebrity', '#Movie', '#Music', '#TV', '#Hollywood',
          '#Film', '#Actor', '#Singer', '#Streaming', '#Netflix', '#Disney'
        ],
        sports: [
          '#Sports', '#Football', '#Basketball', '#Soccer', '#Athlete', '#Fitness',
          '#NFL', '#NBA', '#MLB', '#NHL', '#Olympics', '#Championship'
        ],
        business: [
          '#Business', '#Finance', '#Stock', '#Crypto', '#Startup', '#Entrepreneur',
          '#Investing', '#Markets', '#Economy', '#Leadership', '#Success'
        ],
        lifestyle: [
          '#Lifestyle', '#Health', '#Fitness', '#Wellness', '#Food', '#Travel',
          '#Fashion', '#Beauty', '#Home', '#DIY', '#Cooking', '#Adventure'
        ],
        education: [
          '#Education', '#Learning', '#Student', '#Teacher', '#School', '#University',
          '#Study', '#Knowledge', '#Academic', '#Research', '#Science'
        ]
      };
      
      // Select 2-3 random categories
      const categories = Object.keys(categoryTrends);
      const numCategories = Math.floor(Math.random() * 2) + 2; // 2-3 categories
      const selectedCategories: string[] = [];
      
      for (let i = 0; i < numCategories; i++) {
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        if (!selectedCategories.includes(randomCategory)) {
          selectedCategories.push(randomCategory);
        }
      }
      
      // Add trends from each selected category
      selectedCategories.forEach(category => {
        const trends = categoryTrends[category as keyof typeof categoryTrends];
        const numTrends = Math.floor(Math.random() * 3) + 2; // 2-4 trends per category
        
        for (let i = 0; i < numTrends; i++) {
          const trend = trends[Math.floor(Math.random() * trends.length)];
          if (!staticTrends.some(t => t.trend === trend)) {
            staticTrends.push({
              trend,
              source: 'static_bank',
              method: 'category_selection',
              category: category
            });
          }
        }
      });
      
      logger.info(`Pulled ${staticTrends.length} trends from static bank (categories: ${selectedCategories.join(', ')})`);
      
    } catch (error) {
      logger.warn('Error getting static trends:', error);
    }
    
    return staticTrends;
  }

  /**
   * Get current trending topics and context (free tier compatible)
   */
  async getTrendContext(): Promise<TrendContext> {
    // Check cache first
    if (this.trendCache && Date.now() - this.trendCache.timestamp < this.CACHE_DURATION) {
      logger.info('Using cached trend data');
      return this.trendCache.data;
    }

    try {
      logger.info('Fetching fresh trend data (free tier mode)...');
      
      // Free tier: Only use static bank, no API searches
      const staticTrends = await this.getStaticTrends();
      
      // Distribute trends across different categories for variety
      const trendingTopics = staticTrends.slice(0, Math.ceil(staticTrends.length * 0.4));
      const viralHashtags = staticTrends.slice(Math.ceil(staticTrends.length * 0.4), Math.ceil(staticTrends.length * 0.7));
      const currentEvents = staticTrends.slice(Math.ceil(staticTrends.length * 0.7), Math.ceil(staticTrends.length * 0.9));
      const popularKeywords = staticTrends.slice(Math.ceil(staticTrends.length * 0.9));

      const trendContext: TrendContext = {
        trendingTopics: trendingTopics.map(t => t.trend),
        viralHashtags: viralHashtags.map(t => t.trend),
        currentEvents: currentEvents.map(t => t.trend),
        popularKeywords: popularKeywords.map(t => t.trend),
        lastUpdated: new Date(),
        trendSources: {
          trendingTopics,
          viralHashtags,
          currentEvents,
          popularKeywords
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
    logger.info('=== FREE TIER TREND SUMMARY ===');
    logger.info('Note: Using static bank only (free tier limitations)');
    
    // Trending Topics
    logger.info(`Trending Topics (${trendContext.trendingTopics.length}):`);
    trendContext.trendSources.trendingTopics.forEach((source, i) => {
      const categoryInfo = source.category ? ` - Category: ${source.category}` : '';
      logger.info(`  ${i + 1}. ${source.trend} [Static Bank]${categoryInfo}`);
    });

    // Viral Hashtags
    logger.info(`Viral Hashtags (${trendContext.viralHashtags.length}):`);
    trendContext.trendSources.viralHashtags.forEach((source, i) => {
      const categoryInfo = source.category ? ` - Category: ${source.category}` : '';
      logger.info(`  ${i + 1}. ${source.trend} [Static Bank]${categoryInfo}`);
    });

    // Current Events
    logger.info(`Current Events (${trendContext.currentEvents.length}):`);
    trendContext.trendSources.currentEvents.forEach((source, i) => {
      const categoryInfo = source.category ? ` - Category: ${source.category}` : '';
      logger.info(`  ${i + 1}. ${source.trend} [Static Bank]${categoryInfo}`);
    });

    // Popular Keywords
    logger.info(`Popular Keywords (${trendContext.popularKeywords.length}):`);
    trendContext.trendSources.popularKeywords.forEach((source, i) => {
      const categoryInfo = source.category ? ` - Category: ${source.category}` : '';
      logger.info(`  ${i + 1}. ${source.trend} [Static Bank]${categoryInfo}`);
    });

    logger.info('=== END FREE TIER TREND SUMMARY ===');
  }

  /**
   * Get a random trending topic (free tier compatible)
   */
  async getRandomTrendingTopic(): Promise<string | undefined> {
    try {
      const trendContext = await this.getTrendContext();
      const allTopics = [
        ...trendContext.trendingTopics,
        ...trendContext.viralHashtags,
        ...trendContext.currentEvents,
        ...trendContext.popularKeywords
      ];
      
      if (allTopics.length > 0) {
        const randomTopic = allTopics[Math.floor(Math.random() * allTopics.length)];
        logger.info(`Selected random trending topic: ${randomTopic} (from static bank)`);
        return randomTopic;
      }
      
      return undefined;
    } catch (error) {
      logger.error('Error getting random trending topic:', error);
      return undefined;
    }
  }

  /**
   * Check if a topic is trending (free tier compatible - always returns false for API topics)
   */
  async isTopicTrending(topic: string): Promise<boolean> {
    // Free tier: Cannot check real trending status via API
    // Return true if topic is in our static bank, false otherwise
    try {
      const trendContext = await this.getTrendContext();
      const allTopics = [
        ...trendContext.trendingTopics,
        ...trendContext.viralHashtags,
        ...trendContext.currentEvents,
        ...trendContext.popularKeywords
      ];
      
      const isInStaticBank = allTopics.some(t => t.toLowerCase().includes(topic.toLowerCase()));
      if (isInStaticBank) {
        logger.info(`Topic "${topic}" found in static bank`);
        return true;
      } else {
        logger.info(`Topic "${topic}" not found in static bank (free tier cannot check real trends)`);
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
      viralHashtags: [],
      currentEvents: [],
      popularKeywords: [],
      lastUpdated: new Date(),
      trendSources: {
        trendingTopics: [],
        viralHashtags: [],
        currentEvents: [],
        popularKeywords: []
      }
    };
  }
}

export const trendMonitor = new TrendMonitor(); 