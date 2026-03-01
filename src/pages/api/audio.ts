import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
    const fileKey = url.searchParams.get('key');

    if (!fileKey) {
        return new Response(
            JSON.stringify({ error: 'Missing file key' }),
            { status: 400 }
        );
    }

    try {
        const audioUrl = `https://utfs.io/f/${fileKey}`;
        const response = await fetch(audioUrl);

        if (!response.ok) {
            return new Response(
                JSON.stringify({ error: 'Failed to fetch audio' }),
                { status: response.status }
            );
        }

        const audioBuffer = await response.arrayBuffer();

        return new Response(
            audioBuffer,
            {
                headers: {
                    'Content-Type': 'audio/mpeg',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET',
                    'Cache-Control': 'public, max-age=86400',
                },
            }
        );
    } catch (err) {
        console.error('[api/audio] Error:', err);
        return new Response(
            JSON.stringify({ error: 'Server error' }),
            { status: 500 }
        );
    }
};
