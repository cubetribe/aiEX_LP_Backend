# Use Node.js 18 Alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files from Code directory
COPY Code/package*.json ./

# Install dependencies
RUN npm ci --production --silent

# Copy application code
COPY Code/ .

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