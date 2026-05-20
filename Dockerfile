FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* values are inlined into the client bundle at build time,
# so they must be present here (not at runtime). Passed via --build-arg.
ARG NEXT_PUBLIC_RPC_ENDPOINT
ARG NEXT_PUBLIC_GATEWAY_URL
ENV NEXT_PUBLIC_RPC_ENDPOINT=$NEXT_PUBLIC_RPC_ENDPOINT
ENV NEXT_PUBLIC_GATEWAY_URL=$NEXT_PUBLIC_GATEWAY_URL
# prebuild (gen-image-lists.js) runs automatically before next build
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3007
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.mjs ./
EXPOSE 3007
CMD ["npm", "start", "--", "-p", "3007"]
