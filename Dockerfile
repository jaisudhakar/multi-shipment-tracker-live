FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

COPY package.json package-lock.json* ./

RUN npm install

COPY . .

RUN npx prisma generate

RUN npm run build

RUN echo "=== BUILD CONTENTS ===" && ls -la build/ && ls -la build/server/ && ls -la build/client/ || echo "BUILD MISSING!"

ENTRYPOINT ["sh", "-c"]
CMD ["sh", "-c", "echo '=== STARTING ===' && ls -la build/server/ && echo '=== ENV ===' && env | grep -E 'SHOPIFY|DATABASE|NODE|PORT' | sed 's/=.*PASS.*/=***/' && echo '=== RUNNING ===' && node --trace-warnings --trace-uncaught ./build/server/index.js"]
