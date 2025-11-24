function send(cmd, value) {
    chrome.tabs.query({ url: "https://open.spotify.com/*" }, (tabs) => {
        if (!tabs.length) {
            alert("No Spotify tab found! Please open https://open.spotify.com");
            return;
        }

        chrome.tabs.sendMessage(tabs[0].id, {
            source: "spotify-ext",
            cmd: cmd,
            value: value
        });
    });
}

/* BUTTONS */
document.getElementById("prev").onclick = () => send("prev", null);
document.getElementById("next").onclick = () => send("next", null);

document.getElementById("playPause").onclick = () => {
    send("toggle", null);

    // Do NOT toggle icon here; real state will come from content.js
};

/* VOLUME */
const volumeSlider = document.getElementById("volumeRange");

volumeSlider.onmousedown = () => volumeSlider.dragging = true;
volumeSlider.onmouseup = () => volumeSlider.dragging = false;

volumeSlider.oninput = (e) => {
    send("volume", Number(e.target.value));
};

/* --- STATE SYNC --- */

// Request current Spotify state when popup opens
chrome.tabs.query({ url: "https://open.spotify.com/*" }, (tabs) => {
    if (tabs.length) {
        chrome.tabs.sendMessage(tabs[0].id, "spotify-ext-request-state");
    }
});

// Receive updates from content.js
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.source !== "spotify-ext-update") return;

    const { isPlaying, volume } = msg.state;

    // Update play/pause icon from REAL Spotify state
    const icon = document.getElementById("playPauseIcon");
    icon.src = isPlaying ? "assets/pause.png" : "assets/play.png";

    // Update slider if user is not actively dragging it
    if (!volumeSlider.dragging) {
        volumeSlider.value = volume;
    }
});
