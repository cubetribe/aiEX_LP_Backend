# GoAIX Backend - Production Dockerfile v5
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

# Set production environment and build
ENV NODE_ENV=production
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