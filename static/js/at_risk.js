const studentRows = Array.from(
    document.querySelectorAll(".risk-student-row")
);

const searchInput = document.getElementById("studentSearch");
const riskFilter = document.getElementById("riskFilter");
const gradeFilter = document.getElementById("gradeFilter");
const sectionFilter = document.getElementById("sectionFilter");
const sortStudents = document.getElementById("sortStudents");
const clearFilters = document.getElementById("clearFilters");
const resultCount = document.getElementById("resultCount");
const tableBody = document.getElementById("atRiskTableBody");

const detailModal = document.getElementById("studentDetailModal");
const closeDetail = document.getElementById("closeStudentDetail");
const detailContent = document.getElementById("studentDetailContent");
const detailStudentName = document.getElementById("detailStudentName");
const detailStudentInfo = document.getElementById("detailStudentInfo");
const detailAvatar = document.getElementById("detailAvatar");

function escapeHtml(value){
    if(value === null || value === undefined){
        return "";
    }

    return String(value)
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}

function highlightText(value, search){
    const text = String(value || "");

    if(!search){
        return escapeHtml(text);
    }

    const escapedSearch = escapeHtml(search);
    const safeText = escapeHtml(text);

    const escapedPattern = escapedSearch.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );

    return safeText.replace(
        new RegExp(escapedPattern,"gi"),
        match => `<mark class="search-highlight">${match}</mark>`
    );
}

function riskRank(risk){
    if(risk === "High"){
        return 1;
    }

    if(risk === "Moderate"){
        return 2;
    }

    return 3;
}

function updateRowHighlights(){
    const search = searchInput.value.trim();

    studentRows.forEach(row=>{
        const nameElement = row.querySelector(".student-name");
        const codeElement = row.querySelector(".student-code");

        if(nameElement){
            nameElement.innerHTML = highlightText(
                nameElement.dataset.original || nameElement.textContent,
                search
            );
        }

        if(codeElement){
            codeElement.innerHTML = highlightText(
                codeElement.dataset.original || codeElement.textContent,
                search
            );
        }

        if(nameElement && !nameElement.dataset.original){
            nameElement.dataset.original = nameElement.textContent.trim();
            nameElement.innerHTML = highlightText(
                nameElement.dataset.original,
                search
            );
        }

        if(codeElement && !codeElement.dataset.original){
            codeElement.dataset.original = codeElement.textContent.trim();
            codeElement.innerHTML = highlightText(
                codeElement.dataset.original,
                search
            );
        }
    });
}

function updateSections(){
    const selectedGrade = gradeFilter.value;
    const currentSection = sectionFilter.value;
    const sections = new Set();

    studentRows.forEach(row=>{
        const grade = row.dataset.grade;
        const section = row.dataset.section;

        if(
            selectedGrade === "all" ||
            grade === selectedGrade
        ){
            sections.add(section);
        }
    });

    sectionFilter.innerHTML = `
        <option value="all">All Sections</option>
    `;

    Array.from(sections)
        .sort((a,b)=>a.localeCompare(b))
        .forEach(section=>{
            const option = document.createElement("option");

            option.value = section;
            option.textContent = section;

            sectionFilter.appendChild(option);
        });

    if(
        currentSection !== "all" &&
        sections.has(currentSection)
    ){
        sectionFilter.value = currentSection;
    }
}

