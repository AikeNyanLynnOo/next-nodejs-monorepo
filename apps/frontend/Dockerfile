FROM node:18-alpine

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Install pnpm
RUN npm install -g pnpm

# Copy the entire monorepo structure
COPY . .

# Change to frontend directory
WORKDIR /app/apps/frontend

# Install dependencies
RUN pnpm install

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Start the application
CMD ["pnpm", "dev"]
