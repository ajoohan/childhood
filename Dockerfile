FROM node:20-alpine

WORKDIR /app

# 의존성 먼저 설치 (레이어 캐시 활용). 빌드에 devDeps(vite/react)가 필요하므로 전체 설치.
COPY package*.json ./
RUN npm install

COPY . .

# React(Vite) 빌드 → dist/
RUN npm run build

ENV NODE_ENV=production
# 호스팅이 PORT 환경변수를 주면 그 값을 사용 (server.js가 process.env.PORT 사용)
EXPOSE 3000

CMD ["node", "server.js"]
