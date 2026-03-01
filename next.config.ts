import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
    // Replicates Astro's additionalData injection so every SCSS file
    // automatically has SCSS variables and mixins available.
    sassOptions: {
        additionalData: `@use 'variables/globals' as *;\n@use 'variables/mixins' as *;\n`,
        includePaths: [path.join(process.cwd(), 'src/styles')],
    },
};

export default nextConfig;