function applyFilters(){
    const search = searchInput.value
        .trim()
        .toLowerCase();

    const risk = riskFilter.value;
    const grade = gradeFilter.value;
    const section = sectionFilter.value;

    const visibleRows = studentRows.filter(row=>{
        const name = (
            row.dataset.name || ""
        ).toLowerCase();

        const code = (
            row.dataset.code || ""
        ).toLowerCase();

        const rowRisk = row.dataset.risk;
        const rowGrade = row.dataset.grade;
        const rowSection = row.dataset.section;

        const matchesSearch =
            !search ||
            name.includes(search) ||
            code.includes(search);

        const matchesRisk =
            risk === "all" ||
            rowRisk === risk;

        const matchesGrade =
            grade === "all" ||
            rowGrade === grade;

        const matchesSection =
            section === "all" ||
            rowSection === section;

        const visible =
            matchesSearch &&
            matchesRisk &&
            matchesGrade &&
            matchesSection;

        row.style.display = visible ? "" : "none";

        return visible;
    });

    sortRows(visibleRows);
    updateRowHighlights();

    resultCount.textContent =
        `${visibleRows.length} student${visibleRows.length === 1 ? "" : "s"}`;

    let emptyRow = document.getElementById("filterEmptyRow");

    if(!visibleRows.length && studentRows.length){
        if(!emptyRow){
            emptyRow = document.createElement("tr");
            emptyRow.id = "filterEmptyRow";

            emptyRow.innerHTML = `
                <td colspan="5">
                    <div class="no-results compact">
                        <div class="no-results-icon">⌕</div>
                        <h3>No Matching Students</h3>
                        <p>Try changing your search or filters.</p>
                    </div>
                </td>
            `;

            tableBody.appendChild(emptyRow);
        }
    }else if(emptyRow){
        emptyRow.remove();
    }
}

function sortRows(rows){
    const sort = sortStudents.value;

    rows.sort((a,b)=>{
        if(sort === "name"){
            return a.dataset.name.localeCompare(
                b.dataset.name
            );
        }

        if(sort === "lowest"){
            return (
                Number(a.dataset.lowest) -
                Number(b.dataset.lowest)
            );
        }

        if(sort === "grade"){
            const gradeDifference =
                Number(a.dataset.grade) -
                Number(b.dataset.grade);

            if(gradeDifference !== 0){
                return gradeDifference;
            }

            return a.dataset.name.localeCompare(
                b.dataset.name
            );
        }

        const riskDifference =
            riskRank(a.dataset.risk) -
            riskRank(b.dataset.risk);

        if(riskDifference !== 0){
            return riskDifference;
        }

        return (
            Number(a.dataset.lowest) -
            Number(b.dataset.lowest)
        );
    });

    rows.forEach(row=>{
        tableBody.appendChild(row);
    });
}

function categoryClass(score){
    if(score < 60){
        return "low";
    }

    if(score < 80){
        return "moderate";
    }

    return "good";
}

function riskIcon(risk){
    return risk === "High" ? "⚠" : "●";
}

async function openStudentReview(studentId){
    detailModal.classList.add("show");
    document.body.classList.add("modal-open");

    detailStudentName.textContent = "Loading...";
    detailStudentInfo.textContent = "";
    detailAvatar.textContent = "••";

    detailContent.innerHTML = `
        <div class="modal-loading">
            <div class="loading-spinner"></div>
            <strong>Loading student assessment</strong>
            <span>Please wait while the latest information is retrieved.</span>
        </div>
    `;

    try{
        const response = await fetch(
            `/admin/at-risk/student/${studentId}`
        );

        const data = await response.json();

        if(!response.ok || !data.success){
            throw new Error(
                data.message ||
                "Unable to load student information."
            );
        }

        renderStudentDetails(data);

    }catch(error){
        detailContent.innerHTML = `
            <div class="modal-error">
                <div class="modal-error-icon">!</div>
                <h3>Unable to Load Student</h3>
                <p>${escapeHtml(error.message)}</p>
                <button
                    type="button"
                    class="modal-retry"
                    onclick="openStudentReview(${Number(studentId)})"
                >
                    Try Again
                </button>
            </div>
        `;
    }
}

