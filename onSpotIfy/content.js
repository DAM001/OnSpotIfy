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
   Structure (from your HTML):

   <div data-testid="volume-bar">
     <button ...>mute</button>
     <div ...>
       <div ...>
         <label>
           <input type="range" min="0" max="1" step="0.1" value="...">
         </label>
         <div data-testid="progress-bar"> ... </div>
       </div>
     </div>
   </div>
--------------------------------------------------------- */

function getVolumeInput() {
    const volBar = document.querySelector('[data-testid="volume-bar"]');
    if (!volBar) return null;

    const input = volBar.querySelector('input[type="range"]');
    return input || null;
}

function setSpotifyVolume(v) {
    // Clamp to [0,1]
    if (typeof v !== "number") return;
    v = Math.max(0, Math.min(1, v));

    const input = getVolumeInput();
    if (!input) return;

    // Use the native value setter so React's internal value is updated
    const proto = Object.getPrototypeOf(input);
    const desc = Object.getOwnPropertyDescriptor(proto, "value") ||
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");

    if (desc && typeof desc.set === "function") {
        desc.set.call(input, String(v));
    } else {
        input.value = String(v);
    }

    // Fire input + change events so React/Spotify actually apply the change
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
}

function getSpotifyVolume() {
    const input = getVolumeInput();
    if (!input) return 1;

    const num = Number(input.value);
    if (Number.isNaN(num)) return 1;

    // Input is 0–1 already in your HTML
    return Math.max(0, Math.min(1, num));
}

/* ---------------------------------------------------------
   STATE REPORTING BACK TO POPUP
--------------------------------------------------------- */

function reportState() {
    const playBtn = document.querySelector('[data-testid="control-button-playpause"]');
    const isPlaying = playBtn?.ariaLabel === "Pause";

    const volume = getSpotifyVolume();

    chrome.runtime.sendMessage({
        source: "spotify-ext-update",
        state: {
            isPlaying,
            volume
        }
    });
}
