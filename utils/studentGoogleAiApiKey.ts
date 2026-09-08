const STUDENT_GOOGLE_AI_API_KEY_STORAGE_KEY = 'studysystem:student_google_ai_api_key';
export const STUDENT_GOOGLE_AI_API_KEY_CHANGE_EVENT = 'studysystem:student-google-ai-api-key-change';
export const STUDENT_GOOGLE_AI_DEFAULT_MODEL = 'gemini-2.5-flash-lite';
export const STUDENT_GOOGLE_AI_MODEL_CANDIDATES = [
  STUDENT_GOOGLE_AI_DEFAULT_MODEL,
  'gemini-2.5-flash',
  'gemini-3.5-flash'
] as const;

function dispatchStudentGoogleAiApiKeyChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(STUDENT_GOOGLE_AI_API_KEY_CHANGE_EVENT));
}

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage || null;
  } catch {
    return null;
  }
}

export function getStudentGoogleAiApiKey(): string | null {
  const storage = getLocalStorage();
  if (!storage) return null;

  try {
    const value = storage.getItem(STUDENT_GOOGLE_AI_API_KEY_STORAGE_KEY);
    const trimmedValue = value?.trim() || '';
    return trimmedValue || null;
  } catch {
    return null;
  }
}

export function setStudentGoogleAiApiKey(apiKey: string): void {
  const storage = getLocalStorage();
  if (!storage) return;

  const trimmedApiKey = apiKey.trim();
  if (!trimmedApiKey) {
    removeStudentGoogleAiApiKey();
    return;
  }

  try {
    storage.setItem(STUDENT_GOOGLE_AI_API_KEY_STORAGE_KEY, trimmedApiKey);
    dispatchStudentGoogleAiApiKeyChange();
  } catch {
    // Keep the API key out of logs and error reports.
  }
}

export function removeStudentGoogleAiApiKey(): void {
  const storage = getLocalStorage();
  if (!storage) return;

  try {
    storage.removeItem(STUDENT_GOOGLE_AI_API_KEY_STORAGE_KEY);
    dispatchStudentGoogleAiApiKeyChange();
  } catch {
    // Keep storage failures silent to avoid exposing sensitive values.
  }
}

export function hasStudentGoogleAiApiKey(): boolean {
  return Boolean(getStudentGoogleAiApiKey());
}

export function maskStudentGoogleAiApiKey(apiKey: string): string {
  const trimmedApiKey = apiKey.trim();
  if (!trimmedApiKey) return '';
  if (trimmedApiKey.length <= 8) return '********';

  return `${trimmedApiKey.slice(0, 4)}...${trimmedApiKey.slice(-4)}`;
}
