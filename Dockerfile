FROM node:24-bullseye AS development-dependencies-env
COPY package*.json /app/
COPY prisma /app/prisma
WORKDIR /app
RUN npm ci

FROM node:24-bullseye AS production-dependencies-env
COPY package*.json /app/
COPY prisma /app/prisma
WORKDIR /app
RUN npm ci --omit=dev

FROM node:24-bullseye AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN npx prisma generate
RUN npm run build

FROM node:24-bullseye
RUN apt-get update && apt-get install -y \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
COPY --from=build-env /app/node_modules/@prisma-app /app/node_modules/@prisma-app
COPY prisma /app/prisma
COPY start.sh /app/start.sh
WORKDIR /app

RUN chmod +x /app/start.sh

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["/app/start.sh"]
