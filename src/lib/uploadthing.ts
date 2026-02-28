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

// uploadFile

// uploadFileByUrl

// getFile

// getFileUrl

// deleteFile

// listFiles