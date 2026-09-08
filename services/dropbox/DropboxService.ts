import { Dropbox, DropboxAuth } from 'dropbox';

export interface DropboxItem {
    id: string;
    name: string;
    path_lower?: string;
    path_display?: string;
    tag: 'file' | 'folder';
    size?: number;
    client_modified?: string;
}

interface DropboxEntry {
    id: string;
    name: string;
    path_lower?: string;
    path_display?: string;
    '.tag': 'file' | 'folder';
    size?: number;
    client_modified?: string;
}

const CLIENT_ID = import.meta.env.VITE_DROPBOX_APP_KEY || '';

const STORAGE_KEYS = {
    ACCESS_TOKEN: 'dropbox_access_token',
    OAUTH_STATE: 'dropbox_oauth_state',
    CODE_VERIFIER: 'dropbox_code_verifier',
} as const;

function generateCryptoState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

export class DropboxService {
    private static auth: DropboxAuth | null = null;
    private static dbx: Dropbox | null = null;
    private static accessToken: string | null = null;

    static initialize() {
        if (!CLIENT_ID) {
            console.error('Dropbox App Key não configurada (VITE_DROPBOX_APP_KEY)');
            return;
        }

        this.auth = new DropboxAuth({ clientId: CLIENT_ID });

        const savedToken = sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (savedToken) {
            this.setAccessToken(savedToken);
        }
    }

    static setAccessToken(token: string) {
        this.accessToken = token;
        sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);

