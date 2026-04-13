const movieText = document.getElementById("keyword-text")
const submitBtn = document.getElementById("add-btn")
let movies = []

function renderMovies() {
    
}

submitBtn.addEventListener("click", () => {
    movies.push(movieText.value);
    movieText.innerText = "";
    renderMovies();
})