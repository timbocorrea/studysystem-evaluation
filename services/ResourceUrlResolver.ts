export type LessonResourceSourceType =
  | 'external_url'
  | 'supabase_public_legacy'
  | 'supabase_private_ref'
  | 'unknown';

export type LessonResourceProvider = 'supabase_storage' | 'external' | 'unknown';

export type LessonResourceKind = 'pdf' | 'audio' | 'image' | 'document' | 'link' | 'unknown';

export type UrlSafetyReason =
  | 'empty_url'
  | 'invalid_url'
  | 'blocked_protocol'
  | 'unsafe_storage_path'
  | 'unknown';

export interface ResourceUrlResolverOptions {
  /**
   * HTTP links were historically accepted by the free-form URL field. Keep this
   * true for read-time compatibility, but do not treat HTTP as safe for embed.
   */
  allowHttpForLegacyCompatibility?: boolean;
}

export interface ResolvedLessonResourceUrl {
  sourceType: LessonResourceSourceType;
  provider: LessonResourceProvider;
  originalUrl: string;
  displayUrl: string | null;
  downloadUrl: string | null;
  bucket: string | null;
  path: string | null;
  expiresAt: string | null;
  isSafe: boolean;
  canOpenInNewTab: boolean;
  isSafeForEmbed: boolean;
  shouldAvoidExternalViewer: boolean;
  reason: UrlSafetyReason | null;
  warnings: string[];
}

const SUPABASE_PUBLIC_OBJECT_MARKER = '/storage/v1/object/public/';
const LESSON_RESOURCES_BUCKET = 'lesson-resources';
const BLOCKED_PROTOCOLS = new Set(['javascript:', 'data:', 'file:', 'blob:']);
const DEFAULT_OPTIONS: Required<ResourceUrlResolverOptions> = {
  allowHttpForLegacyCompatibility: true,
};

const unsafeResult = (
  originalUrl: string,
  reason: UrlSafetyReason,
  sourceType: LessonResourceSourceType = 'unknown',
  provider: LessonResourceProvider = 'unknown',
  warnings: string[] = []
): ResolvedLessonResourceUrl => ({
  sourceType,
  provider,
  originalUrl,
  displayUrl: null,
  downloadUrl: null,
  bucket: null,
  path: null,
  expiresAt: null,
  isSafe: false,
  canOpenInNewTab: false,
  isSafeForEmbed: false,
  shouldAvoidExternalViewer: true,
  reason,
  warnings,
});

export const isSafeBucketRelativePath = (path: string): boolean => {
  if (!path || path.length > 1024) return false;
  if (path.startsWith('/') || path.endsWith('/')) return false;
  if (path.includes('\\') || path.includes('\0')) return false;
  if (path.includes('//')) return false;

  return path
    .split('/')
    .every((segment) => Boolean(segment) && segment !== '.' && segment !== '..');
};

const decodePathPartSafely = (value: string): string | null => {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
};

const normalizeKnownExternalProviderUrl = (url: string): string => {
  if (!url) return url;

  const googleDriveMatch = url.match(/https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/view/);
  if (googleDriveMatch?.[1]) {
    return `https://drive.google.com/uc?export=open&id=${googleDriveMatch[1]}`;
  }

  if (url.includes('dropbox.com') || url.includes('dropboxusercontent.com')) {
    if (url.includes('dl.dropboxusercontent.com')) return url;

    return url
      .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
      .replace('dropbox.com', 'dl.dropboxusercontent.com')
      .replace(/[?&]dl=[01]/, '')
      .replace(/[?&]raw=1/, '');
  }

  return url;
};

const extractSupabasePublicStorageRef = (parsedUrl: URL): { bucket: string; path: string } | null => {
  const markerIndex = parsedUrl.pathname.indexOf(SUPABASE_PUBLIC_OBJECT_MARKER);
  if (markerIndex === -1) return null;

  const objectPart = parsedUrl.pathname.slice(markerIndex + SUPABASE_PUBLIC_OBJECT_MARKER.length);
  const decodedObjectPart = decodePathPartSafely(objectPart);
  if (!decodedObjectPart) return null;

  const slashIndex = decodedObjectPart.indexOf('/');
  if (slashIndex <= 0) return null;

  const bucket = decodedObjectPart.slice(0, slashIndex);
  const path = decodedObjectPart.slice(slashIndex + 1);
  if (!bucket || !isSafeBucketRelativePath(path)) return null;

  return { bucket, path };
};

