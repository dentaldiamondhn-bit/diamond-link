#!/bin/bash
set -e

echo "Starting Dental Clinic App..."

# Install dependencies
npm ci

# Build the application
npm run build

# Start the production server
npm start
