import { UTAPI } from 'uploadthing/server';

const utapi = new UTAPI();

// uploadFile
export async function uploadFile(file: File) {
    const { fileKey } = await utapi.uploadFile(file);
    return fileKey;
}

// uploadFileByUrl
export async function uploadFileByUrl(url: string) {
    const { fileKey } = await utapi.uploadFileByUrl(url);
    return fileKey;
}

// getFile
export async function getFile(fileKey: string) {
    return await utapi.getFile(fileKey);
}

// getFileUrl
export async function getFileUrl(fileKey: string) {
    return await utapi.getFileUrl(fileKey);
}

// deleteFile
export async function deleteFile(fileKey: string) {
    return await utapi.deleteFile(fileKey);
}

// listFiles
export async function listFiles() {
    return await utapi.listFiles();
}