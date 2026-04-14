const DEBUG = false;
function log(...a) {
  if (DEBUG) console.log("[SpoilerShield]", ...a);
}

// ─── Styles ──────────────────────────────────────────────────────────────────
function injectStyles() {
  if (document.getElementById("spoiler-shield-styles")) return;
  const s = document.createElement("style");
  s.id = "spoiler-shield-styles";
  s.textContent = `
    .spoiler-shield {
      position: absolute !important;
      inset: 0 !important;
      background: #0a0a0a !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 6px !important;
      z-index: 999999 !important;
      cursor: pointer !important;
      border-radius: 4px !important;
      box-sizing: border-box !important;
      transition: opacity 0.25s !important;
    }
    .spoiler-shield:hover .ss-hint { opacity: 1 !important; }
    .ss-icon  { font-size: 22px !important; pointer-events: none !important; line-height: 1 !important; }
    .ss-label {
      color: #ff3b3b !important;
      font-family: system-ui, sans-serif !important;
      font-size: 11px !important; font-weight: 700 !important;
      letter-spacing: .1em !important; text-transform: uppercase !important;
      pointer-events: none !important; margin: 0 !important;
    }
    .ss-hint {
      color: #555 !important; font-family: system-ui, sans-serif !important;
      font-size: 10px !important; opacity: 0 !important;
      transition: opacity .2s !important; pointer-events: none !important; margin: 0 !important;
    }
  `;
  document.head.appendChild(s);
}

// ─── Get title text from a card ───────────────────────────────────────────────
// Handles BOTH layouts YouTube uses:
//   Home feed  → yt-lockup-view-model  → a.ytLockupMetadataViewModelTitle
//   Search/etc → ytd-video-renderer   → a#video-title or #video-title
function getTitle(card) {
  const el =
    // New home feed component (yt-lockup-view-model)
    card.querySelector("a.ytLockupMetadataViewModelTitle") ||
    card.querySelector(".ytLockupMetadataViewModelTitle") ||
    // Legacy / search results
    card.querySelector("a#video-title") ||
    card.querySelector("#video-title") ||
    card.querySelector("#video-title-link");
  return el ? (el.innerText || el.textContent || "").trim() : "";
}

// ─── Get the element to overlay ───────────────────────────────────────────────
// Home feed: yt-thumbnail-view-model  (already position:relative, correct size)
// Search:    a#thumbnail inside ytd-thumbnail
function getThumbTarget(card) {
  return (
    card.querySelector("yt-thumbnail-view-model") || // home feed (new)
    card.querySelector("a#thumbnail") || // search results
    card.querySelector("ytd-thumbnail a") ||
    card.querySelector("ytd-thumbnail")
  );
}

// ─── Shield a single card ─────────────────────────────────────────────────────
function shieldCard(card, keywords) {
  // Skip ad slots entirely
  if (card.querySelector("ytd-ad-slot-renderer")) return;

  const title = getTitle(card);
  if (!title) return; // not yet rendered

  const isMatch = keywords.some((kw) =>
    title.toLowerCase().includes(kw.toLowerCase()),
  );
  const existing = card.querySelector(".spoiler-shield");

  if (isMatch && !existing) {
    const target = getThumbTarget(card);
    if (!target) return;

    // yt-thumbnail-view-model is already relative; force it for legacy elements
    if (getComputedStyle(target).position === "static") {
      target.style.setProperty("position", "relative", "important");
    }

    const shield = document.createElement("div");
    shield.className = "spoiler-shield";
    shield.innerHTML = `
      <span class="ss-icon">❌</span>
      <span class="ss-label">Spoiler Blocked</span>
      <span class="ss-hint">Click to peek (5s)</span>
    `;

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
    log("Shielded:", title);
  } else if (!isMatch && existing) {
    existing.remove();
  }
}

// ─── Scan all cards on the page ───────────────────────────────────────────────
const CARD_SELECTOR = [
  "ytd-rich-item-renderer",
  "ytd-video-renderer",
  "ytd-grid-video-renderer",
  "ytd-compact-video-renderer",
].join(", ");

function scanAll(keywords) {
  if (!keywords.length) {
    document.querySelectorAll(".spoiler-shield").forEach((s) => s.remove());
    return;
  }
  document
    .querySelectorAll(CARD_SELECTOR)
    .forEach((c) => shieldCard(c, keywords));
}

// ─── IntersectionObserver — shields cards as they scroll into view ────────────
// Critical for the home feed: titles are blank until the card is visible
let iObs = null;
function setupIntersectionObserver(keywords) {
  if (iObs) iObs.disconnect();
  if (!keywords.length) return;
  iObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting)
          setTimeout(() => shieldCard(e.target, keywords), 150);
      });
    },
    { threshold: 0.1 },
  );
  document.querySelectorAll(CARD_SELECTOR).forEach((c) => iObs.observe(c));
}

// ─── MutationObserver — picks up newly injected cards (infinite scroll) ───────
let mTimer = null;
let keywords = [];

const mObs = new MutationObserver((mutations) => {
  const hasNew = mutations.some((m) =>
    [...m.addedNodes].some(
      (n) =>
        n.nodeType === 1 &&
        (n.matches?.(CARD_SELECTOR) || n.querySelector?.(CARD_SELECTOR)),
    ),
  );
  if (!hasNew) return;
  clearTimeout(mTimer);
  mTimer = setTimeout(() => {
    scanAll(keywords);
    if (iObs)
      document.querySelectorAll(CARD_SELECTOR).forEach((c) => iObs.observe(c));
  }, 300);
});

mObs.observe(document.body, { childList: true, subtree: true });

// ─── Message from popup ───────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "refresh") {
    chrome.storage.local.get(["movie"], (r) => {
      keywords = r.movie || [];
      scanAll(keywords);
      setupIntersectionObserver(keywords);
    });
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  chrome.storage.local.get(["movie"], (r) => {
    keywords = r.movie || [];
    injectStyles();
    scanAll(keywords);
    setupIntersectionObserver(keywords);
    setTimeout(() => scanAll(keywords), 1500);
    setTimeout(() => scanAll(keywords), 4000);
  });
}

init();
