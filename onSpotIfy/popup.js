function send(cmd, value) {
    chrome.tabs.query({ url: "https://open.spotify.com/*" }, (tabs) => {
        if (!tabs.length) {
            // If no Spotify tab, open it instead of alerting
            chrome.tabs.create({ url: "https://open.spotify.com" });
            return;
        }

        chrome.tabs.sendMessage(tabs[0].id, {
            source: "spotify-ext",
            cmd,
            value
        });
    });
}

/* BUTTONS */
document.getElementById("prev").onclick = () => send("prev", null);
document.getElementById("next").onclick = () => send("next", null);

document.getElementById("playPause").onclick = () => {
    // Just send the command; icon will be updated from real state
    send("toggle", null);
};

/* VOLUME */
const volumeSlider = document.getElementById("volumeRange");

// Track if user is actively dragging to avoid fighting with updates
volumeSlider.onmousedown = () => {
    volumeSlider.dragging = true;
};
volumeSlider.onmouseup = () => {
    volumeSlider.dragging = false;
};

volumeSlider.oninput = (e) => {
    const v = Number(e.target.value);
    send("volume", v);
};

/* INITIAL STATE REQUEST */
chrome.tabs.query({ url: "https://open.spotify.com/*" }, (tabs) => {
    if (tabs.length) {
        chrome.tabs.sendMessage(tabs[0].id, "spotify-ext-request-state");
    }
});

/* RECEIVE STATE UPDATES FROM CONTENT SCRIPT */
chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || msg.source !== "spotify-ext-update") return;

    const { isPlaying, volume } = msg.state || {};

    // Update play/pause icon from actual state
    const icon = document.getElementById("playPauseIcon");
    if (icon) {
        icon.src = isPlaying ? "assets/pause.png" : "assets/play.png";
    }

    // Update volume slider if user is not dragging it
    if (!volumeSlider.dragging && typeof volume === "number") {
        volumeSlider.value = volume;
    }
});
