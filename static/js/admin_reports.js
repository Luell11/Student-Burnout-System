document.addEventListener("DOMContentLoaded", function () {
    const dataElement = document.getElementById("reportData");

    if (!dataElement) {
        console.error("Report data element was not found.");
        return;
    }

    const highRisk = Number(dataElement.dataset.high || 0);
    const moderateRisk = Number(dataElement.dataset.moderate || 0);
    const lowRisk = Number(dataElement.dataset.low || 0);
    const notAssessed = Number(dataElement.dataset.notAssessed || 0);

    let trendData = [];

    try {
        trendData = JSON.parse(dataElement.dataset.trend || "[]");
    } catch (error) {
        console.error("Unable to read trend data:", error);
        trendData = [];
    }

    const categoryBars = document.querySelectorAll(
        ".category-progress-fill"
    );

    categoryBars.forEach(function (bar) {
        const percentage = Math.max(
            0,
            Math.min(
                100,
                Number(bar.dataset.percentage || 0)
            )
        );

        bar.style.width = percentage + "%";

        if (percentage < 60) {
            bar.classList.add("low");
        } else if (percentage < 80) {
            bar.classList.add("moderate");
        } else {
            bar.classList.add("good");
        }
    });

    const riskCanvas = document.getElementById("riskChart");

    if (riskCanvas && typeof Chart !== "undefined") {
        const riskValues = [
            highRisk,
            moderateRisk,
            lowRisk,
            notAssessed
        ];

        const totalRiskValues = riskValues.reduce(
            function (sum, value) {
                return sum + value;
            },
            0
        );

        if (totalRiskValues > 0) {
            new Chart(riskCanvas, {
                type: "doughnut",
                data: {
                    labels: [
                        "High Risk",
                        "Moderate Risk",
                        "Low Risk",
                        "Not Assessed"
                    ],
                    datasets: [{
                        data: riskValues,
                        backgroundColor: [
                            "#e76f51",
                            "#e9c46a",
                            "#2a9d8f",
                            "#b8bec9"
                        ],
                        borderWidth: 0,
                        hoverOffset: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "68%",
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    const value = context.raw || 0;

                                    return " " +
                                        context.label +
                                        ": " +
                                        value +
                                        " student" +
                                        (value === 1 ? "" : "s");
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    const trendCanvas = document.getElementById("trendChart");

    if (trendCanvas && typeof Chart !== "undefined") {
        const labels = trendData.map(function (item) {
            return item.date;
        });

        const scores = trendData.map(function (item) {
            return item.percentage;
        });

        if (trendData.length > 0) {
            new Chart(trendCanvas, {
                type: "line",
                data: {
                    labels: labels,
                    datasets: [{
                        label: "Assessment Score",
                        data: scores,
                        tension: 0.35,
                        fill: true,
                        backgroundColor: "rgba(78, 115, 223, 0.10)",
                        borderColor: "#4e73df",
                        borderWidth: 2,
                        pointRadius: 3,
                        pointHoverRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: "index"
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: function (value) {
                                    return value + "%";
                                }
                            }
                        },
                        x: {
                            ticks: {
                                maxRotation: 45,
                                minRotation: 0
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return " Score: " +
                                        context.parsed.y +
                                        "%";
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    const chartToggle = document.querySelector(".chart-toggle");

    if (chartToggle) {
        chartToggle.addEventListener("click", function () {
            const targetId = this.dataset.target;
            const target = document.getElementById(targetId);

            if (!target) {
                return;
            }

            const isHidden = target.classList.toggle("collapsed");
            const text = this.querySelector(".toggle-text");

            if (text) {
                text.textContent = isHidden
                    ? "Show Graph"
                    : "Hide Graph";
            }

            const icon = this.querySelector("span");

            if (icon) {
                icon.textContent = isHidden ? "⌁" : "⌁";
            }

            if (!isHidden) {
                window.dispatchEvent(new Event("resize"));
            }
        });
    }

    const searchInput = document.getElementById(
        "reportStudentSearch"
    );

    const riskFilter = document.getElementById(
        "reportRiskFilter"
    );

    const gradeFilter = document.getElementById(
        "reportGradeFilter"
    );

    const sectionFilter = document.getElementById(
        "reportSectionFilter"
    );

    const sortSelect = document.getElementById(
        "reportSort"
    );

    const clearButton = document.getElementById(
        "clearReportFilters"
    );

    const tableBody = document.getElementById(
        "studentReportBody"
    );

    const resultCount = document.getElementById(
        "studentResultCount"
    );

    function updateStudentTable() {
        if (!tableBody) {
            return;
        }

        const rows = Array.from(
            tableBody.querySelectorAll(
                ".student-report-row"
            )
        );

        const searchValue = (
            searchInput
                ? searchInput.value.trim().toLowerCase()
                : ""
        );

        const riskValue = riskFilter
            ? riskFilter.value
            : "all";

        const gradeValue = gradeFilter
            ? gradeFilter.value
            : "all";

        const sectionValue = sectionFilter
            ? sectionFilter.value
            : "all";

        const sortValue = sortSelect
            ? sortSelect.value
            : "risk";

        rows.forEach(function (row) {
            const name = (
                row.dataset.name || ""
            ).toLowerCase();

            const code = (
                row.dataset.code || ""
            ).toLowerCase();

            const risk = row.dataset.risk || "";
            const grade = row.dataset.grade || "";
            const section = row.dataset.section || "";

            const matchesSearch =
                !searchValue ||
                name.includes(searchValue) ||
                code.includes(searchValue);

            const matchesRisk =
                riskValue === "all" ||
                risk === riskValue;

            const matchesGrade =
                gradeValue === "all" ||
                grade === gradeValue;

            const matchesSection =
                sectionValue === "all" ||
                section === sectionValue;

            row.style.display = (
                matchesSearch &&
                matchesRisk &&
                matchesGrade &&
                matchesSection
            )
                ? ""
                : "none";
        });

        const visibleRows = rows.filter(function (row) {
            return row.style.display !== "none";
        });

        visibleRows.sort(function (a, b) {
            if (sortValue === "name") {
                return (
                    a.dataset.name || ""
                ).localeCompare(
                    b.dataset.name || ""
                );
            }

            if (sortValue === "score-low") {
                return Number(
                    a.dataset.score || 0
                ) - Number(
                    b.dataset.score || 0
                );
            }

            if (sortValue === "score-high") {
                return Number(
                    b.dataset.score || 0
                ) - Number(
                    a.dataset.score || 0
                );
            }

            if (sortValue === "grade") {
                return Number(
                    a.dataset.grade || 0
                ) - Number(
                    b.dataset.grade || 0
                );
            }

            const riskOrder = {
                High: 0,
                Moderate: 1,
                Low: 2
            };

            return (
                (riskOrder[a.dataset.risk] ?? 3) -
                (riskOrder[b.dataset.risk] ?? 3)
            );
        });

        visibleRows.forEach(function (row) {
            tableBody.appendChild(row);
        });

        if (resultCount) {
            resultCount.textContent =
                visibleRows.length +
                " student" +
                (visibleRows.length === 1 ? "" : "s");
        }
    }

    if (searchInput) {
        searchInput.addEventListener(
            "input",
            updateStudentTable
        );
    }

    if (riskFilter) {
        riskFilter.addEventListener(
            "change",
            updateStudentTable
        );
    }

    if (gradeFilter) {
        gradeFilter.addEventListener(
            "change",
            updateStudentTable
        );
    }

    if (sectionFilter) {
        sectionFilter.addEventListener(
            "change",
            updateStudentTable
        );
    }

    if (sortSelect) {
        sortSelect.addEventListener(
            "change",
            updateStudentTable
        );
    }

    if (clearButton) {
        clearButton.addEventListener(
            "click",
            function () {
                if (searchInput) {
                    searchInput.value = "";
                }

                if (riskFilter) {
                    riskFilter.value = "all";
                }

                if (gradeFilter) {
                    gradeFilter.value = "all";
                }

                if (sectionFilter) {
                    sectionFilter.value = "all";
                }

                if (sortSelect) {
                    sortSelect.value = "risk";
                }

                updateStudentTable();
            }
        );
    }

    updateStudentTable();
});