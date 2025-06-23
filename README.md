# XBot - AI-Powered Twitter Content Generator

XBot is a sophisticated Twitter/X bot that automatically generates and posts engaging tweets using the Mistral-7B Large Language Model. It enhances tweet generation by incorporating real-time news context from Twitter's own trending discussions.

## 🌟 Features

- **AI-Powered Tweet Generation**: Uses Hugging Face's Inference API with model fallback for robust tweet creation.
- **Automated Posting**: Uses `node-schedule` for configurable, automated tweet posting.
- **Interactive CLI**: A powerful, user-friendly command-line interface for managing the bot, including:
  - Dry-run mode for testing tweet generation safely.
  - Detailed analytics viewer.
  - Secure analytics reset with confirmation.
  - Comprehensive system health check.
- **Persistent Analytics**: Bot statistics (API calls, success/failure rates, uptime) are saved to `analytics.json` and persist across restarts.
- **Health Monitoring**: A dedicated health check command to verify the status of Twitter and Hugging Face APIs.
- **Containerized Deployment**: Comes with a `Dockerfile` and `docker-compose.yml` for easy, consistent deployment.
- **Pre-configured Tooling**: Includes scripts for linting (`eslint`), formatting (`prettier`), testing (`jest`), and building (`typescript`).

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

4. Build the project:

   ```bash
   yarn build
   ```

## 🎮 Usage

There are two main ways to interact with XBot: running it directly for development or deploying it in Docker for production.

### Running the Bot (Development)

To start the bot's automated scheduler directly on your machine for development or testing, use:

```bash
yarn dev
```

The bot will start, and you will see logs in your terminal. Press `Ctrl+C` to stop it gracefully.

### Running the Bot (Production)

For production, you should first build the optimized JavaScript code:

```bash
yarn build
```

Then, start the bot using:

```bash
yarn start
```

This method is more efficient and is what should be used on a server.

### Deploying with Docker (Recommended for Production)

For a true 24/7 "always-on" setup, deploying with Docker is the best approach.

1.  **Build and run the container in the background:**
    ```bash
    docker-compose up -d
    ```
2.  **View the bot's live logs:**
    ```bash
    docker-compose logs -f xbot
    ```
3.  **Stop the bot:**
    ```bash
    docker-compose down
    ```

### Using the Management CLI

The CLI is a powerful tool for managing your bot and performing one-off tasks. The bot **does not** need to be running to use most CLI features.

**Start the CLI:**

```bash
yarn cli
```

The CLI provides the following options:

1.  Generate & Post Test Tweet
2.  View Analytics
3.  Test News API
4.  View Recent Tweets
5.  View Error Log
6.  Change News Topic
7.  Check Twitter Permissions
8.  Exit

## 📊 Analytics

XBot tracks various metrics including:

- Total tweets posted
- Successful vs failed tweets
- API error rates
- News fetch success rate
- Last tweet timestamps and content
- API call statistics
- Bot uptime and performance

View these metrics through the CLI's analytics interface or check the `analytics.json` file.

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
- Health monitoring and alerts

Use the CLI's error log viewer to monitor and diagnose issues.

## 🧪 Testing

The project includes comprehensive tests:

```bash
# Run all tests
yarn test

# Run tests with coverage
yarn test --coverage

# Run tests in watch mode
yarn test --watch
```

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

## 🔧 Core Technologies

- **Node.js & TypeScript**: For a robust and scalable application.
- **Hugging Face**: For cutting-edge AI-powered tweet generation.
- **Twitter API v2**: For interacting with the Twitter platform.
- **Docker**: For containerization and easy deployment.
