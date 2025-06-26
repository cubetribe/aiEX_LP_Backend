# GoAIX Backend - Production Dockerfile v3
FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache python3 make g++ libc6-compat vips-dev

# Create app directory
WORKDIR /app

# Copy package files
COPY Code/package.json Code/package-lock.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY Code/ .

# Build application
RUN npm run build

# Create user
RUN addgroup -g 1001 -S nodejs && adduser -S strapi -u 1001
RUN chown -R strapi:nodejs /app
USER strapi

# Start application
EXPOSE 1337
CMD ["npm", "start"]