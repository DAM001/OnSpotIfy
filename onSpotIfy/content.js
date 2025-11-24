chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle control commands
    if (message?.source === "spotify-ext") {
        const { cmd, value } = message;

        const controls = {
            toggle: () => {
                const btn = document.querySelector('[data-testid="control-button-playpause"]');
                btn?.click();
            },

            next: () =>
                document.querySelector('[data-testid="control-button-skip-forward"]')?.click(),

            prev: () =>
                document.querySelector('[data-testid="control-button-skip-back"]')?.click(),

            volume: (v) => {
                const audio = document.querySelector("audio");
                if (audio) audio.volume = v;

                const slider = document.querySelector('input[data-testid="volume-bar-slider"]');
                if (slider) {
                    slider.value = v;
                    slider.dispatchEvent(new Event("input", { bubbles: true }));
                    slider.dispatchEvent(new Event("change", { bubbles: true }));
                }
            }
        };

        if (controls[cmd]) {
            controls[cmd](value);
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false });
        }

        // After any action, send fresh real state
        setTimeout(reportState, 100);

        return true;
    }

    // Popup requesting current state
    if (message === "spotify-ext-request-state") {
        reportState();
        sendResponse(true);
        return true;
    }
});

/* --- REPORT STATE BACK TO POPUP --- */

function reportState() {
    const playBtn = document.querySelector('[data-testid="control-button-playpause"]');

    // Spotify uses aria-label "Pause" when playing, "Play" when paused
    const isPlaying = playBtn?.ariaLabel === "Pause";

    const audio = document.querySelector("audio");
    const volume = audio ? audio.volume : 1;

    chrome.runtime.sendMessage({
        source: "spotify-ext-update",
        state: {
            isPlaying,
            volume
        }
    });
}
