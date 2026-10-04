document.addEventListener("DOMContentLoaded", () => {
    const tabs = document.querySelectorAll(".wellness-tab");
    const panels = document.querySelectorAll(".wellness-panel");

    function activateTab(target, updateHash = true) {
        tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.tab === target));
        panels.forEach(panel => panel.classList.toggle("active", panel.id === target));
        if (updateHash) history.replaceState(null, "", `#${target}`);
    }

    const savedTab = window.location.hash.replace("#", "");
    const initialTab = [...tabs].some(tab => tab.dataset.tab === savedTab) ? savedTab : "selfAssessment";
    activateTab(initialTab, false);

    tabs.forEach(tab => {
        tab.addEventListener("click", () => activateTab(tab.dataset.tab));
    });

    window.addEventListener("hashchange", () => {
        const target = window.location.hash.replace("#", "");
        if ([...tabs].some(tab => tab.dataset.tab === target)) activateTab(target, false);
    });

    const selfForm = document.getElementById("selfAssessmentForm");
    const selfResult = document.getElementById("selfAssessmentResult");
    const selfResultText = document.getElementById("selfResultText");
    const retakeSelf = document.getElementById("retakeSelfAssessment");

    if (selfForm) {
        selfForm.addEventListener("submit", async event => {
            event.preventDefault();

            const formData = new FormData(selfForm);
            const values = [
                Number(formData.get("school_feeling")),
                Number(formData.get("schoolwork")),
                Number(formData.get("rest")),
                Number(formData.get("motivation")),
                Number(formData.get("connection"))
            ];

            const average = values.reduce((sum, value) => sum + value, 0) / values.length;
            let message;

            if (average >= 4) {
                message = "You seem to be doing fairly well right now. Keep taking care of yourself and remember that it is okay to ask for help when you need it.";
            } else if (average >= 3) {
                message = "Things seem to be mixed right now. Consider taking some time to rest, talk with someone you trust, and pay attention to how you feel over the next few days.";
            } else {
                message = "It sounds like things may be feeling difficult lately. Consider talking with a trusted adult, teacher, parent, or another person who can support you.";
            }

            selfResultText.textContent = message;
            selfForm.style.display = "none";
            selfResult.classList.add("show");

            try {
                await fetch("/wellness/self-assessment", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({average: average})
                });
            } catch (error) {
                console.error(error);
            }
        });
    }

    if (retakeSelf) {
        retakeSelf.addEventListener("click", () => {
            selfForm.reset();
            selfResult.classList.remove("show");
            selfForm.style.display = "block";
        });
    }

    const anonymousForm = document.getElementById("anonymousForm");
    const anonymousResult = document.getElementById("anonymousResult");
    const anonymousResultText = document.getElementById("anonymousResultText");
    const anonymousAgain = document.getElementById("anonymousAgain");

    if (anonymousForm) {
        anonymousForm.addEventListener("submit", async event => {
            event.preventDefault();

            const formData = new FormData(anonymousForm);

            const answers = {
                overwhelmed: formData.get("overwhelmed"),
                motivation: formData.get("motivation"),
                support: formData.get("support")
            };

            let concernCount = 0;

            if (answers.overwhelmed === "yes") concernCount++;
            if (answers.motivation === "yes") concernCount++;
            if (answers.support === "yes") concernCount++;

            if (concernCount >= 2) {
                anonymousResultText.textContent =
                    "Your answers suggest that it may be helpful to talk with a trusted adult or someone you feel comfortable speaking with. You do not have to handle difficult feelings by yourself.";
            } else if (concernCount === 1) {
                anonymousResultText.textContent =
                    "Some parts of your check-in may be worth paying attention to. Consider taking some time to rest and talking with someone you trust if you feel you need support.";
            } else {
                anonymousResultText.textContent =
                    "Your responses do not indicate a major concern from this short check-in. Continue looking after yourself and remember that you can check in again whenever you want.";
            }

            try {
                const response = await fetch("/wellness/anonymous-screening", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(answers)
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    showToast(
                        data.message ||
                        "Unable to save your anonymous screening."
                    );
                    return;
                }

                anonymousForm.style.display = "none";
                anonymousResult.classList.add("show");

            } catch (error) {
                console.error(error);
                showToast(
                    "Something went wrong while saving your anonymous screening."
                );
            }
        });
    }

    if (anonymousAgain) {
        anonymousAgain.addEventListener("click", () => {
            anonymousForm.reset();
            anonymousResult.classList.remove("show");
            anonymousForm.style.display = "block";
        });
    }

    const moodForm = document.getElementById("moodForm");
    const moodNote = document.getElementById("moodNote");
    const characterCount = document.getElementById("characterCount");

    if (moodNote) {
        moodNote.addEventListener("input", () => {
            characterCount.textContent = moodNote.value.length;
        });
    }

    const journalModal = document.getElementById("journalModal");
    const journalToggle = document.getElementById("journalToggle");
    const journalClose = document.getElementById("journalClose");
    const journalBackdrop = document.getElementById("journalModalBackdrop");
    const journalEntries = document.getElementById("journalEntries");

    function openJournal() {
        if (!journalModal) return;

        journalModal.classList.add("show");
        journalModal.setAttribute("aria-hidden", "false");
        document.body.classList.add("journal-modal-open");

        if (journalClose) journalClose.focus();
    }

    function closeJournal() {
        if (!journalModal) return;

        journalModal.classList.remove("show");
        journalModal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("journal-modal-open");
    }

    if (journalToggle) journalToggle.addEventListener("click", openJournal);
    if (journalClose) journalClose.addEventListener("click", closeJournal);
    if (journalBackdrop) journalBackdrop.addEventListener("click", closeJournal);

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && journalModal && journalModal.classList.contains("show")) {
            closeJournal();
        }
    });

    function getMoodEmoji(mood) {
        if (mood === "Great") return "😊";
        if (mood === "Good") return "🙂";
        if (mood === "Okay") return "😐";
        if (mood === "Not Great") return "😟";
        return "😞";
    }

    function addJournalEntry(mood, note, createdAt) {
        if (!journalEntries) return;

        const emptyJournal = journalEntries.querySelector(".empty-journal");

        if (emptyJournal) emptyJournal.remove();

        const entry = document.createElement("div");
        entry.className = "journal-entry";

        const moodIcon = document.createElement("div");
        moodIcon.className = "entry-mood";
        moodIcon.textContent = getMoodEmoji(mood);

        const content = document.createElement("div");
        content.className = "entry-content";

        const top = document.createElement("div");
        top.className = "entry-top";

        const moodText = document.createElement("strong");
        moodText.textContent = mood;

        const dateText = document.createElement("span");
        dateText.textContent = createdAt;

        top.appendChild(moodText);
        top.appendChild(dateText);

        const noteText = document.createElement("p");

        if (note && note.trim()) {
            noteText.textContent = note;
        } else {
            noteText.textContent = "No note was added.";
            noteText.className = "no-note";
        }

        content.appendChild(top);
        content.appendChild(noteText);
        entry.appendChild(moodIcon);
        entry.appendChild(content);

        journalEntries.prepend(entry);
    }

    if (moodForm) {
        moodForm.addEventListener("submit", async event => {
            event.preventDefault();

            const formData = new FormData(moodForm);
            const mood = formData.get("mood");
            const note = formData.get("note");

            try {
                const response = await fetch("/wellness/mood", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({
                        mood: mood,
                        note: note
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    showToast(data.message || "Unable to save your mood check-in.");
                    return;
                }

                const now = new Date();
                const createdAt = now.toLocaleDateString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric"
                });

                addJournalEntry(mood, note, createdAt);

                showToast("Today's mood check-in was saved.");

                moodForm.reset();
                if (characterCount) characterCount.textContent = "0";

                activateTab("moodJournal");

                setTimeout(() => {
                    openJournal();
                }, 250);
            } catch (error) {
                console.error(error);
                showToast("Something went wrong while saving your mood check-in.");
            }
        });
    }

    const toggleSidebar = document.getElementById("toggleSidebar");
    const sidebar = document.getElementById("sidebar");
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const mobileOverlay = document.getElementById("mobileOverlay");

    if (toggleSidebar && sidebar) {
        toggleSidebar.addEventListener("click", () => {
            if (window.innerWidth <= 900) {
                sidebar.classList.toggle("open");
                if (mobileOverlay) mobileOverlay.classList.toggle("show");
            } else {
                sidebar.classList.toggle("collapsed");
            }
        });
    }

    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener("click", () => {
            sidebar.classList.add("open");
            if (mobileOverlay) mobileOverlay.classList.add("show");
        });
    }

    if (mobileOverlay && sidebar) {
        mobileOverlay.addEventListener("click", () => {
            sidebar.classList.remove("open");
            mobileOverlay.classList.remove("show");
        });
    }

    function showToast(message) {
        const toast = document.getElementById("toast");
        if (!toast) return;

        toast.textContent = message;
        toast.classList.add("show");

        setTimeout(() => {
            toast.classList.remove("show");
        }, 2500);
    }
});