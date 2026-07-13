import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 개발 시 Vite(5173)가 /api 요청을 Express(3000)로 프록시한다.
// 빌드하면 dist/ 로 나오고, 배포에선 Express가 dist/ 를 서빙한다.
export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist" },
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
