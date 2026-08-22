import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    // 飞书边栏插件要求资源使用相对路径，不能用绝对路径
    base: './',
    plugins: [react()],
    server: {
        port: 5173,
        host: true,
    },
    build: {
        outDir: 'dist',
    },
});
