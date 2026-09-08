import { useState, useCallback } from 'react';

interface UploadResult {
    url: string;
    path: string;
}

interface UseMediaHandlerReturn {
    isUploading: boolean;
    uploadError: Error | null;
    uploadImage: (file: File, bucket?: string) => Promise<UploadResult>;
    uploadAudio: (file: File, bucket?: string) => Promise<UploadResult>;
    convertGoogleDriveUrl: (url: string) => string;
    convertDropboxUrl: (url: string) => string;
    deleteMedia: (path: string, bucket?: string) => Promise<void>;
}

/**
 * Custom hook to handle media uploads and URL conversions
 * Abstracts Supabase storage operations following DIP
 */
export const useMediaHandler = (
    supabaseClient?: any
): UseMediaHandlerReturn => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<Error | null>(null);

    /**
     * Upload an image file to Supabase Storage
     */
    const uploadImage = useCallback(
        async (file: File, bucket: string = 'lessons'): Promise<UploadResult> => {
            try {
                setIsUploading(true);
                setUploadError(null);

                if (!supabaseClient) {
                    throw new Error('Supabase client not provided');
                }

                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `images/${fileName}`;

                const { data, error } = await supabaseClient.storage
                    .from(bucket)
                    .upload(filePath, file);

                if (error) throw error;

                const { data: urlData } = supabaseClient.storage
                    .from(bucket)
                    .getPublicUrl(data.path);

                return {
                    url: urlData.publicUrl,
                    path: data.path
                };
            } catch (error) {
                const err = error as Error;
                setUploadError(err);
                throw err;
            } finally {
                setIsUploading(false);
            }
        },
        [supabaseClient]
    );

    /**
     * Upload an audio file to Supabase Storage
     */
    const uploadAudio = useCallback(
        async (file: File, bucket: string = 'lessons'): Promise<UploadResult> => {
            try {
                setIsUploading(true);
                setUploadError(null);

                if (!supabaseClient) {
                    throw new Error('Supabase client not provided');
                }

                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `audio/${fileName}`;

                const { data, error } = await supabaseClient.storage
                    .from(bucket)
                    .upload(filePath, file);

                if (error) throw error;

                const { data: urlData } = supabaseClient.storage
                    .from(bucket)
                    .getPublicUrl(data.path);

                return {
                    url: urlData.publicUrl,
                    path: data.path
                };
            } catch (error) {
                const err = error as Error;
                setUploadError(err);
                throw err;
            } finally {
                setIsUploading(false);
            }
        },
        [supabaseClient]
    );

    /**
     * Convert Google Drive share URL to direct streaming URL
     */
    const convertGoogleDriveUrl = useCallback((url: string): string => {
        // Convert: https://drive.google.com/file/d/FILE_ID/view
        // To: https://drive.google.com/uc?export=download&id=FILE_ID

        const fileIdMatch = url.match(/\/d\/([^\/]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
            return `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
        }
        return url;
    }, []);

    /**
     * Convert Dropbox share URL to direct download URL
     */
    const convertDropboxUrl = useCallback((url: string): string => {
        // Convert dl=0 to dl=1 for direct download
        if (url.includes('dl=0')) {
            return url.replace('dl=0', 'dl=1');
        }

        // Add dl=1 if not present
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}dl=1`;
    }, []);

    /**
     * Delete media file from storage
     */
    const deleteMedia = useCallback(
        async (path: string, bucket: string = 'lessons'): Promise<void> => {
            try {
                if (!supabaseClient) {
                    throw new Error('Supabase client not provided');
                }

                const { error } = await supabaseClient.storage
                    .from(bucket)
                    .remove([path]);

                if (error) throw error;
            } catch (error) {
                console.error('Error deleting media:', error);
                throw error;
            }
        },
        [supabaseClient]
    );

    return {
        isUploading,
        uploadError,
        uploadImage,
        uploadAudio,
        convertGoogleDriveUrl,
        convertDropboxUrl,
        deleteMedia
    };
};
