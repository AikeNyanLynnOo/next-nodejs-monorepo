FROM node:18-alpine

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Install pnpm
RUN npm install -g pnpm

# Copy the entire monorepo structure
COPY . .

# Change to backend directory
WORKDIR /app/apps/backend

# Install dependencies
RUN pnpm install

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/api/users?page=1&pageSize=1 || exit 1

# Start the application
CMD ["pnpm", "dev"]
