# GoAIX Backend - Production Dockerfile v6
FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache python3 make g++ libc6-compat vips-dev

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install ALL dependencies (Strapi needs dev deps for build)
RUN npm ci

# Copy source code
COPY . .

# Set production environment variables
ENV NODE_ENV=production
ENV STRAPI_DISABLE_UPDATE_NOTIFICATION=true
ENV STRAPI_HIDE_STARTUP_MESSAGE=true

# Build without interactive prompts
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Create user
RUN addgroup -g 1001 -S nodejs && adduser -S strapi -u 1001
RUN chown -R strapi:nodejs /app
USER strapi

# Start application
EXPOSE 1337
CMD ["npm", "start"]