        this.dbx = new Dropbox({
            accessToken: token,
            clientId: CLIENT_ID
        });
    }

    static logout() {
        this.accessToken = null;
        this.dbx = null;
        sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        sessionStorage.removeItem(STORAGE_KEYS.OAUTH_STATE);
        sessionStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER);
    }

    static isAuthenticated(): boolean {
        if (this.accessToken) return true;

        const storedToken = sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (storedToken) {
            this.setAccessToken(storedToken);
            return true;
        }
        return false;
    }

    static getRedirectUri(): string {
        return `${window.location.origin}/oauth/dropbox`;
    }

    /**
     * Generates OAuth URL using Authorization Code + PKCE flow with CSRF state parameter.
     */
    static async getAuthUrl(redirectUri?: string): Promise<string> {
        if (!this.auth) this.initialize();
        if (!this.auth) throw new Error('Falha ao inicializar DropboxAuth');

        const finalRedirectUri = redirectUri || this.getRedirectUri();

        const state = generateCryptoState();
        sessionStorage.setItem(STORAGE_KEYS.OAUTH_STATE, state);

        const authUrl = await this.auth.getAuthenticationUrl(
            finalRedirectUri,
            state,
            'code',
            'offline',
            undefined,
            undefined,
            true
        ) as string;

        const codeVerifier = this.auth.getCodeVerifier();
        if (codeVerifier) {
            sessionStorage.setItem(STORAGE_KEYS.CODE_VERIFIER, codeVerifier);
        }

        return authUrl;
    }

    /**
     * Processes OAuth callback: validates CSRF state and exchanges authorization code for token via PKCE.
     */
    static async handleAuthCallback(): Promise<string | null> {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const returnedState = params.get('state');

        if (!code) return null;

        const savedState = sessionStorage.getItem(STORAGE_KEYS.OAUTH_STATE);
        if (!savedState || savedState !== returnedState) {
            console.error('OAuth CSRF state mismatch — possível ataque CSRF.');
            this.cleanupOAuthState();
            throw new Error('Falha de segurança: estado CSRF inválido. Tente autenticar novamente.');
        }

        const codeVerifier = sessionStorage.getItem(STORAGE_KEYS.CODE_VERIFIER);
        if (!codeVerifier) {
            console.error('PKCE code verifier not found in session.');
            this.cleanupOAuthState();
            throw new Error('Falha de segurança: verificador PKCE não encontrado. Tente autenticar novamente.');
        }

        if (!this.auth) this.initialize();
        if (!this.auth) throw new Error('Falha ao inicializar DropboxAuth');

        try {
            this.auth.setCodeVerifier(codeVerifier);

            const response = await this.auth.getAccessTokenFromCode(
                this.getRedirectUri(),
                code
            );

            const token = (response as { result: { access_token: string } }).result.access_token;

            if (token) {
                this.setAccessToken(token);
                this.cleanupOAuthState();
                window.history.replaceState(null, '', window.location.pathname);
                return token;
            }
        } catch (error) {
            console.error('Erro ao trocar código por token:', error);
            this.cleanupOAuthState();
            throw new Error('Falha ao obter token de acesso do Dropbox. Tente autenticar novamente.');
        }

        return null;
    }

    private static cleanupOAuthState() {
        sessionStorage.removeItem(STORAGE_KEYS.OAUTH_STATE);
        sessionStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER);
    }

    static async listFolder(path: string = ''): Promise<DropboxItem[]> {
        if (!this.dbx) throw new Error('Usuário não autenticado no Dropbox');

        let cleanPath = path;
        if (cleanPath === '/') cleanPath = '';
        if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
            cleanPath = cleanPath.slice(0, -1);
        }

        try {
            let response = await this.dbx.filesListFolder({
                path: cleanPath,
                limit: 100
            });

            let allEntries = response.result.entries;

            while (response.result.has_more) {
                response = await this.dbx.filesListFolderContinue({
                    cursor: response.result.cursor
                });
                allEntries = allEntries.concat(response.result.entries);
            }

            return allEntries.map((entry) => {
                const e = entry as unknown as DropboxEntry;
                return {
                    id: e.id,
                    name: e.name,
                    path_lower: e.path_lower,
                    path_display: e.path_display,
                    tag: e['.tag'],
                    size: e.size,
                    client_modified: e.client_modified
                };
            });
        } catch (error) {
            const err = error as { error?: Record<string, unknown>; status?: number };

            if (err.error) {
                const errorBody = JSON.stringify(err.error);
                if (errorBody.includes('required scope')) {
                    this.logout();
                    throw new Error('Permissões insuficientes. Habilite "files.metadata.read" e "files.content.read" no Console do Dropbox.');
                }
            }

            if (err.status === 401) {
                this.logout();
                throw new Error('Sessão expirada');
            }
            throw error;
        }
    }

    static async getMetadata(path: string): Promise<DropboxItem> {
        if (!this.dbx) throw new Error('Não autenticado');
        const r = await this.dbx.filesGetMetadata({ path });
        const entry = r.result as unknown as DropboxEntry;
        return {
            id: entry.id,
            name: entry.name,
            path_display: entry.path_display,
            tag: entry['.tag'],
            size: entry.size
        };
    }

    /**
     * Gets temporary download link (expires in 4 hours)
     */
    static async getTemporaryLink(path: string): Promise<string> {
        if (!this.dbx) throw new Error('Não autenticado');
        const response = await this.dbx.filesGetTemporaryLink({ path });
        return response.result.link;
    }

    /**
     * Creates or retrieves a permanent shared link for audio streaming.
     */
    static async createSharedLink(path: string): Promise<string> {
        if (!this.dbx) throw new Error('Não autenticado');

        if (!path || !path.startsWith('/')) {
            throw new Error(`Caminho inválido: ${path}. O caminho deve começar com '/'`);
        }

        try {
            const existingLinks = await this.dbx.sharingListSharedLinks({ path });

            if (existingLinks.result.links && existingLinks.result.links.length > 0) {
                const link = existingLinks.result.links[0].url;
                return this.convertToDirectLink(link);
            }
        } catch (error: unknown) {
            const err = error as { error?: { error_summary?: string }; message?: string };
            console.warn('No existing shared link found:', err.error?.error_summary || err.message);
        }

        try {
            const response = await this.dbx.sharingCreateSharedLinkWithSettings({
                path,
                settings: {
                    requested_visibility: { '.tag': 'public' },
                    audience: { '.tag': 'public' },
                    access: { '.tag': 'viewer' }
                }
            });

            const link = response.result.url;
            return this.convertToDirectLink(link);
        } catch (error: unknown) {
            const err = error as { error?: { error_summary?: string }; status?: number };

            if (err.error?.error_summary?.includes('shared_link_already_exists')) {
                const existingLinks = await this.dbx.sharingListSharedLinks({ path });
                if (existingLinks.result.links && existingLinks.result.links.length > 0) {
                    const link = existingLinks.result.links[0].url;
                    return this.convertToDirectLink(link);
                }
            }
            throw error;
        }
    }

    private static convertToDirectLink(url: string): string {
        let directUrl = url.replace('?dl=0', '?dl=1').replace('&dl=0', '&dl=1');

        if (!directUrl.includes('dl=')) {
            directUrl += (directUrl.includes('?') ? '&' : '?') + 'dl=1';
        }

        directUrl = directUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com')
            .replace('dropbox.com', 'dl.dropboxusercontent.com');

        return directUrl;
    }
}
