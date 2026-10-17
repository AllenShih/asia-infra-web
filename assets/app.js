const buttons = Array.from(document.querySelectorAll("[data-filter]"));
const cards = Array.from(document.querySelectorAll("[data-sector]"));
const search = document.querySelector("[data-search]");
const empty = document.querySelector("[data-empty]");
let activeFilter = "all";

function applyFilters() {
  const query = (search?.value || "").trim().toLowerCase();
  let visible = 0;

  cards.forEach((card) => {
    const matchesSector = activeFilter === "all" || card.dataset.sector === activeFilter;
    const matchesQuery = !query || card.textContent.toLowerCase().includes(query);
    const show = matchesSector && matchesQuery;
    card.hidden = !show;
    if (show) visible += 1;
  });

  if (empty) empty.style.display = visible ? "none" : "block";
}

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    buttons.forEach((item) => item.classList.toggle("is-active", item === button));
    buttons.forEach((item) => item.setAttribute("aria-pressed", item === button ? "true" : "false"));
    applyFilters();
  });
});

search?.addEventListener("input", applyFilters);