function renderStudentDetails(data){
    const student = data.student;
    const assessment = data.assessment;
    const categories = data.categories || {};
    const support = data.support || {};

    const risk = assessment.risk_level;
    const riskClass = risk.toLowerCase();

    const initials = student.name
        .split(" ")
        .filter(Boolean)
        .slice(0,2)
        .map(part=>part[0])
        .join("")
        .toUpperCase();

    detailAvatar.textContent = initials || "ST";
    detailStudentName.textContent = student.name;

    detailStudentInfo.innerHTML = `
        <span>Grade ${escapeHtml(student.grade)}</span>
        <i>·</i>
        <span>${escapeHtml(student.section)}</span>
        <i>·</i>
        <span>${escapeHtml(student.student_code)}</span>
    `;

    let categoriesHtml = "";

    Object.entries(categories).forEach(([category,values])=>{
        const score = Number(values.percentage);
        const lowest = category === data.lowest_category;

        categoriesHtml += `
            <div class="category-item ${lowest ? "lowest" : ""}">
                <div class="category-top">
                    <div class="category-title">
                        <strong>${escapeHtml(category)}</strong>
                        ${lowest ? `<span class="lowest-label">Lowest area</span>` : ""}
                    </div>
                    <strong>${escapeHtml(score)}%</strong>
                </div>

                <div class="category-bar">
                    <span
                        class="${categoryClass(score)}"
                        style="width:${Math.max(0,Math.min(100,score))}%"
                    ></span>
                </div>

                <div class="category-meta">
                    ${escapeHtml(values.score)}
                    /
                    ${escapeHtml(values.max)}
                    points
                </div>
            </div>
        `;
    });

    if(!categoriesHtml){
        categoriesHtml = `
            <div class="category-unavailable">
                <span>ⓘ</span>
                <div>
                    <strong>Category details unavailable</strong>
                    <p>This assessment only provides an overall result.</p>
                </div>
            </div>
        `;
    }

    let lowerQuestionsHtml = "";

    if(
        data.lowest_questions &&
        data.lowest_questions.length
    ){
        lowerQuestionsHtml = `
            <div class="detail-section">
                <div class="section-heading">
                    <span class="detail-kicker">RESPONSE AREAS</span>
                    <h3>Lower-Scoring Responses</h3>
                    <p>These responses received the lowest scores in the latest assessment.</p>
                </div>

                <div class="question-list">
                    ${data.lowest_questions.map(question=>{
                        const score = Number(question.score);
                        let scoreClass = "low";

                        if(score >= 3){
                            scoreClass = "good";
                        }else if(score >= 2){
                            scoreClass = "moderate";
                        }

                        return `
                            <div class="question-item">
                                <div class="question-copy">
                                    <span class="question-category">
                                        ${escapeHtml(question.category)}
                                    </span>
                                    <p>${escapeHtml(question.question)}</p>
                                </div>

                                <span class="question-score ${scoreClass}">
                                    ${score}/3
                                </span>
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>
        `;
    }

    const actionsHtml =
        (support.actions || [])
            .map(action=>`
                <li>
                    <span>✓</span>
                    ${escapeHtml(action)}
                </li>
            `)
            .join("");

    detailContent.innerHTML = `
        <div class="review-overview">

            <div class="detail-risk-banner ${riskClass}">
                <div class="risk-banner-copy">
                    <div class="risk-label">
                        <span class="risk-dot">${riskIcon(risk)}</span>
                        LATEST ASSESSMENT
                    </div>

                    <h3>${escapeHtml(risk)} Risk</h3>

                    <p>
                        ${escapeHtml(assessment.submitted_at)}
                    </p>
                </div>

                <div class="detail-score">
                    <strong>${escapeHtml(assessment.percentage)}%</strong>
                    <span>${escapeHtml(assessment.total_score)}/${escapeHtml(assessment.max_score)} points</span>
                </div>
            </div>

            <div class="assessment-meta">
                <div>
                    <span>Assessment</span>
                    <strong>#${escapeHtml(assessment.assessment_id)}</strong>
                </div>

                <div>
                    <span>Overall Result</span>
                    <strong>${escapeHtml(assessment.percentage)}%</strong>
                </div>

                <div>
                    <span>Submitted</span>
                    <strong>${escapeHtml(assessment.submitted_at)}</strong>
                </div>
            </div>

        </div>

        <div class="detail-section result-explanation">
            <div class="section-heading">
                <span class="detail-kicker">RESULT EXPLANATION</span>
                <h3>Why is this student flagged?</h3>
            </div>

            <div class="explanation-box">
                <div class="explanation-icon">i</div>
                <p>${escapeHtml(assessment.explanation)}</p>
            </div>
        </div>

        <div class="detail-section">
            <div class="section-heading">
                <span class="detail-kicker">CATEGORY BREAKDOWN</span>
                <h3>Areas shown by the assessment</h3>
                <p>Lower percentages indicate areas that may need more attention.</p>
            </div>

            <div class="category-grid">
                ${categoriesHtml}
            </div>
        </div>

        ${
            data.lowest_category
            ? `
                <div class="focus-card">
                    <div class="focus-icon">!</div>
                    <div class="focus-copy">
                        <span>PRIMARY AREA TO CHECK</span>
                        <strong>${escapeHtml(data.lowest_category)}</strong>
                        <p>
                            Lowest category result:
                            <b>${escapeHtml(data.lowest_percentage)}%</b>
                        </p>
                    </div>
                </div>
            `
            : ""
        }

        ${lowerQuestionsHtml}

        <div class="support-section">
            <div class="support-heading">
                <div class="support-icon">✓</div>

                <div>
                    <span class="detail-kicker">COUNSELOR SUPPORT</span>
                    <h3>
                        ${escapeHtml(
                            support.title ||
                            "Suggested Support"
                        )}
                    </h3>
                </div>
            </div>

            <p class="support-message">
                ${escapeHtml(support.message || "")}
            </p>

            ${
                actionsHtml
                ? `<ul class="support-actions">${actionsHtml}</ul>`
                : ""
            }

            <div class="appointment-panel">
                <div>
                    <strong>Need a closer follow-up?</strong>
                    <span>Schedule an appointment to continue supporting this student.</span>
                </div>

                <a
                    class="appointment-btn"
                    href="/admin/appointments?student_id=${encodeURIComponent(
                        student.student_id
                    )}&assessment_id=${encodeURIComponent(
                        assessment.assessment_id
                    )}"
                >
                    Schedule Follow-Up
                </a>
            </div>
        </div>
    `;
}

studentRows.forEach(row=>{
    row.addEventListener("click",event=>{
        if(event.target.closest("a,button,input,select")){
            return;
        }

        openStudentReview(row.dataset.studentId);
    });

    row.addEventListener("keydown",event=>{
        if(event.key === "Enter" || event.key === " "){
            event.preventDefault();
            openStudentReview(row.dataset.studentId);
        }
    });

    const nameElement = row.querySelector(".student-name");
    const codeElement = row.querySelector(".student-code");

    if(nameElement){
        nameElement.dataset.original =
            nameElement.textContent.trim();
    }

    if(codeElement){
        codeElement.dataset.original =
            codeElement.textContent.trim();
    }
});

searchInput.addEventListener(
    "input",
    applyFilters
);

riskFilter.addEventListener(
    "change",
    applyFilters
);

gradeFilter.addEventListener(
    "change",
    ()=>{
        updateSections();
        applyFilters();
    }
);

sectionFilter.addEventListener(
    "change",
    applyFilters
);

sortStudents.addEventListener(
    "change",
    applyFilters
);

clearFilters.addEventListener(
    "click",
    ()=>{
        searchInput.value = "";
        riskFilter.value = "all";
        gradeFilter.value = "all";
        sectionFilter.value = "all";
        sortStudents.value = "risk";

        updateSections();
        applyFilters();
    }
);

closeDetail.addEventListener(
    "click",
    ()=>{
        detailModal.classList.remove("show");
        document.body.classList.remove("modal-open");
    }
);

detailModal.addEventListener(
    "click",
    event=>{
        if(event.target === detailModal){
            detailModal.classList.remove("show");
            document.body.classList.remove("modal-open");
        }
    }
);

document.addEventListener(
    "keydown",
    event=>{
        if(
            event.key === "Escape" &&
            detailModal.classList.contains("show")
        ){
            detailModal.classList.remove("show");
            document.body.classList.remove("modal-open");
        }
    }
);

updateSections();
applyFilters();