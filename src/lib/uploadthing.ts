import { UTApi } from 'uploadthing/server';

const utapi = new UTApi();

// uploadFile
export async function uploadFile(file: File) {
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
