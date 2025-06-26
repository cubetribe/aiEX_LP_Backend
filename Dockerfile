# Use Node.js 18 Alpine image
FROM node:18-alpine

# Install system dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat \
    vips-dev

# Set working directory
WORKDIR /app

# Copy package files from Code directory
COPY Code/package*.json ./

# Debug npm and node versions
RUN node --version && npm --version

# Clear npm cache and install dependencies
RUN npm cache clean --force && npm ci --verbose

# Copy application code
COPY Code/ .

# Build Strapi admin panel
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S strapi -u 1001

# Change ownership
RUN chown -R strapi:nodejs /app
USER strapi

# Expose port
EXPOSE 1337

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:1337/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]