let riskChart;

const assessmentElement = document.getElementById("assessmentData");

const assessments = assessmentElement
    ? JSON.parse(assessmentElement.textContent)
    : [];

let high = 0;
let moderate = 0;
let low = 0;

const priorityList = document.getElementById("priorityList");
const insightText = document.getElementById("insightText");
const warningCount = document.getElementById("warningCount");
const prioritySection = document.getElementById("prioritySection");

let notifications = [];

let readNotifications = JSON.parse(
    sessionStorage.getItem("sparkCheckReadNotifications") || "[]"
);

function updateRiskData(){

    high = 0;
    moderate = 0;
    low = 0;

    assessments.forEach(item => {

        if(item.risk_level === "High"){
            high++;
        }
        else if(item.risk_level === "Moderate"){
            moderate++;
        }
        else if(item.risk_level === "Low"){
            low++;
        }

    });

}

function createChart(){

    const canvas = document.getElementById("riskChart");

    if(!canvas){
        return;
    }

    if(riskChart){
        riskChart.destroy();
    }

    riskChart = new Chart(canvas,{

        type:"doughnut",

        data:{

            labels:[
                "Low Risk",
                "Moderate Risk",
                "High Risk"
            ],

            datasets:[{

                data:[
                    low,
                    moderate,
                    high
                ]

            }]

        },

        options:{

            responsive:true,

            maintainAspectRatio:false,

            cutout:"65%",

            plugins:{

                legend:{

                    position:"bottom",

                    labels:{

                        padding:20,

                        font:{
                            weight:"bold"
                        }

                    }

                }

            }

        }

    });

}

function generateInsight(){

    if(!insightText){
        return;
    }

    const total = high + moderate + low;

    if(total === 0){

        insightText.innerHTML = `

            <div class="insight-box">

                <h4>No Data Yet</h4>

                <p>
                    Students have not completed an assessment.
                </p>

            </div>

        `;

        return;

    }

    let title = "";
    let message = "";

    if(high > 0){

        title = "Immediate Attention Needed";

        message =
        `${high} student${high > 1 ? "s are" : " is"} currently showing high risk indicators. Consider checking their progress and providing support.`;

    }
    else if(moderate > 0){

        title = "Continue Monitoring";

        message =
        `${moderate} student${moderate > 1 ? "s are" : " is"} showing moderate indicators. Regular check-ins are recommended.`;

    }
    else{

        title = "Positive Class Progress";

        message =
        "All assessed students currently show low risk indicators.";

    }

    insightText.innerHTML = `

        <div class="insight-box">

            <h4>
                ${title}
            </h4>

            <p>
                ${message}
            </p>

        </div>

        <div class="insight-stats">

            <div>
                <b>${high}</b>
                <span>High</span>
            </div>

            <div>
                <b>${moderate}</b>
                <span>Moderate</span>
            </div>

            <div>
                <b>${low}</b>
                <span>Low</span>
            </div>

        </div>

    `;

}

function loadPriorityStudents(){

    if(!priorityList){
        return;
    }

    priorityList.innerHTML = "";

    const highRisk = assessments.filter(
        item => item.risk_level === "High"
    );

    if(highRisk.length === 0){

        priorityList.innerHTML = `

            <div class="empty-priority">

                No students currently require attention.

            </div>

        `;

        return;

    }

    highRisk.forEach(item => {

        const box = document.createElement("div");

        box.className = "priority-item";

        const studentId =
            item.student_id ||
            item.id ||
            "";

        box.dataset.studentId = studentId;

        box.innerHTML = `

            <strong>
                ${escapeHTML(item.student_name || "Student")}
            </strong>

            <p>
                High risk assessment detected
            </p>

            <span class="priority-action">
                View in Reports →
            </span>

        `;

        priorityList.appendChild(box);

    });

}

function getNotificationId(item){

    const studentId =
        item.student_id ||
        item.student_code ||
        item.student_name ||
        "student";

    const assessmentId =
        item.assessment_id ||
        item.id ||
        item.submitted_at ||
        item.date ||
        "";

    if(item.assessment_id){
        return `warning-${studentId}-assessment-${item.assessment_id}`;
    }

    return `warning-${studentId}-${assessmentId}-${item.risk_level}`;

}

function getNotificationDate(item){

    if(item.submitted_at){
        return item.submitted_at;
    }

    if(item.date){
        return item.date;
    }

    return "";

}

