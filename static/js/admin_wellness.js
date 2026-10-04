document.addEventListener("DOMContentLoaded", function () {

    const modal = document.getElementById("wellnessOverviewModal");
    const overlay = document.getElementById("wellnessOverviewOverlay");
    const closeButton = document.getElementById("wellnessOverviewClose");
    const content = document.getElementById("wellnessOverviewContent");

    function escapeHtml(value) {
        const div = document.createElement("div");
        div.textContent = value ?? "";
        return div.innerHTML;
    }

    function openOverviewModal() {
        if (!modal) {
            return;
        }

        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");
    }

    function closeOverviewModal() {
        if (!modal) {
            return;
        }

        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("modal-open");
    }

    function riskClass(risk) {
        return String(risk || "")
            .toLowerCase()
            .replace(/\s+/g, "-");
    }

    function riskIcon(risk) {
        if (risk === "High") {
            return "🔴";
        }

        if (risk === "Moderate") {
            return "🟠";
        }

        if (risk === "Low") {
            return "🟢";
        }

        return "⚪";
    }

    function getComparison(baseline, post) {
        if (!baseline || !post) {
            return null;
        }

        const baselineScore = Number(baseline.percentage || 0);
        const postScore = Number(post.percentage || 0);

        const difference =
            Math.round((postScore - baselineScore) * 100) / 100;

        let outcome;
        let icon;

        if (difference >= 5) {
            outcome = "Improved after support";
            icon = "🌱";
        } else if (difference <= -5) {
            outcome = "Needs continued support";
            icon = "💙";
        } else {
            outcome = "Stayed about the same";
            icon = "🌤️";
        }

        return {
            difference,
            outcome,
            icon
        };
    }

    function renderOverview(result) {

        if (!content) {
            return;
        }

        const student = result.student || {};
        const baseline = result.baseline_assessment;
        const post = result.post_assessment;
        const appointment = result.follow_up;

        if (!baseline) {
            content.innerHTML = `
                <div class="wellness-overview-error">
                    <div>⚠️</div>
                    <h2>No Baseline Assessment</h2>
                    <p>
                        A baseline assessment could not be found for this
                        student's follow-up record.
                    </p>
                    <button
                        type="button"
                        class="secondary-btn"
                        id="overviewErrorClose"
                    >
                        Close
                    </button>
                </div>
            `;

            const errorClose = document.getElementById("overviewErrorClose");

            if (errorClose) {
                errorClose.addEventListener("click", closeOverviewModal);
            }

            return;
        }

        const comparison = getComparison(baseline, post);
        const appointmentScheduled =
            appointment && appointment.scheduled;

        const appointmentCompleted =
            appointment &&
            String(appointment.status || "").toLowerCase() === "completed";

        let appointmentHtml;

        if (!appointment) {

            appointmentHtml = `
                <div class="overview-status no-follow-up">
                    <span>ℹ️</span>
                    <div>
                        <strong>No follow-up appointment linked</strong>
                        <p>
                            No intervention appointment is currently
                            connected to this assessment.
                        </p>
                    </div>
                </div>
            `;

        } else if (appointmentCompleted) {

            appointmentHtml = `
                <div class="overview-status completed">
                    <span>✓</span>
                    <div>
                        <strong>Follow-up completed</strong>
                        <p>
                            The scheduled support appointment has been
                            completed.
                        </p>
                        <small>
                            Status: Completed
                        </small>
                    </div>
                </div>
            `;

        } else if (appointmentScheduled) {

            appointmentHtml = `
                <div class="overview-status scheduled">
                    <span>📅</span>
                    <div>
                        <strong>Follow-up appointment scheduled</strong>
                        <p>
                            ${escapeHtml(
                                appointment.date_display ||
                                "Scheduled appointment"
                            )}
                            ${
                                appointment.time_display
                                    ? " · " +
                                      escapeHtml(
                                          appointment.time_display
                                      )
                                    : ""
                            }
                        </p>
                        <small>
                            Status:
                            ${escapeHtml(
                                appointment.status || "Scheduled"
                            )}
                        </small>
                    </div>
                </div>
            `;

        } else {

            appointmentHtml = `
                <div class="overview-status pending">
                    <span>⏳</span>
                    <div>
                        <strong>Follow-up needs scheduling</strong>
                        <p>
                            A support appointment is linked to the
                            assessment but has not been given a schedule yet.
                        </p>
                    </div>
                </div>
            `;
        }

        let comparisonHtml;

        if (comparison) {

            const differenceText =
                comparison.difference > 0
                    ? `+${comparison.difference}%`
                    : `${comparison.difference}%`;

            comparisonHtml = `
                <div class="comparison-section">

                    <div class="comparison-heading">
                        <div>
                            <span class="section-kicker">
                                SUPPORT PROGRESS
                            </span>

                            <h3>
                                Pre- and Post-Support Comparison
                            </h3>

                            <p>
                                The later assessment is compared with the
                                assessment that started the follow-up.
                            </p>
                        </div>
                    </div>

                    <div class="comparison-result ${
                        comparison.difference >= 5
                            ? "improved"
                            : comparison.difference <= -5
                                ? "needs-support"
                                : "stable"
                    }">

                        <div class="comparison-result-icon">
                            ${comparison.icon}
                        </div>

                        <div>
                            <strong>
                                ${comparison.outcome}
                            </strong>

                            <span>
                                Overall score change:
                                ${differenceText}
                            </span>
                        </div>

                    </div>

                    <div class="comparison-grid">

                        <div class="comparison-card pre">

                            <div class="comparison-card-label">
                                <span>1st Assessment</span>
                                <small>Before support</small>
                            </div>

                            <div class="comparison-score">
                                ${escapeHtml(
                                    String(baseline.percentage)
                                )}%
                            </div>

                            <span
                                class="identified-risk ${riskClass(
                                    baseline.risk_level
                                )}"
                            >
                                ${riskIcon(baseline.risk_level)}
                                ${escapeHtml(
                                    baseline.risk_level
                                )}
                            </span>

                            <small>
                                Assessment #${escapeHtml(
                                    String(baseline.assessment_id)
                                )}
                            </small>

                        </div>

                        <div class="comparison-arrow">
                            →
                        </div>

                        <div class="comparison-card post">

                            <div class="comparison-card-label">
                                <span>Retake</span>
                                <small>After support</small>
                            </div>

                            <div class="comparison-score">
                                ${escapeHtml(
                                    String(post.percentage)
                                )}%
                            </div>

                            <span
                                class="identified-risk ${riskClass(
                                    post.risk_level
                                )}"
                            >
                                ${riskIcon(post.risk_level)}
                                ${escapeHtml(
                                    post.risk_level
                                )}
                            </span>

                            <small>
                                Assessment #${escapeHtml(
                                    String(post.assessment_id)
                                )}
                            </small>

                        </div>

                    </div>

                </div>
            `;

        } else {

            comparisonHtml = `
                <div class="comparison-empty">

                    <div class="comparison-empty-icon">
                        📋
                    </div>

                    <div>
                        <strong>
                            No post-support retake yet
                        </strong>

                        <p>
                            ${
                                appointmentCompleted
                                    ? "The follow-up has been completed, but a later retake has not been submitted yet."
                                    : appointmentScheduled
                                        ? "The student has a scheduled follow-up, but a later retake has not been submitted yet."
                                        : "A pre- and post-support comparison will appear after a follow-up appointment and a later retake."
                            }
                        </p>
                    </div>

                </div>
            `;
        }

        content.innerHTML = `

            <div class="overview-modal-header">

                <div class="identified-avatar large">
                    ${escapeHtml(
                        String(
                            student.first_name || "S"
                        ).charAt(0)
                    )}
                </div>

                <div>

                    <span class="section-kicker">
                        STUDENT FOLLOW-UP OVERVIEW
                    </span>

                    <h2>
                        ${escapeHtml(
                            student.first_name || ""
                        )}
                        ${escapeHtml(
                            student.last_name || ""
                        )}
                    </h2>

                    <p>
                        ${escapeHtml(
                            student.student_code || ""
                        )}
                        · Grade
                        ${escapeHtml(
                            String(
                                student.grade_level || ""
                            )
                        )}
                        ·
                        ${escapeHtml(
                            student.section || ""
                        )}
                    </p>

                </div>

            </div>

            ${appointmentHtml}

            <div class="overview-baseline">

                <div class="overview-section-title">

                    <div>
                        <span class="section-kicker">
                            BASELINE RESULT
                        </span>

                        <h3>
                            1st Assessment
                        </h3>

                        <p>
                            This is the assessment connected to the
                            student's follow-up process.
                        </p>
                    </div>

                </div>

                <div class="baseline-result-card">

                    <div>

                        <span>
                            Overall Wellness Score
                        </span>

                        <strong>
                            ${escapeHtml(
                                String(
                                    baseline.percentage
                                )
                            )}%
                        </strong>

                    </div>

                    <span
                        class="identified-risk ${riskClass(
                            baseline.risk_level
                        )}"
                    >
                        ${riskIcon(
                            baseline.risk_level
                        )}
                        ${escapeHtml(
                            baseline.risk_level
                        )}
                    </span>

                    <small>
                        Assessment #${escapeHtml(
                            String(
                                baseline.assessment_id
                            )
                        )}
                    </small>

                </div>

            </div>

            ${comparisonHtml}

            <div class="overview-privacy">

                <span>🔒</span>

                <p>
                    This overview shows only overall assessment results,
                    appointment information, and progress between assessments.
                    Individual assessment answers are not displayed.
                </p>

            </div>
        `;
    }

    async function loadStudentOverview(studentId) {

        if (!studentId || !content) {
            return;
        }

        openOverviewModal();

        content.innerHTML = `
            <div class="wellness-overview-loading">

                <div class="wellness-loading-icon">
                    ⏳
                </div>

                <h2>
                    Loading Student Overview
                </h2>

                <p>
                    Getting the latest follow-up information.
                </p>

            </div>
        `;

        try {

            const response = await fetch(
                `/admin/wellness/student/${encodeURIComponent(studentId)}`,
                {
                    method: "GET",
                    credentials: "same-origin",
                    cache: "no-store"
                }
            );

            const text = await response.text();

            let result;

            try {
                result = JSON.parse(text);
            } catch (error) {
                throw new Error(
                    "The server returned an invalid response."
                );
            }

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    "Unable to load student overview."
                );
            }

            renderOverview(result);

        } catch (error) {

            content.innerHTML = `
                <div class="wellness-overview-error">

                    <div>
                        ⚠️
                    </div>

                    <h2>
                        Unable to Load Overview
                    </h2>

                    <p>
                        ${escapeHtml(
                            error.message ||
                            "Something went wrong."
                        )}
                    </p>

                    <button
                        type="button"
                        class="secondary-btn"
                        id="overviewErrorClose"
                    >
                        Close
                    </button>

                </div>
            `;

            const errorClose =
                document.getElementById("overviewErrorClose");

            if (errorClose) {
                errorClose.addEventListener(
                    "click",
                    closeOverviewModal
                );
            }
        }
    }

    document.addEventListener("click", function (event) {

        const button =
            event.target.closest(".wellness-overview-btn");

        if (!button) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const studentId =
            button.dataset.studentId;

        if (!studentId) {
            return;
        }

        loadStudentOverview(studentId);
    });

    if (closeButton) {
        closeButton.addEventListener(
            "click",
            closeOverviewModal
        );
    }

    if (overlay) {
        overlay.addEventListener(
            "click",
            closeOverviewModal
        );
    }

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape" &&
                modal &&
                modal.classList.contains("show")
            ) {
                closeOverviewModal();
            }

        }
    );

    const dataElement =
        document.getElementById("wellnessData");

    if (dataElement) {

        const data = {
            total: Number(
                dataElement.dataset.totalAnonymous || 0
            ),

            overwhelmed: Number(
                dataElement.dataset.overwhelmed || 0
            ),

            motivation: Number(
                dataElement.dataset.motivation || 0
            ),

            support: Number(
                dataElement.dataset.support || 0
            ),

            multiple: Number(
                dataElement.dataset.multiple || 0
            ),

            one: Number(
                dataElement.dataset.one || 0
            ),

            none: Number(
                dataElement.dataset.none || 0
            ),

            studentsAssessed: Number(
                dataElement.dataset.studentsAssessed || 0
            ),

            totalAttempts: Number(
                dataElement.dataset.totalAttempts || 0
            ),

            high: Number(
                dataElement.dataset.high || 0
            ),

            moderate: Number(
                dataElement.dataset.moderate || 0
            ),

            low: Number(
                dataElement.dataset.low || 0
            )
        };

        function percent(value, total) {

            if (!total) {
                return 0;
            }

            return Math.round(
                (value / total) * 100
            );
        }

        const responseCanvas =
            document.getElementById(
                "anonymousResponseChart"
            );

        if (
            responseCanvas &&
            typeof Chart !== "undefined"
        ) {

            try {

                new Chart(
                    responseCanvas,
                    {
                        type: "bar",

                        data: {
                            labels: [
                                "Overwhelmed",
                                "Motivation",
                                "Support"
                            ],

                            datasets: [{
                                data: [
                                    percent(
                                        data.overwhelmed,
                                        data.total
                                    ),
                                    percent(
                                        data.motivation,
                                        data.total
                                    ),
                                    percent(
                                        data.support,
                                        data.total
                                    )
                                ],

                                backgroundColor: [
                                    "#d95f59",
                                    "#e3a74f",
                                    "#7d6aa8"
                                ],

                                borderRadius: 9,
                                borderSkipped: false,
                                barThickness: 42
                            }]
                        },

                        options: {
                            responsive: true,
                            maintainAspectRatio: false,

                            animation: {
                                duration: 700
                            },

                            scales: {

                                y: {
                                    beginAtZero: true,
                                    max: 100,

                                    ticks: {
                                        stepSize: 20,

                                        callback:
                                            function (value) {
                                                return value + "%";
                                            }
                                    },

                                    grid: {
                                        color:
                                            "rgba(100, 100, 120, 0.1)"
                                    }
                                },

                                x: {
                                    grid: {
                                        display: false
                                    }
                                }
                            },

                            plugins: {

                                legend: {
                                    display: false
                                },

                                tooltip: {
                                    callbacks: {

                                        label:
                                            function (context) {
                                                return (
                                                    context.raw +
                                                    "%"
                                                );
                                            }
                                    }
                                }
                            }
                        }
                    }
                );

            } catch (error) {
                console.error(
                    "Anonymous chart error:",
                    error
                );
            }
        }

        document
            .querySelectorAll(".area-fill")
            .forEach(function (bar) {

                const value =
                    Number(
                        bar.dataset.width || 0
                    );

                const safeValue =
                    Math.max(
                        0,
                        Math.min(
                            100,
                            value
                        )
                    );

                bar.style.width = "0%";

                requestAnimationFrame(
                    function () {

                        requestAnimationFrame(
                            function () {

                                bar.style.width =
                                    safeValue + "%";

                            }
                        );

                    }
                );
            });
    }

    document
        .querySelectorAll(".wellness-tab")
        .forEach(function (tab) {

            tab.addEventListener(
                "click",
                function () {

                    const targetId =
                        tab.dataset.tab;

                    document
                        .querySelectorAll(".wellness-tab")
                        .forEach(
                            function (item) {
                                item.classList.remove(
                                    "active"
                                );
                            }
                        );

                    document
                        .querySelectorAll(
                            ".wellness-tab-content"
                        )
                        .forEach(
                            function (content) {
                                content.classList.remove(
                                    "active"
                                );
                            }
                        );

                    tab.classList.add("active");

                    const target =
                        document.getElementById(
                            targetId
                        );

                    if (target) {
                        target.classList.add(
                            "active"
                        );
                    }

                    window.dispatchEvent(
                        new Event("resize")
                    );
                }
            );
        });

    document
        .querySelectorAll(".chart-toggle")
        .forEach(function (button) {

            button.addEventListener(
                "click",
                function () {

                    const targetId =
                        button.dataset.target;

                    const panel =
                        document.getElementById(
                            targetId
                        );

                    if (!panel) {
                        return;
                    }

                    const hidden =
                        panel.classList.toggle(
                            "collapsed"
                        );

                    const text =
                        button.querySelector(
                            ".toggle-text"
                        );

                    if (text) {
                        text.textContent =
                            hidden
                                ? "Show Graph"
                                : "Hide Graph";
                    }

                    button.classList.toggle(
                        "collapsed",
                        hidden
                    );

                    if (!hidden) {

                        setTimeout(
                            function () {

                                window.dispatchEvent(
                                    new Event("resize")
                                );

                            },
                            50
                        );
                    }
                }
            );
        });

});