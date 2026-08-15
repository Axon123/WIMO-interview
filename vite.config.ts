import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 纯前端应用，无后端；构建产物可静态托管，也可用 Pake 打包为桌面应用。
export default defineConfig({
  plugins: [react()],
  base: './',
})