function buildNotifications(){

    notifications = [];

    const sortedAssessments = [...assessments].sort((a,b) => {

        const dateA =
            new Date(
                a.submitted_at ||
                a.date ||
                0
            ).getTime();

        const dateB =
            new Date(
                b.submitted_at ||
                b.date ||
                0
            ).getTime();

        if(dateB !== dateA){
            return dateB - dateA;
        }

        const idA =
            Number(a.assessment_id || a.id || 0);

        const idB =
            Number(b.assessment_id || b.id || 0);

        return idB - idA;

    });

    const studentsAdded = new Set();

    sortedAssessments.forEach(item => {

        if(
            item.risk_level !== "High" &&
            item.risk_level !== "Moderate"
        ){
            return;
        }

        const studentId =
            item.student_id ||
            item.student_code ||
            item.student_name ||
            item.id;

        if(!studentId){
            return;
        }

        if(studentsAdded.has(String(studentId))){
            return;
        }

        studentsAdded.add(String(studentId));

        const notificationId =
            getNotificationId(item);

        const isHigh =
            item.risk_level === "High";

        notifications.push({

            id: notificationId,

            studentId: studentId,

            assessmentId:
                item.assessment_id ||
                item.id ||
                "",

            type: isHigh
                ? "high"
                : "moderate",

            title: isHigh
                ? "High-risk student detected"
                : "Student requires monitoring",

            message: isHigh
                ? `${item.student_name || "A student"} received a High Risk result and may require prompt attention.`
                : `${item.student_name || "A student"} received a Moderate Risk result and should continue to be monitored.`,

            date: getNotificationDate(item),

            read:
                readNotifications.includes(
                    notificationId
                )

        });

    });

}

function getUnreadNotificationCount(){

    return notifications.filter(
        notification => !notification.read
    ).length;

}

function updateNotificationBadge(){

    const badge =
        document.getElementById("notificationBadge");

    if(!badge){
        return;
    }

    const unread =
        getUnreadNotificationCount();

    if(unread > 0){

        badge.textContent =
            unread > 99
                ? "99+"
                : unread;

        badge.classList.remove("hidden");

    }
    else{

        badge.classList.add("hidden");

    }

}

function updateNotificationSummary(){

    const summary =
        document.getElementById("notificationSummary");

    if(!summary){
        return;
    }

    const total =
        notifications.length;

    const unread =
        getUnreadNotificationCount();

    if(total === 0){

        summary.textContent =
            "No assessment updates";

        return;

    }

    if(unread === 0){

        summary.textContent =
            `${total} assessment update${total !== 1 ? "s" : ""} · All read`;

        return;

    }

    summary.textContent =
        `${unread} unread update${unread !== 1 ? "s" : ""} of ${total}`;

}

function formatNotificationDate(date){

    if(!date){
        return "";
    }

    const parsed =
        new Date(date);

    if(Number.isNaN(parsed.getTime())){
        return date;
    }

    return parsed.toLocaleDateString(
        undefined,
        {
            month:"short",
            day:"numeric",
            year:"numeric"
        }
    );

}

function saveReadNotifications(){

    sessionStorage.setItem(
        "sparkCheckReadNotifications",
        JSON.stringify(readNotifications)
    );

}

function renderNotifications(){

    const notificationList =
        document.getElementById("notificationList");

    if(!notificationList){
        return;
    }

    buildNotifications();

    updateNotificationBadge();
    updateNotificationSummary();

    if(notifications.length === 0){

        notificationList.innerHTML = `

            <div class="notification-empty">

                <div class="notification-empty-icon">
                    ✓
                </div>

                <div>

                    <strong>
                        All clear
                    </strong>

                    <p>
                        No students currently have high or moderate risk results.
                    </p>

                </div>

            </div>

        `;

        return;

    }

    notificationList.innerHTML = "";

    notifications.forEach(notification => {

        const item =
            document.createElement("button");

        item.type = "button";

        item.className =
            `notification-item ${notification.type} ${notification.read ? "read" : "unread"}`;

        item.dataset.notificationId =
            notification.id;

        item.dataset.studentId =
            notification.studentId;

        item.innerHTML = `

            <div class="notification-item-icon">
                ${notification.type === "high" ? "⚠" : "!"}
            </div>

            <div class="notification-item-content">

                <div class="notification-item-top">

                    <strong>
                        ${escapeHTML(notification.title)}
                    </strong>

                    ${
                        notification.read
                        ? ""
                        : `<span class="notification-new">NEW</span>`
                    }

                </div>

                <p>
                    ${escapeHTML(notification.message)}
                </p>

                ${
                    notification.date
                    ? `
                        <small>
                            ${escapeHTML(
                                formatNotificationDate(
                                    notification.date
                                )
                            )}
                        </small>
                    `
                    : ""
                }

            </div>

            <span class="notification-item-arrow">
                →
            </span>

        `;

        item.addEventListener("click", event => {

            event.preventDefault();
            event.stopPropagation();

            markNotificationRead(
                notification.id
            );

            closeNotificationModal();

            goToReports(
                notification.studentId
            );

        });

        notificationList.appendChild(item);

    });

}

function markNotificationRead(notificationId){

    if(!notificationId){
        return;
    }

    if(!readNotifications.includes(notificationId)){

        readNotifications.push(
            notificationId
        );

        saveReadNotifications();

    }

    const notification =
        notifications.find(
            item => item.id === notificationId
        );

    if(notification){
        notification.read = true;
    }

    updateNotificationBadge();
    updateNotificationSummary();

    const notificationElement =
        document.querySelector(
            `[data-notification-id="${CSS.escape(notificationId)}"]`
        );

    if(notificationElement){

        notificationElement.classList.remove(
            "unread"
        );

        notificationElement.classList.add(
            "read"
        );

        const newBadge =
            notificationElement.querySelector(
                ".notification-new"
            );

        if(newBadge){
            newBadge.remove();
        }

    }

}

