import { isPotentiallySafePersistedResourceUrl } from '@/services/ResourceUrlResolver';

/**
 * Utility functions for handling media URLs (Dropbox, Google Drive)
 * and document type detection.
 */

const isSafeMediaUrl = (url: string): boolean => {
  return isPotentiallySafePersistedResourceUrl(url, { allowHttpForLegacyCompatibility: true });
};

/**
 * Converts Google Drive sharing links to direct download/stream links.
 */
export const convertGoogleDriveUrl = (url: string): string => {
  if (!url) return url;
  if (!isSafeMediaUrl(url)) return '';
  
  // Detect standard sharing link: https://drive.google.com/file/d/[FILE_ID]/view?usp=sharing
  const driveShareRegex = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/view/;
  const match = url.match(driveShareRegex);

  if (match && match[1]) {
    const fileId = match[1];
    // export=open/view works well for many things, but uc?id= is more direct for some players
    return `https://drive.google.com/uc?export=open&id=${fileId}`;
  }

  return url;
};

/**
 * Converts Dropbox sharing links to direct download links.
 */
export const convertDropboxUrl = (url: string): string => {
  if (!url) return url;
  if (!isSafeMediaUrl(url)) return '';

  if (url.includes('dropbox.com') || url.includes('dropboxusercontent.com')) {
    // If it's already a direct link, keep it
    if (url.includes('dl.dropboxusercontent.com')) return url;

    // Convert to dl.dropboxusercontent.com and strip download params
    return url.replace('www.dropbox.com', 'dl.dropboxusercontent.com')
      .replace('dropbox.com', 'dl.dropboxusercontent.com')
      .replace(/[?&]dl=[01]/, '')
      .replace(/[?&]raw=1/, '');
  }
  
  return url;
};

/**
 * Checks if a URL points to a document file (PDF, PPTX, etc.)
 */
export const isDocumentFile = (url: string): boolean => {
  if (!url) return false;
  if (!isSafeMediaUrl(url)) return false;

  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.includes('.pdf') || 
    lowerUrl.includes('.pptx') || 
    lowerUrl.includes('.ppt') || 
    lowerUrl.includes('.docx') || 
    lowerUrl.includes('.doc') || 
    lowerUrl.includes('.xlsx') || 
    lowerUrl.includes('.xls')
  );
};

/**
 * Returns a viewer URL for documents (usually Google Docs Viewer)
 */
export const getDocumentViewerUrl = (url: string, type?: string): string => {
  if (!url) return '';
  if (!isSafeMediaUrl(url)) return '';
  
  const convertedUrl = convertDropboxUrl(convertGoogleDriveUrl(url));
  const lowerUrl = url.toLowerCase();
  
  // If it's a PPTX or other Office file, Google Docs Viewer is usually the best bet for embedding
  if (lowerUrl.includes('.pptx') || lowerUrl.includes('.ppt') || type === 'pptx') {
    // Office Live viewer is another option, but Google is often faster
    return `https://docs.google.com/viewer?url=${encodeURIComponent(convertedUrl)}&embedded=true`;
  }
  
  // For PDF, we can use the same or let the internal renderer handle it if simple
  return convertedUrl;
};
