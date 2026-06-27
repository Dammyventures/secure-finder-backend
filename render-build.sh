#!/bin/bash
set -e

echo "🚀 Starting Render build process..."
echo "Current directory: $(pwd)"
echo "Contents of current directory:"
ls -la

echo "📦 Installing dependencies..."
npm install --frozen-lockfile

echo "🔨 Building TypeScript..."
npm run build

echo "✅ Build completed successfully!"
echo "📁 Contents of dist directory:"
ls -la dist/ || echo "dist directory not found!"

# Check if app.js exists
if [ -f "dist/app.js" ]; then
    echo "✅ dist/app.js found!"
else
    echo "❌ dist/app.js NOT found!"
    exit 1
fi