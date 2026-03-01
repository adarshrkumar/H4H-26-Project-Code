import { UTApi } from 'uploadthing/server';
import type { UploadedFileData } from 'uploadthing/types';

const utapi = new UTApi();

interface UploadResult {
    data: UploadedFileData;
    error: null;
}

interface UploadError {
    data: null;
    error: unknown;
}

// uploadFile
export async function uploadFile(file: File): Promise<UploadResult | UploadError> {
    const result = await utapi.uploadFiles([file]);
    return result[0];
}

// uploadFileByUrl
export async function uploadFileByUrl(url: string) {
    const result = await utapi.uploadFilesFromUrl([url]);
    return result[0];
}

// getFileUrl
export function getFileUrl(fileKey: string) {
    return `https://utfs.io/f/${fileKey}`;
}

// deleteFile
export async function deleteFile(fileKey: string) {
    return await utapi.deleteFiles([fileKey]);
}

// listFiles
export async function listFiles() {
    return (await utapi.listFiles()).files;
}

// getFile
export async function getFile(fileKey: string) {
    const files = await listFiles();
    return files.find(file => file.key === fileKey);
}
