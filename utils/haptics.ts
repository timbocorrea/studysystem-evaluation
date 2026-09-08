/**
 * Haptic Feedback Utilities
 * 
 * Provides tactile feedback on mobile devices using the Vibration API.
 * Falls back silently on devices/browsers that don't support it.
 */

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

const hapticPatterns: Record<HapticType, number | number[]> = {
    light: 10,
    medium: 20,
    heavy: 40,
    success: [10, 50, 10],
    warning: [30, 50, 30],
    error: [50, 100, 50],
    selection: 5
};

/**
 * Check if the Vibration API is supported
 */
export const isHapticSupported = (): boolean => {
    return 'vibrate' in navigator;
};

/**
 * Trigger haptic feedback
 * @param type - Type of haptic feedback
 */
export const haptic = (type: HapticType = 'light'): void => {
    if (!isHapticSupported()) return;

    try {
        const pattern = hapticPatterns[type];
        navigator.vibrate(pattern);
    } catch (e) {
        // Silently fail - haptic is enhancement, not critical
        console.debug('Haptic feedback failed:', e);
    }
};

/**
 * Predefined haptic actions for common UI interactions
 */
export const hapticActions = {
    /** Light tap for button presses */
    tap: () => haptic('light'),

    /** Medium feedback for toggles */
    toggle: () => haptic('medium'),

    /** Selection change feedback */
    select: () => haptic('selection'),

    /** Success action completed */
    success: () => haptic('success'),

    /** Warning/caution feedback */
    warning: () => haptic('warning'),

    /** Error/destructive action feedback */
    error: () => haptic('error'),

    /** Heavy impact for important actions */
    impact: () => haptic('heavy'),
};

/**
 * React hook that returns haptic-enhanced click handler
 */
export const useHapticClick = <T extends (...args: any[]) => any>(
    handler: T,
    hapticType: HapticType = 'light'
): T => {
    return ((...args: Parameters<T>) => {
        haptic(hapticType);
        return handler(...args);
    }) as T;
};

export default hapticActions;
