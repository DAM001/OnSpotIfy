function send(cmd, value) {
    chrome.tabs.query({ url: "https://open.spotify.com/*" }, (tabs) => {
        if (!tabs.length) {
            chrome.tabs.create({ 
                url: "https://open.spotify.com",
                active: true,
                pinned: true
            }, (tab) => {
                showMessage("Click anywhere on Spotify to enable controls");
            });
            return;
        }

        chrome.tabs.sendMessage(tabs[0].id, {
            source: "spotify-ext",
            cmd,
            value
        }, (response) => {
            if (chrome.runtime.lastError) {
                showMessage("Click the Spotify tab first");
            }
        });
    });
}

function showMessage(text) {
    const msgDiv = document.getElementById("message");
    if (msgDiv) {
        msgDiv.textContent = text;
        msgDiv.style.display = "block";
        setTimeout(() => {
            msgDiv.style.display = "none";
        }, 3000);
    }
}

/* BUTTONS */
document.getElementById("prev").onclick = () => send("prev", null);
document.getElementById("next").onclick = () => send("next", null);

document.getElementById("playPause").onclick = () => {
    send("toggle", null);
};

/* VOLUME */
const volumeSlider = document.getElementById("volumeRange");

volumeSlider.onmousedown = () => {
    volumeSlider.dragging = true;
};
volumeSlider.onmouseup = () => {
    volumeSlider.dragging = false;
};

volumeSlider.oninput = (e) => {
    const v = Number(e.target.value);
    // Update CSS variable for progress fill
    volumeSlider.style.setProperty('--volume-progress', (v * 100) + '%');
    send("volume", v);
};

// Initialize volume progress on load
volumeSlider.style.setProperty('--volume-progress', (volumeSlider.value * 100) + '%');

/* INITIAL STATE REQUEST */
chrome.tabs.query({ url: "https://open.spotify.com/*" }, (tabs) => {
    if (tabs.length) {
        chrome.tabs.sendMessage(tabs[0].id, "spotify-ext-request-state");
    }
});

/* PROGRESS BAR CLICK TO SEEK */
const progressBarBg = document.getElementById("progressBarBg");
if (progressBarBg) {
    progressBarBg.onclick = (e) => {
        const rect = progressBarBg.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = (clickX / rect.width) * 100;
        send("seek", percentage);
    };
    progressBarBg.style.cursor = "pointer";
}

/* NOW PLAYING CLICK TO OPEN SPOTIFY */
const nowPlaying = document.getElementById("nowPlaying");
if (nowPlaying) {
    nowPlaying.onclick = () => {
        chrome.tabs.query({ url: "https://open.spotify.com/*" }, (tabs) => {
            if (tabs.length) {
                chrome.tabs.update(tabs[0].id, { active: true });
            } else {
                chrome.tabs.create({ url: "https://open.spotify.com" });
            }
        });
    };
    nowPlaying.style.cursor = "pointer";
}

const coverArt = document.getElementById("coverArt");
if (coverArt) {
    coverArt.style.cursor = "pointer";
}

/* RECEIVE STATE UPDATES FROM CONTENT SCRIPT */
chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || msg.source !== "spotify-ext-update") return;

    const { isPlaying, volume, coverArt, trackInfo, progress } = msg.state || {};

    // Update play/pause icon
    const icon = document.getElementById("playPauseIcon");
    if (icon) {
        icon.src = isPlaying ? "assets/pause.png" : "assets/play.png";
    }

    // Update volume slider if user is not dragging it
    if (!volumeSlider.dragging && typeof volume === "number") {
        volumeSlider.value = volume;
        // Update CSS variable for progress fill
        volumeSlider.style.setProperty('--volume-progress', (volume * 100) + '%');
    }

    // Update cover art
    const coverImg = document.getElementById("coverArt");
    if (coverImg && coverArt) {
        coverImg.src = coverArt;
        coverImg.style.display = "block";
    }

    // Update track info
    const titleEl = document.getElementById("trackTitle");
    const artistEl = document.getElementById("trackArtist");
    if (titleEl && trackInfo) {
        titleEl.textContent = trackInfo.title;
    }
    if (artistEl && trackInfo) {
        artistEl.textContent = trackInfo.artist;
    }

    // Update progress bar
    const progressBar = document.getElementById("progressBar");
    const currentTime = document.getElementById("currentTime");
    const totalTime = document.getElementById("totalTime");
    
    if (progress) {
        if (progressBar) {
            progressBar.style.width = progress.percentage + "%";
        }
        if (currentTime) {
            currentTime.textContent = progress.current;
        }
        if (totalTime) {
            totalTime.textContent = progress.total;
        }
    }
});