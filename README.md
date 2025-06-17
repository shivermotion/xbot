# XBot - Automated Twitter Bot

A TypeScript-based Twitter bot that automatically generates and posts tweets using a free Large Language Model (Mistral-7B) and the Twitter API v2.

## Features

- Automated tweet generation using Mistral-7B LLM
- Integration with Twitter API v2 for posting tweets
- News API integration for context-aware tweets
- Configurable posting schedule
- Comprehensive logging system

## Prerequisites

- Node.js 16.x or higher
- Yarn package manager
- Twitter Developer Account with API access
- News API key (optional, for news-based tweets)

## Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd xbot
```

2. Install dependencies:

```bash
yarn install
```

3. Create a `.env` file in the root directory with the following variables:

```env
# Twitter API Credentials
TWITTER_API_KEY=your_api_key_here
TWITTER_API_SECRET=your_api_secret_here
TWITTER_ACCESS_TOKEN=your_access_token_here
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret_here

# News API Key
NEWS_API_KEY=your_newsapi_key_here

# Bot Configuration
TWEET_INTERVAL_HOURS=4
MAX_TWEETS_PER_DAY=5
```

4. Compile TypeScript:

```bash
yarn build
```

## Usage

Start the bot:

```bash
yarn start
```

The bot will automatically:

- Generate tweets using the Mistral-7B model
- Post tweets at the configured interval
- Log all activities to console and log files

## Configuration

- Adjust tweet frequency by modifying `TWEET_INTERVAL_HOURS` in `.env`
- Customize tweet prompts in `src/bot.ts`
- Modify logging configuration in `src/utils/logger.ts`

## Logging

Logs are stored in:

- `error.log`: Error-level logs
- `combined.log`: All logs
- Console output: Real-time logging

## Development

1. Install development dependencies:

```bash
yarn add -D typescript ts-node @types/node
```

2. Run in development mode:

```bash
yarn dev
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
