let debounceTimer = null;

// Inject shield styles once into the page
function injectStyles() {
  if (document.getElementById("spoiler-shield-styles")) return;
  const style = document.createElement("style");
  style.id = "spoiler-shield-styles";
  style.textContent = `
    .spoiler-shield {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: #0a0a0a !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 9999 !important;
      cursor: pointer !important;
      border-radius: 4px !important;
      flex-direction: column !important;
      gap: 4px !important;
      text-decoration: none !important;
    }
    .spoiler-shield:hover .shield-hint {
      opacity: 1 !important;
    }
    .shield-icon {
      font-size: 22px;
      line-height: 1;
      pointer-events: none;
    }
    .shield-label {
      color: #ff3b3b !important;
      font-family: system-ui, sans-serif !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      letter-spacing: 0.1em !important;
      text-transform: uppercase !important;
      pointer-events: none;
    }
    .shield-hint {
      color: #555 !important;
      font-family: system-ui, sans-serif !important;
      font-size: 10px !important;
      opacity: 0;
      transition: opacity 0.2s;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

function hideSpoilers() {
  chrome.storage.local.get(["movie"], (result) => {
    const blockedKeywords = result.movie || [];

    if (blockedKeywords.length === 0) {
      document.querySelectorAll(".spoiler-shield").forEach((s) => s.remove());
      return;
    }

    const videoSelectors = [
      "ytd-rich-item-renderer",
      "ytd-video-renderer",
      "ytd-grid-video-renderer",
      "ytd-compact-video-renderer",
    ].join(", ");

    const videos = document.querySelectorAll(videoSelectors);

    videos.forEach((video) => {
      const titleElement =
        video.querySelector("#video-title") ||
        video.querySelector("#video-title-link") ||
        video.querySelector("a#video-title");

      if (!titleElement) return;

      const titleText = (
        titleElement.innerText ||
        titleElement.textContent ||
        ""
      )
        .toLowerCase()
        .trim();
      if (!titleText) return;

      const isSpoiler = blockedKeywords.some((kw) =>
        titleText.includes(kw.toLowerCase()),
      );

      const existingShield = video.querySelector(".spoiler-shield");

      if (isSpoiler && !existingShield) {
        applySpoilerShield(video);
      } else if (!isSpoiler && existingShield) {
        existingShield.remove();
      }
    });
  });
}

function applySpoilerShield(videoElement) {
  // a#thumbnail is the clickable thumbnail link inside ytd-thumbnail
  const target =
    videoElement.querySelector("a#thumbnail") ||
    videoElement.querySelector("ytd-thumbnail a") ||
    videoElement.querySelector("ytd-thumbnail");

  if (!target) return;

  // Make sure position:relative is set so absolute child fills it correctly
  const pos = window.getComputedStyle(target).position;
  if (pos === "static") {
    target.style.position = "relative";
  }

  const shield = document.createElement("div");
  shield.className = "spoiler-shield";
  shield.innerHTML = `
    <span class="shield-icon">❌</span>
    <span class="shield-label">SPOILER BLOCKED</span>
    <span class="shield-hint">click to peek (5s)</span>
  `;

  // Block clicks from reaching the video link underneath
  shield.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    shield.style.opacity = "0";
    shield.style.pointerEvents = "none";
    setTimeout(() => {
      shield.style.opacity = "1";
      shield.style.pointerEvents = "auto";
    }, 5000);
  });

  target.appendChild(shield);
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "refresh") {
    hideSpoilers();
  }
});

const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(hideSpoilers, 400);
});

observer.observe(document.body, { childList: true, subtree: true });

injectStyles();
hideSpoilers();
