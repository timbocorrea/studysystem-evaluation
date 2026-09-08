import { createSupabaseClient } from './supabaseClient';

export const LESSON_RESOURCES_BUCKET = 'lesson-resources';

const MB = 1024 * 1024;

type UploadResourceType = 'PDF' | 'IMAGE' | 'AUDIO' | 'FILE';

type FileUploadPolicy = {
    readonly label: string;
    readonly folder: string;
    readonly maxSizeBytes: number;
    readonly mimeTypes: readonly string[];
    readonly extensions: readonly string[];
};

export type LessonResourceStorageReference = {
    bucket: typeof LESSON_RESOURCES_BUCKET;
    path: string;
    publicUrl: string;
    mimeType: string | null;
    fileSizeBytes: number | null;
    originalFilename: string | null;
};

export type FileValidationResult = {
    valid: boolean;
    error?: string;
};

const FILE_UPLOAD_POLICIES: Record<UploadResourceType, FileUploadPolicy> = {
    PDF: {
        label: 'PDF',
        folder: 'pdfs',
        maxSizeBytes: 50 * MB,
        mimeTypes: ['application/pdf'],
        extensions: ['pdf'],
    },
    IMAGE: {
        label: 'Imagem',
        folder: 'images',
        maxSizeBytes: 10 * MB,
        mimeTypes: [
            'image/png',
            'image/jpeg',
            'image/webp',
            'image/gif',
        ],
        extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'],
    },
    AUDIO: {
        label: 'Áudio',
        folder: 'audios',
        maxSizeBytes: 50 * MB,
        mimeTypes: [
            'audio/mpeg',
            'audio/mp3',
            'audio/wav',
            'audio/ogg',
            'audio/aac',
            'audio/m4a',
            'audio/x-m4a',
            'audio/mp4',
            'audio/webm',
            'audio/flac',
        ],
        extensions: ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'webm', 'flac'],
    },
    FILE: {
        label: 'Arquivo',
        folder: 'files',
        maxSizeBytes: 50 * MB,
        mimeTypes: [
            'application/pdf',
            'text/plain',
            'text/csv',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ],
        extensions: ['pdf', 'txt', 'csv', 'docx', 'xlsx', 'pptx'],
    },
} as const;

const RESOURCE_TYPE_BY_FOLDER: Record<string, UploadResourceType> = Object.entries(FILE_UPLOAD_POLICIES).reduce(
    (acc, [resourceType, policy]) => ({ ...acc, [policy.folder]: resourceType as UploadResourceType }),
    {} as Record<string, UploadResourceType>
);

const DANGEROUS_EXTENSIONS = new Set([
    'app',
    'bat',
    'cmd',
    'com',
    'cpl',
    'dll',
    'exe',
    'hta',
    'html',
    'htm',
    'jar',
    'js',
    'jse',
    'mjs',
    'msi',
    'php',
    'ps1',
    'scr',
    'sh',
    'svg',
    'vbs',
    'wsf',
]);

const STORAGE_URL_MARKERS = [
    `/storage/v1/object/public/${LESSON_RESOURCES_BUCKET}/`,
    `/storage/v1/object/sign/${LESSON_RESOURCES_BUCKET}/`,
    `/${LESSON_RESOURCES_BUCKET}/`,
];

const getPolicy = (resourceType: string): FileUploadPolicy | null => {
    return (FILE_UPLOAD_POLICIES as Record<string, FileUploadPolicy>)[resourceType] ?? null;
};

const getFileExtension = (fileName: string): string | null => {
    const safeName = fileName.trim();
    const lastDot = safeName.lastIndexOf('.');
    if (lastDot <= 0 || lastDot === safeName.length - 1) return null;
    return safeName.slice(lastDot + 1).toLowerCase();
};

const hasDangerousDoubleExtension = (fileName: string): boolean => {
    const parts = fileName.toLowerCase().split('.').filter(Boolean);
    if (parts.length < 3) return false;
    return parts.slice(0, -1).some(part => DANGEROUS_EXTENSIONS.has(part));
};

const containsPathControl = (value: string): boolean => {
    return value.includes('\0') || value.includes('/') || value.includes('\\');
};

export const sanitizeOriginalFilename = (fileName: string): string => {
    const sanitized = fileName
        .trim()
        .replace(/[\0/\\]/g, '_')
        .replace(/\s+/g, ' ')
        .slice(0, 255);

    return sanitized || 'arquivo';
};

const sanitizeFolder = (folder: string): string => {
    const normalized = folder.trim().toLowerCase();
    if (!/^[a-z0-9_-]+$/.test(normalized)) {
        throw new Error('Pasta de destino inválida para upload.');
    }
    return normalized;
};

