FROM node:20-bookworm-slim AS deps

WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci

FROM deps AS development
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]


FROM deps AS build
COPY . .
RUN npm run build
RUN npm prune --omit=dev


FROM node:20-bookworm-slim AS production
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist

RUN mkdir -p uploads

EXPOSE 3000

CMD ["node", "dist/main.js"]