export const isPotentiallySafePersistedResourceUrl = (
  rawUrl: string | null | undefined,
  options: ResourceUrlResolverOptions = {}
): boolean => {
  return resolveLessonResourceUrl(rawUrl, options).isSafe;
};

export const inferLessonResourceKind = (url: string | null | undefined): LessonResourceKind => {
  if (!url) return 'unknown';

  const lowerUrl = url.toLowerCase();
  const cleanPath = (() => {
    try {
      return new URL(url).pathname.toLowerCase();
    } catch {
      return lowerUrl;
    }
  })();

  if (/\.(pdf)(\?.*)?$/i.test(cleanPath) || lowerUrl.includes('.pdf')) return 'pdf';
  if (/\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i.test(cleanPath)) return 'audio';
  if (/\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i.test(cleanPath)) return 'image';
  if (/\.(pptx?|docx?|xlsx?)(\?.*)?$/i.test(cleanPath)) return 'document';

  return 'link';
};

export const resolveLessonResourceUrl = (
  rawUrl: string | null | undefined,
  options: ResourceUrlResolverOptions = {}
): ResolvedLessonResourceUrl => {
  const resolvedOptions = { ...DEFAULT_OPTIONS, ...options };
  const originalUrl = (rawUrl || '').trim();
  if (!originalUrl) return unsafeResult(originalUrl, 'empty_url');

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(originalUrl);
  } catch {
    return unsafeResult(originalUrl, 'invalid_url');
  }

  const protocol = parsedUrl.protocol.toLowerCase();
  if (BLOCKED_PROTOCOLS.has(protocol)) {
    return unsafeResult(originalUrl, 'blocked_protocol');
  }

  const warnings: string[] = [];
  if (protocol !== 'https:') {
    if (protocol === 'http:' && resolvedOptions.allowHttpForLegacyCompatibility) {
      warnings.push('http_allowed_for_legacy_compatibility');
    } else {
      return unsafeResult(originalUrl, 'blocked_protocol');
    }
  }

  const storageRef = extractSupabasePublicStorageRef(parsedUrl);
  const sourceType: LessonResourceSourceType = storageRef ? 'supabase_public_legacy' : 'external_url';
  const provider: LessonResourceProvider = storageRef ? 'supabase_storage' : 'external';

  if (storageRef && storageRef.bucket === LESSON_RESOURCES_BUCKET && !isSafeBucketRelativePath(storageRef.path)) {
    return unsafeResult(originalUrl, 'unsafe_storage_path', sourceType, provider, warnings);
  }

  const displayUrl = normalizeKnownExternalProviderUrl(originalUrl);
  const isHttps = protocol === 'https:';
  const isLessonResourceStorage = storageRef?.bucket === LESSON_RESOURCES_BUCKET;
  const isSafeForEmbed = isHttps;

  return {
    sourceType,
    provider,
    originalUrl,
    displayUrl,
    downloadUrl: displayUrl,
    bucket: storageRef?.bucket ?? null,
    path: storageRef?.path ?? null,
    expiresAt: null,
    isSafe: true,
    canOpenInNewTab: true,
    isSafeForEmbed,
    shouldAvoidExternalViewer: !isSafeForEmbed,
    reason: null,
    warnings: isLessonResourceStorage ? [...warnings, 'lesson_resources_public_legacy_url'] : warnings,
  };
};

export const canOpenResolvedUrlInNewTab = (resolved: ResolvedLessonResourceUrl): boolean => {
  return resolved.isSafe && resolved.canOpenInNewTab && Boolean(resolved.downloadUrl);
};

export const canEmbedResolvedUrl = (resolved: ResolvedLessonResourceUrl): boolean => {
  return resolved.isSafe && resolved.isSafeForEmbed && Boolean(resolved.displayUrl);
};

export const shouldAvoidExternalDocumentViewer = (resolved: ResolvedLessonResourceUrl): boolean => {
  return resolved.shouldAvoidExternalViewer;
};

export const getSafeResolvedDisplayUrl = (resolved: ResolvedLessonResourceUrl): string | null => {
  return resolved.isSafe ? resolved.displayUrl : null;
};

export const getSanitizedUrlErrorMessage = (resolved: ResolvedLessonResourceUrl): string => {
  switch (resolved.reason) {
    case 'empty_url':
      return 'URL do material vazia.';
    case 'invalid_url':
      return 'URL do material inválida.';
    case 'blocked_protocol':
      return 'URL do material bloqueada por protocolo não permitido.';
    case 'unsafe_storage_path':
      return 'URL do material bloqueada por path de Storage inseguro.';
    default:
      return 'URL do material bloqueada por validação de segurança.';
  }
};
