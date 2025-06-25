#!/bin/bash

# XBot Cron Tweet Script
# This script is called by cron to post a single tweet

# Set the working directory
cd /Users/jasonday/repos/xbot

# Load environment variables
source .env

# Run the tweet command
node dist/index.js --tweet-once

# Log the execution
echo "$(date): XBot cron tweet executed" >> logs/cron.log 