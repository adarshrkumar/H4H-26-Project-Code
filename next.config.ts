import type { NextConfig } from 'next';
import path from 'path';
import withWebSpatial from '@webspatial/next-plugin';

const nextConfig: NextConfig = {
    // Pin the workspace root to this project so Next.js doesn't get confused
    // by parent-directory lockfiles in a monorepo-like folder structure.
    outputFileTracingRoot: path.join(__dirname),

    // Replicates Astro's additionalData injection so every SCSS file
    // automatically has SCSS variables and mixins available.
    sassOptions: {
        additionalData: `@use 'variables/globals' as *;\n@use 'variables/mixins' as *;\n`,
        includePaths: [path.join(process.cwd(), 'src/styles')],
    },
};

export default withWebSpatial()(nextConfig);
