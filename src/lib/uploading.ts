import { convex } from '@/db/initialize';
import { api } from '../../convex/_generated/api';
import type { Track } from '@/db/schema';

export interface UploadTrackOptions {
    file: File;
    title: string;
    artist?: string;
    album?: string;
    duration?: number;
}

/**
 * Uploads a music file to Convex storage and creates a track record.
 * Returns the newly created track.
 */
export async function uploadTrack(options: UploadTrackOptions): Promise<Track> {
    const { file, title, artist, album, duration } = options;

    // Step 1: Get a short-lived upload URL from Convex
    const uploadUrl = await convex.mutation(api.tracks.generateUploadUrl, {});

    // Step 2: POST the file to the upload URL
    const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
    });

    if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    const { storageId } = await response.json();

    // Step 3: Create the track record with the storage ID
    const track = await convex.mutation(api.tracks.createTrack, {
        title,
        mimeType: file.type,
        storageId,
        artist: artist ?? undefined,
        album: album ?? undefined,
        duration: duration ?? undefined,
    });

    if (!track) {
        throw new Error('Failed to create track record');
    }

    return track;
}

/**
 * Resolves a Convex storage ID to a playable URL.
 */
export async function getTrackUrl(storageId: string): Promise<string | null> {
    return await convex.query(api.tracks.getFileUrl, { storageId: storageId as any });
}
