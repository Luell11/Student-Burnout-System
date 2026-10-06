document.addEventListener("DOMContentLoaded", () => {

    const passwordInput = document.getElementById("password");
    const toggleBtn = document.getElementById("togglePassword");

    const loginForm = document.getElementById("loginForm");

    const demoBtn = document.getElementById("demoToggleBtn");
    const demoModal = document.getElementById("demoModal");
    const closeDemo = document.getElementById("closeDemo");

    const demoButtons = document.querySelectorAll(".demo-fill");

    const loginErrorModal = document.getElementById("loginErrorModal");
    const closeLoginError = document.getElementById("closeLoginError");

    if (toggleBtn) {

        toggleBtn.addEventListener("click", () => {

            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                toggleBtn.textContent = "🙈";

            } else {
                passwordInput.type = "password";
                toggleBtn.textContent = "👁";
            }
        });
    }

    demoButtons.forEach(button => {

        button.addEventListener("click", () => {

            document.getElementById("email").value =
                button.dataset.email;

            document.getElementById("password").value =
                button.dataset.password;
        });
    });

    if (loginForm) {

        loginForm.addEventListener("submit", event => {

            const email =
                document.getElementById("email").value.trim();

            const password =
                document.getElementById("password").value.trim();

            if (!email || !password) {

                event.preventDefault();
                alert("Please enter your email and password.");
            }
        });
    }

    if (demoBtn) {

        demoBtn.addEventListener("click", () => {
            demoModal.classList.add("active");
        });
    }

    if (closeDemo) {

        closeDemo.addEventListener("click", () => {
            demoModal.classList.remove("active");
        });
    }

    if (demoModal) {

        demoModal.addEventListener("click", event => {

            if (event.target === demoModal) {
                demoModal.classList.remove("active");
            }
        });
    }

    if (closeLoginError) {

        closeLoginError.addEventListener("click", () => {
            loginErrorModal.remove();
        });
    }

    if (loginErrorModal) {

        loginErrorModal.addEventListener("click", event => {

            if (event.target === loginErrorModal) {
                loginErrorModal.remove();
            }
        });
    }
});

document.addEventListener("DOMContentLoaded",()=>{

    const showInfo=document.getElementById("showInfo");
    const showLogin=document.getElementById("showLogin");
    const leftPanel=document.querySelector(".left-panel");
    const rightPanel=document.querySelector(".right-panel");

    if(showInfo&&showLogin&&leftPanel&&rightPanel){

        showInfo.addEventListener("click",()=>{
            leftPanel.classList.add("mobile-visible");
            rightPanel.style.display="none";

            window.scrollTo({
                top:0,
                behavior:"smooth"
            });
        });

        showLogin.addEventListener("click",()=>{
            leftPanel.classList.remove("mobile-visible");
            rightPanel.style.display="block";

            window.scrollTo({
                top:0,
                behavior:"smooth"
            });
        });

    }

});