function markAllNotificationsRead(){

    buildNotifications();

    if(notifications.length === 0){

        updateNotificationBadge();
        updateNotificationSummary();

        return;

    }

    notifications.forEach(notification => {

        if(!readNotifications.includes(notification.id)){

            readNotifications.push(
                notification.id
            );

        }

        notification.read = true;

    });

    saveReadNotifications();

    renderNotifications();

}

function openNotificationModal(){

    const modal =
        document.getElementById("notificationModal");

    if(!modal){
        return;
    }

    renderNotifications();

    modal.classList.remove("hidden");

}

function closeNotificationModal(){

    const modal =
        document.getElementById("notificationModal");

    if(modal){

        modal.classList.add("hidden");

    }

}

async function openStudent(studentId){

    const modal =
        document.getElementById("modal");

    const body =
        document.getElementById("modalBody");

    if(!modal || !body){
        return;
    }

    if(!studentId){
        return;
    }

    modal.classList.remove("hidden");

    body.innerHTML =
        "Loading assessment result...";

    try{

        const response =
            await fetch(
                `/teacher/student/${encodeURIComponent(studentId)}`
            );

        if(!response.ok){
            throw new Error("Request failed");
        }

        const data =
            await response.json();

        if(!data.success || !data.latest){

            body.innerHTML =
                "<p>No assessment result available.</p>";

            return;

        }

        body.innerHTML = `

            <div class="assessment-item">

                <h3>
                    ${escapeHTML(data.student.name)}
                </h3>

                <p>
                    Code:
                    <b>${escapeHTML(data.student.code)}</b>
                </p>

                <p>
                    Latest Score:
                    <b>${data.latest.percentage}%</b>
                </p>

                <p>
                    Risk Level:

                    <span class="badge ${String(
                        data.latest.risk_level
                    ).toLowerCase()}">

                        ${escapeHTML(
                            data.latest.risk_level
                        )}

                    </span>

                </p>

                <p>
                    Submitted:
                    ${escapeHTML(data.latest.date)}
                </p>

            </div>

        `;

    }
    catch{

        body.innerHTML =
            "Unable to load assessment result.";

    }

}

function closeModal(){

    const modal =
        document.getElementById("modal");

    if(modal){

        modal.classList.add("hidden");

    }

}

function goToReports(studentId){

    const params = new URLSearchParams();

    params.set(
        "section",
        "attention"
    );

    if(studentId){

        params.set(
            "student",
            studentId
        );

    }

    window.location.href =
        `/teacher/reports?${params.toString()}`;

}

function escapeHTML(value){

    return String(value ?? "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");

}

document.addEventListener("DOMContentLoaded", () => {

    updateRiskData();

    createChart();

    generateInsight();

    loadPriorityStudents();

    renderNotifications();

    const notificationBtn =
        document.getElementById("notificationBtn");

    const notificationClose =
        document.getElementById("notificationClose");

    const markAllReadBtn =
        document.getElementById("markNotificationsRead");

    if(notificationBtn){

        notificationBtn.addEventListener(
            "click",
            event => {

                event.preventDefault();
                event.stopPropagation();

                openNotificationModal();

            }
        );

    }

    if(notificationClose){

        notificationClose.addEventListener(
            "click",
            event => {

                event.preventDefault();
                event.stopPropagation();

                closeNotificationModal();

            }
        );

    }

    if(markAllReadBtn){

        markAllReadBtn.addEventListener(
            "click",
            event => {

                event.preventDefault();
                event.stopPropagation();

                markAllNotificationsRead();

            }
        );

    }

    const notificationModal =
        document.getElementById("notificationModal");

    if(notificationModal){

        notificationModal.addEventListener(
            "click",
            event => {

                if(
                    event.target ===
                    notificationModal
                ){

                    closeNotificationModal();

                }

            }
        );

    }

    if(prioritySection){

        prioritySection.addEventListener(
            "click",
            event => {

                const priorityItem =
                    event.target.closest(
                        ".priority-item"
                    );

                if(priorityItem){

                    const studentId =
                        priorityItem.dataset.studentId;

                    goToReports(studentId);

                    return;

                }

                goToReports();

            }
        );

    }

    document.querySelectorAll(
        ".student-row"
    ).forEach(row => {

        row.addEventListener(
            "click",
            () => {

                const studentId =
                    row.dataset.id;

                if(studentId){

                    openStudent(
                        studentId
                    );

                }

            }
        );

    });

});

window.addEventListener(
    "click",
    event => {

        const modal =
            document.getElementById("modal");

        if(event.target === modal){

            closeModal();

        }

    }
);

document.addEventListener(
    "keydown",
    event => {

        if(event.key !== "Escape"){
            return;
        }

        closeNotificationModal();
        closeModal();

    }
);