const pages = document.querySelectorAll(".wizard-page");
const form = document.getElementById("assessmentForm");

const progressFill = document.getElementById("progressFill");
const progressPercent = document.getElementById("progressPercent");
const stepText = document.getElementById("stepText");

let currentPage = 0;

function updateProgress() {

    const totalPages = pages.length;
    const percent = Math.round(((currentPage + 1) / totalPages) * 100);

    progressFill.style.width = `${percent}%`;
    progressPercent.textContent = `${percent}%`;
    stepText.textContent = `Section ${currentPage + 1} of ${totalPages}`;

}

function showPage(index){

    pages.forEach((page,i)=>{
        page.classList.toggle("active",i===index);
    });

    currentPage=index;

    updateProgress();

    document.querySelector(".assessment-card").scrollIntoView({
        behavior:"smooth",
        block:"start"
    });

}

function validatePage(index) {

    const questions = pages[index].querySelectorAll(".question");

    let valid = true;

    questions.forEach(question => {

        const input = document.getElementById(question.dataset.q);

        if (!input || input.value === "") {

            valid = false;

            question.classList.add("shake");

            setTimeout(() => {
                question.classList.remove("shake");
            }, 500);

        }

    });

    return valid;

}

function validateAssessment() {

    const inputs = form.querySelectorAll("input[type='hidden']");

    for (const input of inputs) {

        if (input.value === "") {
            return false;
        }

    }

    return true;

}

document.querySelectorAll(".emoji-option").forEach(button => {

    button.addEventListener("click", () => {

        const question = button.closest(".question");

        question.querySelectorAll(".emoji-option").forEach(option => {
            option.classList.remove("selected");
        });

        button.classList.add("selected");

        const hiddenInput = document.getElementById(question.dataset.q);

        if (hiddenInput) {
            hiddenInput.value = button.dataset.value;
        }

    });

});

document.querySelectorAll(".next-btn").forEach(button => {

    button.addEventListener("click", () => {

        if (!validatePage(currentPage)) {

            alert("Please answer every question before continuing.");

            return;

        }

        if (currentPage < pages.length - 1) {

            showPage(currentPage + 1);

        }

    });

});

document.querySelectorAll(".prev-btn").forEach(button => {

    button.addEventListener("click", () => {

        if (currentPage > 0) {

            showPage(currentPage - 1);

        }

    });

});

form.addEventListener("submit", e => {

    if (!validatePage(currentPage)) {

        e.preventDefault();

        alert("Please answer every question before submitting.");

        return;

    }

    if (!validateAssessment()) {

        e.preventDefault();

        alert("Please answer all questions.");

    }

});

showPage(0);

