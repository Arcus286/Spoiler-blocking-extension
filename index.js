const movieText = document.getElementById("keyword-text");
const addBtn = document.getElementById("add-btn");
const keywordList = document.getElementById("keyword-list");
const clearAllBtn = document.getElementById("clear-all-btn");
const footer = document.getElementById("footer");
const countBadge = document.getElementById("count-badge");

let movies = [];

// Load saved movies on popup open
chrome.storage.local.get(["movie"], (result) => {
  if (result.movie) {
    movies = result.movie;
  }
  renderMovies();
});

function saveAndRender() {
  chrome.storage.local.set({ movie: movies }, () => {
    renderMovies();
    // Notify content script to re-run
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs
          .sendMessage(tabs[0].id, { action: "refresh" })
          .catch(() => {});
      }
    });
  });
}

function renderMovies() {
  countBadge.textContent = movies.length;
  footer.style.display = movies.length > 0 ? "flex" : "none";

  if (movies.length === 0) {
    keywordList.innerHTML = `
      <div class="empty-state">
        No keywords yet.<br>Add a movie or show to block spoilers.
      </div>`;
    return;
  }

  keywordList.innerHTML = movies
    .map(
      (movie, index) => `
      <li class="movie-item">
        <span class="movie-name" title="${escapeHtml(movie)}">${escapeHtml(movie)}</span>
        <button class="delete-item-btn" data-index="${index}" title="Remove">✕</button>
      </li>`,
    )
    .join("");

  // Attach per-item delete listeners
  keywordList.querySelectorAll(".delete-item-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.index, 10);
      movies.splice(idx, 1);
      saveAndRender();
    });
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Add keyword
function addMovie() {
  const value = movieText.value.trim();
  if (!value) return;
  if (movies.some((m) => m.toLowerCase() === value.toLowerCase())) {
    movieText.value = "";
    return; // avoid duplicates
  }
  movies.push(value);
  movieText.value = "";
  saveAndRender();
}

addBtn.addEventListener("click", addMovie);

movieText.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addMovie();
});

// Clear all
clearAllBtn.addEventListener("click", () => {
  movies = [];
  saveAndRender();
});
