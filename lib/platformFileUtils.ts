import { Platform } from 'react-native';

/**
 * Convert a data URI (base64) to a Blob for web file uploads
 * On web: Converts base64 to Blob
 * On mobile: Returns data URI as-is (mobile handles base64 differently)
 */
export const dataURItoBlob = (dataURI: string): Blob | string => {
  if (Platform.OS === 'web') {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  }
  return dataURI;
};

/**
 * Get file extension from URI
 */
export const getFileExtension = (uri: string): string => {
  try {
    const match = uri.match(/\.([^./?]+)(?:\?.*)?$/);
    return match ? match[1] : 'jpg';
  } catch {
    return 'jpg';
  }
};

/**
 * Get MIME type from file extension
 */
export const getMimeType = (extension: string): string => {
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
};

/**
 * Determine if platform is web
 */
export const isWebPlatform = (): boolean => {
  return Platform.OS === 'web';
};

/**
 * Determine if platform is mobile
 */
export const isMobilePlatform = (): boolean => {
  return Platform.OS === 'ios' || Platform.OS === 'android';
};