const createSecureObjectId = (): string => {
    const cryptoApi = globalThis.crypto;

    if (cryptoApi?.randomUUID) {
        return cryptoApi.randomUUID();
    }

    if (cryptoApi?.getRandomValues) {
        const bytes = new Uint8Array(16);
        cryptoApi.getRandomValues(bytes);
        return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    throw new Error('Geração segura de nome de arquivo indisponível neste ambiente.');
};

export const isSafeLessonResourcePath = (path: string): boolean => {
    if (!path || path.includes('\0') || path.includes('\\') || path.startsWith('/')) return false;

    const segments = path.split('/');
    if (segments.length !== 2) return false;

    const [folder, fileName] = segments;
    if (!folder || !fileName || folder === '.' || folder === '..') return false;
    if (!/^[a-z0-9_-]+$/.test(folder)) return false;
    if (!/^[a-z0-9][a-z0-9._-]*$/i.test(fileName)) return false;
    if (fileName.includes('..') || hasDangerousDoubleExtension(fileName)) return false;

    return Boolean(getFileExtension(fileName));
};

export class FileUploadService {
    private client: ReturnType<typeof createSupabaseClient> | null = null;
    private readonly bucketName: typeof LESSON_RESOURCES_BUCKET = LESSON_RESOURCES_BUCKET;

    private getSupabase() {
        if (!this.client) {
            this.client = createSupabaseClient();
        }
        return this.client;
    }

    async uploadFile(file: File, folder: string = 'files', resourceType?: string): Promise<string> {
        const reference = await this.uploadFileToStorage(file, folder, resourceType);
        return reference.publicUrl;
    }

    async uploadFileToStorage(file: File, folder: string = 'files', resourceType?: string): Promise<LessonResourceStorageReference> {
        const inferredResourceType = resourceType || RESOURCE_TYPE_BY_FOLDER[folder] || 'FILE';
        const validation = this.validateFile(file, inferredResourceType);
        if (!validation.valid) {
            throw new Error(validation.error || 'Arquivo inválido para upload.');
        }

        const filePath = this.buildStoragePath(file, folder);

        const { error } = await this.getSupabase().storage
            .from(this.bucketName)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
            });

        if (error) {
            throw new Error(`Erro ao fazer upload: ${error.message}`);
        }

        return this.getPublicStorageReference(filePath, file);
    }

    getPublicStorageReference(filePath: string, file?: File): LessonResourceStorageReference {
        if (!isSafeLessonResourcePath(filePath)) {
            throw new Error('Caminho de arquivo inválido.');
        }

        const { data: urlData } = this.getSupabase().storage
            .from(this.bucketName)
            .getPublicUrl(filePath);

        return {
            bucket: this.bucketName,
            path: filePath,
            publicUrl: urlData.publicUrl,
            mimeType: file?.type?.toLowerCase() || null,
            fileSizeBytes: typeof file?.size === 'number' ? file.size : null,
            originalFilename: file?.name ? sanitizeOriginalFilename(file.name) : null,
        };
    }

    async deleteFile(fileUrl: string): Promise<void> {
        const filePath = this.extractStoragePathFromUrl(fileUrl);
        if (!filePath) {
            throw new Error('URL de arquivo inválida para remoção.');
        }

        const { error } = await this.getSupabase().storage
            .from(this.bucketName)
            .remove([filePath]);

        if (error) {
            throw new Error(`Erro ao deletar arquivo: ${error.message}`);
        }
    }

    extractStoragePathFromUrl(fileUrl: string): string | null {
        let url: URL;
        try {
            url = new URL(fileUrl);
        } catch {
            return null;
        }

        const marker = STORAGE_URL_MARKERS.find(candidate => url.pathname.includes(candidate));
        if (!marker) return null;

        const encodedPath = url.pathname.slice(url.pathname.indexOf(marker) + marker.length);
        let decodedPath = '';
        try {
            decodedPath = decodeURIComponent(encodedPath);
        } catch {
            return null;
        }

        return isSafeLessonResourcePath(decodedPath) ? decodedPath : null;
    }

    buildStoragePath(file: File, folder: string = 'files'): string {
        const safeFolder = sanitizeFolder(folder);
        const extension = getFileExtension(file.name);
        if (!extension) {
            throw new Error('Arquivo sem extensão válida.');
        }

        const fileName = `${createSecureObjectId()}.${extension}`;
        const filePath = `${safeFolder}/${fileName}`;

        if (!isSafeLessonResourcePath(filePath)) {
            throw new Error('Caminho de arquivo inválido.');
        }

        return filePath;
    }

    validateFile(file: File, resourceType: string): FileValidationResult {
        const policy = getPolicy(resourceType);
        if (!policy) {
            return { valid: false, error: 'Tipo de recurso não permite upload de arquivo.' };
        }

        if (!file?.name || containsPathControl(file.name)) {
            return { valid: false, error: 'Nome de arquivo inválido.' };
        }

        if (file.size <= 0) {
            return { valid: false, error: 'Arquivo vazio não é permitido.' };
        }

        if (file.size > policy.maxSizeBytes) {
            return { valid: false, error: `Arquivo excede o tamanho máximo de ${this.formatFileSize(policy.maxSizeBytes)}.` };
        }

        const extension = getFileExtension(file.name);
        if (!extension || !policy.extensions.includes(extension)) {
            return { valid: false, error: `Extensão não permitida para ${policy.label}.` };
        }

        if (DANGEROUS_EXTENSIONS.has(extension) || hasDangerousDoubleExtension(file.name)) {
            return { valid: false, error: 'Extensão de arquivo não permitida.' };
        }

        const mimeType = file.type.toLowerCase();
        if (!mimeType || !policy.mimeTypes.includes(mimeType)) {
            return { valid: false, error: `Tipo MIME não permitido para ${policy.label}.` };
        }

        return { valid: true };
    }

    /**
     * Validates file type against a strict MIME + extension whitelist.
     * Cross-validates MIME type against file extension to catch spoofing.
     */
    validateFileType(file: File, resourceType: string): boolean {
        return this.validateFile(file, resourceType).valid;
    }

    getAcceptAttribute(resourceType: string): string {
        const policy = getPolicy(resourceType);
        if (!policy) return '';
        return [...policy.mimeTypes, ...policy.extensions.map(extension => `.${extension}`)].join(',');
    }

    getPolicySummary(resourceType: string): string {
        const policy = getPolicy(resourceType);
        if (!policy) return 'Use a opção URL para links externos.';
        return `${policy.extensions.map(ext => ext.toUpperCase()).join(', ')} até ${this.formatFileSize(policy.maxSizeBytes)}`;
    }

    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    getFolderByType(resourceType: string): string {
        return getPolicy(resourceType)?.folder || 'files';
    }
}

export const fileUploadService = new FileUploadService();
