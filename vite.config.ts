import { resolve } from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

const root = resolve(__dirname, 'src');
const outDir = resolve(__dirname, 'dist');

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  server: {
    // host: true, // 同じwifi内の他の端末からipアドレスを指定してdev serverにアクセスする
  },
  plugins: [
    react(),
    // basicSsl() // HTTPSでdev serverにアクセスする
  ],
  root,
  build: {
    outDir,
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        live: resolve(root, "live", 'index.html'),
        gallery: resolve(root, "gallery", 'index.html'),
        trial: resolve(root, "trial", 'index.html')
      }
    }
  }
})
