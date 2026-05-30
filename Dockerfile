# ==========================================
# Stage 1: Build NestJS application
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install build dependencies for native modules
RUN apk add --no-cache make gcc g++ python3

# Copy packages and lock files
COPY package*.json ./

# Install all dependencies (development + production)
RUN npm ci

# Copy Prisma schema definition
COPY prisma ./prisma/

# Generate Prisma Client code
RUN npx prisma generate

# Copy application source code and configuration files
COPY . .

# Compile TypeScript code to production javascript
RUN npm run build

# ==========================================
# Stage 2: Runtime Environment
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

# Copy packages list
COPY --from=builder /usr/src/app/package*.json ./

# Copy all node_modules (needed for runtime CLI tools like prisma and ts-node)
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy compiled NestJS code and configuration files
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/tsconfig.json ./tsconfig.json
COPY --from=builder /usr/src/app/src ./src

# Copy startup command runner script
COPY --from=builder /usr/src/app/start.sh ./start.sh

# Ensure script is executable
RUN chmod +x start.sh

# Expose backend port
EXPOSE 3000

# Set entrypoint command
ENTRYPOINT ["./start.sh"]
