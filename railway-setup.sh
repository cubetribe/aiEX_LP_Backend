#!/bin/bash

# Railway Setup Script für GoAIX Backend
echo "🚀 Setting up Railway deployment for GoAIX Backend..."

# Create new Railway project
echo "📦 Creating Railway project..."
railway create --name "goaix-backend"

# Link to GitHub repository
echo "🔗 Linking GitHub repository..."
railway connect https://github.com/cubetribe/aiEX_LP_Backend.git

# Add PostgreSQL database
echo "🗄️ Adding PostgreSQL database..."
railway add postgresql

# Set environment variables
echo "⚙️ Setting environment variables..."
railway env set NODE_ENV=production
railway env set HOST=0.0.0.0
railway env set PORT=\$PORT
railway env set APP_KEYS="$(openssl rand -base64 32),$(openssl rand -base64 32),$(openssl rand -base64 32),$(openssl rand -base64 32)"
railway env set API_TOKEN_SALT="$(openssl rand -base64 16)"
railway env set ADMIN_JWT_SECRET="$(openssl rand -base64 32)"
railway env set TRANSFER_TOKEN_SALT="$(openssl rand -base64 16)"
railway env set JWT_SECRET="$(openssl rand -base64 32)"

# Set Strapi admin URL
railway env set STRAPI_ADMIN_BACKEND_URL=https://\$RAILWAY_PUBLIC_DOMAIN

# Deploy the application
echo "🚀 Starting deployment..."
railway deploy

echo "✅ Railway setup complete!"
echo "🌐 Your application will be available at the Railway-provided URL"
echo "📋 Don't forget to set up additional environment variables for AI providers if needed"