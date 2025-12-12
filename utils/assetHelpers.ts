/**
 * Utility functions for handling asset URLs
 */

const COURSE_SERVICE_URL = import.meta.env.VITE_COURSE_SERVICE_URL || 'http://localhost:8002';

/**
 * Converts a relative asset path to a full URL
 * @param assetPath - Relative path (e.g., '/uploads/thumbnails/filename.jpg') or full URL
 * @returns Full URL for the asset
 */
export function getAssetUrl(assetPath: string | undefined | null): string {
  if (!assetPath) {
    return '';
  }

  // If it's already a full URL (http/https) or blob URL, return as is
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://') || assetPath.startsWith('blob:')) {
    return assetPath;
  }

  // If it's a relative path, prepend the course service URL
  if (assetPath.startsWith('/')) {
    return `${COURSE_SERVICE_URL}${assetPath}`;
  }

  // Otherwise, assume it's already a full path relative to course service
  return `${COURSE_SERVICE_URL}/${assetPath}`;
}

/**
 * Creates a preview URL for a local file
 * @param file - File object to create preview URL for
 * @returns Blob URL for the file
 */
export function createFilePreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revokes a blob URL to free memory
 * @param url - Blob URL to revoke
 */
export function revokeFilePreviewUrl(url: string): void {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}