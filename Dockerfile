FROM node:20-alpine

RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./

RUN npm install && npm cache clean --force

COPY . .

RUN npx prisma generate

RUN npm run build

CMD sh -c "echo '=== MIGRATIONS ===' && npx prisma migrate deploy; echo '=== STARTING APP ==='; exec npm run start"
