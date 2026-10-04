const scoreCircle = document.querySelector(".score-circle");

if (scoreCircle) {

    const target = Number(scoreCircle.dataset.score);

    let current = 0;

    const timer = setInterval(() => {

        current++;

        scoreCircle.innerHTML = `${current}<small>%</small>`;

        if (current >= target) {

            clearInterval(timer);

        }

    }, 18);

}

const toggleButton = document.getElementById("toggleAnswers");
const answersBody = document.getElementById("answersBody");

if (toggleButton && answersBody) {

    toggleButton.addEventListener("click", () => {

        answersBody.classList.toggle("show");

        toggleButton.textContent = answersBody.classList.contains("show")
            ? "Hide Answers"
            : "Show Answers";

    });

}

const cards = document.querySelectorAll(
    ".hero-card, .overview-card, .info-card, .answers-card, .personal-result-card"
);

const observer = new IntersectionObserver(entries => {

    entries.forEach(entry => {

        if (entry.isIntersecting) {

            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";

        }

    });

}, {
    threshold: .15
});

cards.forEach(card => {

    card.style.opacity = "0";
    card.style.transform = "translateY(30px)";
    card.style.transition = ".45s ease";

    observer.observe(card);

});

document.querySelectorAll(".tip").forEach(tip => {

    tip.addEventListener("click", () => {

        tip.classList.toggle("active");

    });

});

document.querySelectorAll(".overview-card").forEach(card => {

    card.addEventListener("mouseenter", () => {

        card.style.transform = "translateY(-8px) scale(1.02)";

    });

    card.addEventListener("mouseleave", () => {

        card.style.transform = "";

    });

});

document.querySelectorAll(".category-fill").forEach(fill => {

    const width = Number(fill.dataset.width);

    if (!Number.isNaN(width)) {
        fill.style.width = `${width}%`;
    }

});

const lockedTakeAgain = document.getElementById("lockedTakeAgain");
const takeAgainModal = document.getElementById("takeAgainModal");
const takeAgainOverlay = document.getElementById("takeAgainOverlay");
const closeTakeAgainModal = document.getElementById("closeTakeAgainModal");
const closeTakeAgainButton = document.getElementById("closeTakeAgainButton");

function openTakeAgainModal() {
    if (!takeAgainModal) {
        return;
    }

    takeAgainModal.classList.add("show");
    document.body.classList.add("modal-open");
}

function closeTakeAgainModalWindow() {
    if (!takeAgainModal) {
        return;
    }

    takeAgainModal.classList.remove("show");
    document.body.classList.remove("modal-open");
}

if (lockedTakeAgain) {
    lockedTakeAgain.addEventListener("click", openTakeAgainModal);
}

if (closeTakeAgainModal) {
    closeTakeAgainModal.addEventListener(
        "click",
        closeTakeAgainModalWindow
    );
}

if (closeTakeAgainButton) {
    closeTakeAgainButton.addEventListener(
        "click",
        closeTakeAgainModalWindow
    );
}

if (takeAgainOverlay) {
    takeAgainOverlay.addEventListener(
        "click",
        closeTakeAgainModalWindow
    );
}

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeTakeAgainModalWindow();
    }
});