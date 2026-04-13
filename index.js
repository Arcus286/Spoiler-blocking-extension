const movieText = document.getElementById("keyword-text");
const submitBtn = document.getElementById("add-btn");
const keywordList = document.getElementById("keyword-list");
const deleteBtn = document.getElementById("delete-btn");
let movies = [];

chrome.storage.local.get(["movie"], (result) => {
  if (result.movie) {
    movies = result.movie;
    renderMovies();
  }
});

function renderMovies() {
  let str = "";
  for (let i = 0; i < movies.length; i++) {
    str += `<li id = "movie-list">${movies[i]}</li>`;
  }
  keywordList.innerHTML = str;
}

submitBtn.addEventListener("click", () => {
  if (movieText.value) {
    movies.push(movieText.value);
    movieText.value = "";
    chrome.storage.local.set({ movie: movies }, () => {
      renderMovies();
    });
  }
});

deleteBtn.addEventListener("dblclick", () => {
  chrome.storage.local.clear();
  movies = [];
  renderMovies();
});
