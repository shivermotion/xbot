# XBot - AI-Powered Twitter Content Generator

XBot is a sophisticated Twitter/X bot that automatically generates and posts engaging tweets using the Mistral-7B Large Language Model. It enhances tweet generation by incorporating real-time news context from Twitter's own trending discussions.

## 🌟 Features

- **AI-Powered Tweet Generation**: Uses Mistral-7B LLM through Hugging Face's API to create engaging, contextually relevant tweets
- **News-Aware Content**: Fetches current news and trending topics from Twitter to provide context for tweet generation
- **Automated Posting**: Configurable scheduling system for automated tweet posting
- **Interactive CLI**: Feature-rich command-line interface for bot management
  - Real-time analytics tracking
  - Permission verification
  - News topic configuration
  - Manual tweet generation and posting
  - Error logging and monitoring

## 🚀 Getting Started

### Prerequisites

- Node.js 16.x or higher
- Yarn package manager
- Twitter Developer Account with API access (Elevated access recommended)
- Hugging Face account with API access

### API Access Setup

1. **Twitter/X API Setup**:

   - Create a project and app in the [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
   - Set app permissions to "Read and Write"
   - Generate API Keys and Access Tokens
   - Note: After changing permissions, always regenerate your access tokens

2. **Hugging Face Setup**:
   - Create an account on [Hugging Face](https://huggingface.co)
   - Generate an API token from your profile settings

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/xbot.git
   cd xbot
   ```

2. Install dependencies:

   ```bash
   yarn install
   ```

3. Set up environment variables:

   ```bash
   cp env.example .env
   ```

   Edit `.env` and fill in your API credentials:

   ```env
   # Twitter API Credentials
   TWITTER_API_KEY=your_api_key_here
   TWITTER_API_SECRET=your_api_secret_here
   TWITTER_ACCESS_TOKEN=your_access_token_here
   TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret_here

   # Hugging Face API Token
   HUGGINGFACE_TOKEN=your_huggingface_token_here

   # Bot Configuration
   TWEET_INTERVAL_HOURS=4
   MAX_TWEETS_PER_DAY=5
   ```

## 🎮 Usage

### CLI Interface

Start the CLI interface:

```bash
yarn cli
```

The CLI provides the following options:

1. Start Bot (automated mode)
2. Generate & Post Test Tweet
3. View Analytics
4. Test News API
5. View Recent Tweets
6. View Error Log
7. Change News Topic
8. Check Twitter Permissions
9. Exit

### Automated Mode

When running in automated mode, XBot will:

1. Fetch recent news from Twitter based on configured topics
2. Generate contextually relevant tweets using Mistral-7B
3. Post tweets at configured intervals (default: every 4 hours)
4. Log all activities and maintain analytics

### Customization

1. **Tweet Generation**:

   - Edit tweet prompts in `src/bot.ts`
   - Customize the Mistral-7B parameters for different generation styles

2. **News Topics**:

   - Change news topics through the CLI
   - Default: "#news OR #breakingnews"

3. **Posting Schedule**:
   - Adjust `TWEET_INTERVAL_HOURS` in `.env`
   - Modify `MAX_TWEETS_PER_DAY` to control posting frequency

## 📊 Analytics

XBot tracks various metrics including:

- Total tweets posted
- Successful vs failed tweets
- API error rates
- News fetch success rate
- Last tweet timestamps and content

View these metrics through the CLI's analytics interface.

## 🔍 Logging

Logs are stored in:

- `error.log`: Error-level logs
- `combined.log`: All logs
- Real-time console output in CLI

## ⚠️ Error Handling

XBot includes robust error handling for:

- API rate limits
- Authentication issues
- Network failures
- Content generation failures

Use the CLI's error log viewer to monitor and diagnose issues.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Useful Links

- [Twitter API Documentation](https://developer.twitter.com/en/docs)
- [Hugging Face API Documentation](https://huggingface.co/docs/api-inference/index)
- [Mistral-7B Model Information](https://huggingface.co/mistralai/Mistral-7B-v0.1)
