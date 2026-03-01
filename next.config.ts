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

// withWebSpatial() activates avp JSX transforms when XR_ENV=avp,
// but also sets basePath=/webspatial/avp which breaks the --manifest-url dev workflow.
// We reset basePath to '' so the app always serves at root, keeping manifest and
// API routes at their normal paths. The spatial JSX aliases still take effect.
const spatialConfig = withWebSpatial()(nextConfig);
export default { ...spatialConfig, basePath: '' } satisfies NextConfig;
