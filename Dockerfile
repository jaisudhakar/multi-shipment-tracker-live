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
CMD ["echo '=== STARTING APP ===' && node --trace-warnings ./build/server/index.js 2>&1"]