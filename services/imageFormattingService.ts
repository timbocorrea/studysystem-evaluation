import { convertDropboxUrl, convertGoogleDriveUrl } from '../utils/mediaUtils';

/**
 * ImageFormattingService - Handles media URL conversion for direct browser display.
 * Transforms Dropbox/Google Drive sharing links into raw/download links.
 */
export class ImageFormattingService {
  /**
   * Formats a raw media URL into a browser-renderable image link.
   * Supports Dropbox and Google Drive.
   */
  static formatUrl(url: string): string {
    if (!url) return '';
    
    let formatted = url.trim();
    
    // Convert Google Drive
    formatted = convertGoogleDriveUrl(formatted);
    
    // Convert Dropbox
    formatted = convertDropboxUrl(formatted);
    
    // Specific check for Dropbox raw access if not handled by mediaUtils
    if (formatted.includes('dropbox.com') || formatted.includes('dropboxusercontent.com')) {
      if (!formatted.includes('raw=1') && !formatted.includes('dl=1')) {
        formatted += (formatted.includes('?') ? '&' : '?') + 'raw=1';
      }
    }

    return formatted;
  }

  /**
   * Validates if a URL is likely to be a renderable image.
   */
  static isLikelyImage(url: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    return (
      lower.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)$/) !== null ||
      lower.includes('raw=1') ||
      lower.includes('uc?export=open') ||
      lower.includes('dl=1')
    );
  }
}
