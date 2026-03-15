FROM node:22-bookworm-slim

WORKDIR /app

# 依赖
COPY package.json package-lock.json ./
RUN npm ci --silent

# 源码
COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["npm","run","server"]
