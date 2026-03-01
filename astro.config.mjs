import 'dotenv/config'
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
    output: 'server',
    adapter: vercel({
        imageService: true,
    }),
    image: {
        service: {
            entrypoint: 'astro/assets/services/noop',
        },
    },
    integrations: [],
    vite: {
        css: {
            preprocessorOptions: {
                scss: {
                    api: 'modern-compiler',
                    additionalData: `@use "@/styles/variables/globals.scss" as *;`,
                },
            },
        },
    },
});
