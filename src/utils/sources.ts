import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';
import { TwitterApi } from 'twitter-api-v2';

export type SourceMode = 'static' | 'dynamic';

export interface SourceConfig {
  mode: SourceMode;
  topics: string[];
  users: string[];
}

const SOURCES_FILE = path.join(process.cwd(), 'sources.json');

const DEFAULT_CONFIG: SourceConfig = {
  mode: 'static',
  topics: [],
  users: [],
};

class SourceManager {
  private config: SourceConfig;
  private twitterClient?: TwitterApi;
  private cache: { value?: string; ts: number } = { ts: 0 };

  constructor() {
    this.config = this.load();
  }

  private load(): SourceConfig {
    try {
      if (fs.existsSync(SOURCES_FILE)) {
        const data = fs.readFileSync(SOURCES_FILE, 'utf8');
        return JSON.parse(data) as SourceConfig;
      }
    } catch (error) {
      logger.error('Error loading sources:', error);
    }
    // If no file or failed to parse, write default
    this.save(DEFAULT_CONFIG);
    return { ...DEFAULT_CONFIG };
  }

  private save(cfg: SourceConfig = this.config): void {
    try {
      fs.writeFileSync(SOURCES_FILE, JSON.stringify(cfg, null, 2), 'utf8');
    } catch (error) {
      logger.error('Error saving sources:', error);
    }
  }

  getConfig(): SourceConfig {
    return { ...this.config };
  }

  setMode(mode: SourceMode): void {
    this.config.mode = mode;
    this.save();
  }

  addTopic(topic: string): void {
    if (!this.config.topics.includes(topic)) {
      this.config.topics.push(topic);
      this.save();
    }
  }

  removeTopic(topic: string): void {
    this.config.topics = this.config.topics.filter(t => t !== topic);
    this.save();
  }

  addUser(user: string): void {
    if (!this.config.users.includes(user)) {
      this.config.users.push(user);
      this.save();
    }
  }

  removeUser(user: string): void {
    this.config.users = this.config.users.filter(u => u !== user);
    this.save();
  }

  /**
   * Returns a random topic or user string, prefixed for prompts.
   * Returns undefined if no sources.
   */
  getRandomSource(): string | undefined {
    const { topics, users } = this.config;
    const combined: string[] = [];
    topics.forEach(t => combined.push(`#${t.startsWith('#') ? t.slice(1) : t}`));
    users.forEach(u => combined.push(`@${u.startsWith('@') ? u.slice(1) : u}`));
    if (combined.length === 0) return undefined;
    return combined[Math.floor(Math.random() * combined.length)];
  }

  /**
   * For dynamic mode: fetch a trending topic or a popular tweet by configured users.
   * Caches result for 60 seconds to reduce API churn.
   */
  async getDynamicSource(): Promise<string | undefined> {
    const now = Date.now();
    if (this.cache.value && now - this.cache.ts < 60_000) {
      return this.cache.value;
    }

    const client = this.getTwitterClient();
    if (!client) return undefined;

    // prioritize topics first
    if (this.config.topics.length > 0) {
      const topic = this.config.topics[Math.floor(Math.random() * this.config.topics.length)];
      const query = `#${topic} lang:en -is:retweet`; // simple filter
      try {
        const tweets = await client.v2.search(query, {
          max_results: 10,
          'tweet.fields': ['public_metrics'],
        });
        let best: any;
        for await (const tweet of tweets) {
          if (!best || (tweet.public_metrics?.retweet_count || 0) > (best.public_metrics?.retweet_count || 0)) {
            best = tweet;
          }
        }
        if (best) {
          const val = `#${topic}`;
          this.cache = { value: val, ts: now };
          return val;
        }
      } catch (error) {
        logger.warn('Dynamic topic fetch error', error);
      }
    }

    // fallback to users
    if (this.config.users.length > 0) {
      const username = this.config.users[Math.floor(Math.random() * this.config.users.length)];
      try {
        // get user id
        const user = await client.v2.userByUsername(username, { 'user.fields': ['id'] });
        if (user?.data?.id) {
          const timeline = await client.v2.userTimeline(user.data.id, {
            max_results: 5,
            'tweet.fields': ['public_metrics'],
          });
          let best: any;
          for await (const tweet of timeline) {
            if (!best || (tweet.public_metrics?.retweet_count || 0) > (best.public_metrics?.retweet_count || 0)) {
              best = tweet;
            }
          }
          if (best) {
            const val = `@${username}`;
            this.cache = { value: val, ts: now };
            return val;
          }
        }
      } catch (error) {
        logger.warn('Dynamic user fetch error', error);
      }
    }

    return undefined;
  }

  private getTwitterClient(): TwitterApi | undefined {
    if (this.twitterClient) return this.twitterClient;

    const { TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET } = process.env;
    if (!TWITTER_API_KEY || !TWITTER_API_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_TOKEN_SECRET) {
      logger.warn('Twitter credentials missing — dynamic source lookup disabled.');
      return undefined;
    }
    try {
      this.twitterClient = new TwitterApi({
        appKey: TWITTER_API_KEY,
        appSecret: TWITTER_API_SECRET,
        accessToken: TWITTER_ACCESS_TOKEN,
        accessSecret: TWITTER_ACCESS_TOKEN_SECRET,
      });
      return this.twitterClient;
    } catch (err) {
      logger.warn('Failed to initialize Twitter client — dynamic source lookup disabled.');
      return undefined;
    }
  }
}

export const sourceManager = new SourceManager(); 