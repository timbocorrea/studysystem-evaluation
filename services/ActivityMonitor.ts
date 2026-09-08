type PresenceCallback = () => void;

class ActivityMonitor {
    private static instance: ActivityMonitor;
    private _isMediaPlaying: boolean = false;
    private presenceCheckCallback: PresenceCallback | null = null;
    private confirmPresenceCallback: PresenceCallback | null = null;

    private constructor() { }

    public static getInstance(): ActivityMonitor {
        if (!ActivityMonitor.instance) {
            ActivityMonitor.instance = new ActivityMonitor();
        }
        return ActivityMonitor.instance;
    }

    public setMediaPlaying(isPlaying: boolean) {
        this._isMediaPlaying = isPlaying;
        // console.log(`[ActivityMonitor] Media is now ${isPlaying ? 'PLAYING' : 'PAUSED'}`);
    }

    public get isMediaPlaying(): boolean {
        return this._isMediaPlaying;
    }

    // Called by Tracker when 5 mins pass
    public triggerPresenceCheck() {
        if (this.presenceCheckCallback) {
            this.presenceCheckCallback();
        }
    }

    // Called by UI Modal to register itself
    public onPresenceCheckRequest(callback: PresenceCallback) {
        this.presenceCheckCallback = callback;
    }

    public offPresenceCheckRequest() {
        this.presenceCheckCallback = null;
    }

    // Called by Tracker to register "Reset Timer" logic
    public onPresenceConfirmed(callback: PresenceCallback) {
        this.confirmPresenceCallback = callback;
    }

    // Called by UI Modal when user clicks "Yes"
    public confirmPresence() {
        if (this.confirmPresenceCallback) {
            this.confirmPresenceCallback();
        }
    }
}

export const activityMonitor = ActivityMonitor.getInstance();
