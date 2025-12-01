// Handle messages from popup and respond with control / state
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Control commands from popup
    if (message && message.source === "spotify-ext") {
        const { cmd, value } = message;

        const controls = {
            toggle: () => {
                const btn = document.querySelector('[data-testid="control-button-playpause"]');
                btn?.click();
            },

            next: () => {
                const btn = document.querySelector('[data-testid="control-button-skip-forward"]');
                btn?.click();
            },

            prev: () => {
                const btn = document.querySelector('[data-testid="control-button-skip-back"]');
                btn?.click();
            },

            volume: (v) => {
                setSpotifyVolume(v);
            },

            seek: (percentage) => {
                setSpotifyProgress(percentage);
            }
        };

        if (controls[cmd]) {
            controls[cmd](value);
            // After any action, report fresh state
            setTimeout(reportState, 120);
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false });
        }

        return true;
    }

    // Simple string request from popup to get current state
    if (message === "spotify-ext-request-state") {
        reportState();
        sendResponse(true);
        return true;
    }
});

/* ---------------------------------------------------------
   VOLUME HELPERS
--------------------------------------------------------- */

function getVolumeInput() {
    const volBar = document.querySelector('[data-testid="volume-bar"]');
    if (!volBar) return null;

    const input = volBar.querySelector('input[type="range"]');
    return input || null;
}

function setSpotifyVolume(v) {
    if (typeof v !== "number") return;
    v = Math.max(0, Math.min(1, v));

    const input = getVolumeInput();
    if (!input) return;

    const proto = Object.getPrototypeOf(input);
    const desc = Object.getOwnPropertyDescriptor(proto, "value") ||
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");

    if (desc && typeof desc.set === "function") {
        desc.set.call(input, String(v));
    } else {
        input.value = String(v);
    }

    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
}

function getSpotifyVolume() {
    const input = getVolumeInput();
    if (!input) return 1;

    const num = Number(input.value);
    if (Number.isNaN(num)) return 1;

    return Math.max(0, Math.min(1, num));
}

/* ---------------------------------------------------------
   TRACK INFO & COVER ART HELPERS
--------------------------------------------------------- */

function setSpotifyProgress(percentage) {
    // Clamp to [0,100]
    if (typeof percentage !== "number") return;
    percentage = Math.max(0, Math.min(100, percentage));

    const progressInput = document.querySelector('[data-testid="playback-progressbar"] input[type="range"]');
    if (!progressInput) return;

    const max = Number(progressInput.max);
    const newValue = (percentage / 100) * max;

    // Use the native value setter
    const proto = Object.getPrototypeOf(progressInput);
    const desc = Object.getOwnPropertyDescriptor(proto, "value") ||
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");

    if (desc && typeof desc.set === "function") {
        desc.set.call(progressInput, String(Math.round(newValue)));
    } else {
        progressInput.value = String(Math.round(newValue));
    }

    // Fire input + change events
    progressInput.dispatchEvent(new Event("input", { bubbles: true }));
    progressInput.dispatchEvent(new Event("change", { bubbles: true }));
}

function getCoverArt() {
    // Try to get the cover art from the now playing bar
    const coverImg = document.querySelector('[data-testid="now-playing-widget"] img');
    return coverImg?.src || null;
}

function getTrackInfo() {
    // Get song title
    const titleLink = document.querySelector('[data-testid="now-playing-widget"] a[data-testid="context-item-link"]');
    const title = titleLink?.textContent || "No track playing";

    // Get artist name
    const artistLink = document.querySelector('[data-testid="now-playing-widget"] a[href*="/artist/"]');
    const artist = artistLink?.textContent || "";

    return { title, artist };
}

function getProgress() {
    // Get current time from playback-position
    const currentTimeEl = document.querySelector('[data-testid="playback-position"]');
    const current = currentTimeEl?.textContent || "0:00";

    // Get total time from playback-duration
    const totalTimeEl = document.querySelector('[data-testid="playback-duration"]');
    const total = totalTimeEl?.textContent || "0:00";

    // Get progress percentage from the progress bar input
    const progressInput = document.querySelector('[data-testid="playback-progressbar"] input[type="range"]');
    if (!progressInput) return { current, total, percentage: 0 };

    const value = Number(progressInput.value);
    const max = Number(progressInput.max);
    const percentage = max > 0 ? (value / max) * 100 : 0;

    return { current, total, percentage };
}

/* ---------------------------------------------------------
   STATE REPORTING BACK TO POPUP
--------------------------------------------------------- */

function reportState() {
    const playBtn = document.querySelector('[data-testid="control-button-playpause"]');
    const isPlaying = playBtn?.ariaLabel === "Pause";

    const volume = getSpotifyVolume();
    const coverArt = getCoverArt();
    const trackInfo = getTrackInfo();
    const progress = getProgress();

    chrome.runtime.sendMessage({
        source: "spotify-ext-update",
        state: {
            isPlaying,
            volume,
            coverArt,
            trackInfo,
            progress
        }
    });
}

// Auto-update state every second when music is playing
setInterval(() => {
    const playBtn = document.querySelector('[data-testid="control-button-playpause"]');
    const isPlaying = playBtn?.ariaLabel === "Pause";
    
    if (isPlaying) {
        reportState();
    }
}, 1000);