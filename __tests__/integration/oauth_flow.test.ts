import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DropboxService } from '../../services/dropbox/DropboxService';

describe('OAuth CSRF Protection - Dropbox Flow (Level 5)', () => {
    const STORAGE_KEYS = {
        OAUTH_STATE: 'dropbox_oauth_state',
        CODE_VERIFIER: 'dropbox_code_verifier',
    };

    beforeEach(() => {
        // Reset sessionStorage and window.location before each test
        sessionStorage.clear();
        vi.stubGlobal('location', { search: '' });

        // Mock DropboxAuth methods to avoid real network calls
        vi.spyOn(DropboxService as any, 'initialize').mockImplementation(() => {
            (DropboxService as any).auth = {
                setCodeVerifier: vi.fn(),
                getAccessTokenFromCode: vi.fn().mockResolvedValue({
                    result: { access_token: 'mock_secure_token_123' }
                })
            };
        });
        
        // Mock history to prevent navigation errors during testing
        vi.stubGlobal('history', { replaceState: vi.fn() });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should successfully authenticate when CSRF state matches exactly', async () => {
        const secureState = 'random_crypto_string_abc123';
        const codeVerifier = 'verifier_xyz';

        // 1. App stores the state locally before redirecting
        sessionStorage.setItem(STORAGE_KEYS.OAUTH_STATE, secureState);
        sessionStorage.setItem(STORAGE_KEYS.CODE_VERIFIER, codeVerifier);

        // 2. Mock URL as if returning from Dropbox
        vi.stubGlobal('location', { 
            search: `?code=auth_code_999&state=${secureState}`,
            pathname: '/oauth/dropbox'
        });

        // 3. Process the callback
        const token = await DropboxService.handleAuthCallback();

        expect(token).toBe('mock_secure_token_123');
        // State should be consumed and cleared to prevent replay attacks
        expect(sessionStorage.getItem(STORAGE_KEYS.OAUTH_STATE)).toBeNull();
    });

    it('should maliciously fail (CSRF Attack) when state is missing from URL', async () => {
        const secureState = 'random_crypto_string_abc123';
        sessionStorage.setItem(STORAGE_KEYS.OAUTH_STATE, secureState);
        sessionStorage.setItem(STORAGE_KEYS.CODE_VERIFIER, 'verifier_xyz');

        // Attacker forces a redirect to the callback without the original state
        vi.stubGlobal('location', { search: `?code=stolen_code_666` });

        await expect(DropboxService.handleAuthCallback())
            .rejects
            .toThrow(/CSRF/i); // Must throw error citing CSRF
    });

    it('should maliciously fail (CSRF Attack) when returned state mismatches local state', async () => {
        const legitimateUserLocalState = 'real_state_user_1';
        const attackerForgedState = 'fake_state_hacker_9';
        
        sessionStorage.setItem(STORAGE_KEYS.OAUTH_STATE, legitimateUserLocalState);
        sessionStorage.setItem(STORAGE_KEYS.CODE_VERIFIER, 'verifier_xyz');

        // Attacker tricked the user into clicking a link with the attacker's state/code
        vi.stubGlobal('location', { search: `?code=attacker_code&state=${attackerForgedState}` });

        await expect(DropboxService.handleAuthCallback())
            .rejects
            .toThrow(/CSRF/i);
    });
});
