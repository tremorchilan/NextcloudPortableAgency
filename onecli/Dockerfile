# OneCLI — secret guardian for Empire stacks.
# Multi-stage: build with tsc, run on node:alpine.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json tsconfig.json ./
COPY src ./src
RUN npm install --global typescript@5.4.5 \
  && tsc -p .

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY config ./config
COPY package.json ./
EXPOSE 8080
USER node
CMD ["node", "dist/main.js"]
