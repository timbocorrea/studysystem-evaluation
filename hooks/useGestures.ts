import { useState, useRef, useCallback, useEffect } from 'react';
import { hapticActions } from '../utils/haptics';

interface SwipeState {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    deltaX: number;
    deltaY: number;
    direction: 'left' | 'right' | 'up' | 'down' | null;
    isSwiping: boolean;
}

interface UseSwipeOptions {
    threshold?: number;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
    preventScroll?: boolean;
    hapticFeedback?: boolean;
}

/**
 * useSwipe - Detect swipe gestures
 */
export function useSwipe(options: UseSwipeOptions = {}) {
    const {
        threshold = 50,
        onSwipeLeft,
        onSwipeRight,
        onSwipeUp,
        onSwipeDown,
        preventScroll = false,
        hapticFeedback = true
    } = options;

    const [state, setState] = useState<SwipeState>({
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        deltaX: 0,
        deltaY: 0,
        direction: null,
        isSwiping: false
    });

    const handlers = {
        onTouchStart: useCallback((e: React.TouchEvent) => {
            const touch = e.touches[0];
            setState({
                startX: touch.clientX,
                startY: touch.clientY,
                currentX: touch.clientX,
                currentY: touch.clientY,
                deltaX: 0,
                deltaY: 0,
                direction: null,
                isSwiping: true
            });
        }, []),

        onTouchMove: useCallback((e: React.TouchEvent) => {
            if (!state.isSwiping) return;

            const touch = e.touches[0];
            const deltaX = touch.clientX - state.startX;
            const deltaY = touch.clientY - state.startY;

            let direction: SwipeState['direction'] = null;
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                direction = deltaX > 0 ? 'right' : 'left';
            } else {
                direction = deltaY > 0 ? 'down' : 'up';
            }

            if (preventScroll && Math.abs(deltaX) > 10) {
                e.preventDefault();
            }

            setState(prev => ({
                ...prev,
                currentX: touch.clientX,
                currentY: touch.clientY,
                deltaX,
                deltaY,
                direction
            }));
        }, [state.isSwiping, state.startX, state.startY, preventScroll]),

        onTouchEnd: useCallback(() => {
            if (!state.isSwiping) return;

            const { deltaX, deltaY, direction } = state;
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);

            if (absX > threshold || absY > threshold) {
                if (hapticFeedback) hapticActions.tap();

                if (direction === 'left' && absX > absY && onSwipeLeft) {
                    onSwipeLeft();
                } else if (direction === 'right' && absX > absY && onSwipeRight) {
                    onSwipeRight();
                } else if (direction === 'up' && absY > absX && onSwipeUp) {
                    onSwipeUp();
                } else if (direction === 'down' && absY > absX && onSwipeDown) {
                    onSwipeDown();
                }
            }

            setState(prev => ({ ...prev, isSwiping: false, deltaX: 0, deltaY: 0 }));
        }, [state, threshold, hapticFeedback, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown])
    };

    return { ...state, handlers };
}

interface UseLongPressOptions {
    duration?: number;
    onLongPress: () => void;
    onPress?: () => void;
    hapticFeedback?: boolean;
}

/**
 * useLongPress - Detect long press gesture
 */
export function useLongPress(options: UseLongPressOptions) {
    const {
        duration = 500,
        onLongPress,
        onPress,
        hapticFeedback = true
    } = options;

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const isLongPressRef = useRef(false);

    const handlers = {
        onTouchStart: useCallback(() => {
            isLongPressRef.current = false;
            timerRef.current = setTimeout(() => {
                isLongPressRef.current = true;
                if (hapticFeedback) hapticActions.impact();
                onLongPress();
            }, duration);
        }, [duration, hapticFeedback, onLongPress]),

        onTouchEnd: useCallback(() => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            if (!isLongPressRef.current && onPress) {
                onPress();
            }
        }, [onPress]),

        onTouchMove: useCallback(() => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        }, [])
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    return handlers;
}

interface UsePinchOptions {
    onPinchIn?: (scale: number) => void;
    onPinchOut?: (scale: number) => void;
    minScale?: number;
    maxScale?: number;
}

/**
 * usePinch - Detect pinch gestures for zoom
 */
export function usePinch(options: UsePinchOptions = {}) {
    const {
        onPinchIn,
        onPinchOut,
        minScale = 0.5,
        maxScale = 3
    } = options;

    const [scale, setScale] = useState(1);
    const initialDistance = useRef<number | null>(null);

    const getDistance = (touches: React.TouchList) => {
        const [t1, t2] = [touches[0], touches[1]];
        return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    };

    const handlers = {
        onTouchStart: useCallback((e: React.TouchEvent) => {
            if (e.touches.length === 2) {
                initialDistance.current = getDistance(e.touches);
            }
        }, []),

        onTouchMove: useCallback((e: React.TouchEvent) => {
            if (e.touches.length === 2 && initialDistance.current) {
                const currentDistance = getDistance(e.touches);
                const newScale = Math.min(
                    maxScale,
                    Math.max(minScale, currentDistance / initialDistance.current)
                );
                setScale(newScale);

                if (newScale > 1 && onPinchOut) {
                    onPinchOut(newScale);
                } else if (newScale < 1 && onPinchIn) {
                    onPinchIn(newScale);
                }
            }
        }, [minScale, maxScale, onPinchIn, onPinchOut]),

        onTouchEnd: useCallback(() => {
            initialDistance.current = null;
        }, [])
    };

    return { scale, handlers, resetScale: () => setScale(1) };
}

export default { useSwipe, useLongPress, usePinch };
