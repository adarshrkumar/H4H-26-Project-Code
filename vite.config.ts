import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
    plugins: [
        react({ jsxImportSource: '@webspatial/react-sdk' }),
        VitePWA({ registerType: 'autoUpdate' }),
    ],
    resolve: {
        alias: { '@': path.resolve(__dirname, 'src') },
    },
    css: {
        preprocessorOptions: {
            scss: {
                additionalData: `@use 'variables/globals' as *;\n@use 'variables/mixins' as *;\n`,
                loadPaths: [path.resolve(__dirname, 'src/styles')],
            },
        },
    },
    server: {
        proxy: {
            '/api': 'http://localhost:3001',
        },
    },
});
