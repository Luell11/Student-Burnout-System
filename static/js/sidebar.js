const sidebar = document.getElementById("sidebar");
const toggle = document.getElementById("toggleSidebar");
const mobileBtn = document.getElementById("mobileMenuBtn");
const overlay = document.getElementById("mobileOverlay");

function openSidebar() {
    sidebar.classList.add("show");
    overlay.classList.add("show");
    mobileBtn.classList.add("hide");
}

function closeSidebar() {
    sidebar.classList.remove("show");
    overlay.classList.remove("show");
    mobileBtn.classList.remove("hide");
}

mobileBtn.addEventListener("click", openSidebar);

toggle.addEventListener("click", () => {
    if (window.innerWidth <= 900) {
        closeSidebar();
    } else {
        sidebar.classList.toggle("collapsed");
    }
});

overlay.addEventListener("click", closeSidebar);

window.addEventListener("resize", () => {
    if (window.innerWidth > 900) {
        sidebar.classList.remove("show");
        overlay.classList.remove("show");
        mobileBtn.classList.remove("hide");
    }
});