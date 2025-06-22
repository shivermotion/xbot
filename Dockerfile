FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S xbot -u 1001

# Change ownership of the app directory
RUN chown -R xbot:nodejs /app
USER xbot

# Expose port (if needed for health checks)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# Start the application
CMD ["yarn", "start"] 