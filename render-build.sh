#!/bin/bash
set -e

echo "🚀 Starting Render build process..."

echo "📦 Installing dependencies..."
yarn install --frozen-lockfile

echo "🔨 Building TypeScript..."
yarn build

echo "✅ Build completed successfully!"
echo "📁 Contents of dist directory:"
ls -la dist/