let riskChart;

const assessmentElement=document.getElementById("assessmentData");
const assessments=assessmentElement?JSON.parse(assessmentElement.textContent):[];

const appointmentElement=document.getElementById("appointmentData");
const appointments=appointmentElement?JSON.parse(appointmentElement.textContent):[];

let high=0;
let moderate=0;
let low=0;
let notifications=[];
let readNotifications=JSON.parse(sessionStorage.getItem("sparkCheckReadNotifications")||"[]");

function updateRiskData(){
    high=0;
    moderate=0;
    low=0;

    assessments.forEach(item=>{
        if(item.risk_level==="High") high++;
        else if(item.risk_level==="Moderate") moderate++;
        else if(item.risk_level==="Low") low++;
    });
}

function createChart(){
    const canvas=document.getElementById("riskChart");

    if(!canvas||typeof Chart==="undefined") return;

    if(riskChart) riskChart.destroy();

    riskChart=new Chart(canvas,{
        type:"doughnut",
        data:{
            labels:["Low Risk","Moderate Risk","High Risk"],
            datasets:[{
                data:[low,moderate,high]
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
                        padding:18,
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
    if(!insightText) return;

    const total=high+moderate+low;

    if(total===0){
        insightText.innerHTML=`
            <div class="insight-box">
                <h4>No Data Yet</h4>
                <p>Students have not completed an assessment.</p>
            </div>
        `;
        return;
    }

    let title="";
    let message="";

    if(high>0){
        title="Immediate Attention Needed";
        message=`${high} student${high>1?"s are":" is"} currently showing high risk indicators. Consider checking their progress and providing appropriate support.`;
    }else if(moderate>0){
        title="Continue Monitoring";
        message=`${moderate} student${moderate>1?"s are":" is"} showing moderate indicators. Regular check-ins and monitoring are recommended.`;
    }else{
        title="Positive Class Progress";
        message="All assessed students currently show low risk indicators.";
    }

    insightText.innerHTML=`
        <div class="insight-box">
            <h4>${title}</h4>
            <p>${message}</p>
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
    if(!priorityList) return;

    priorityList.innerHTML="";

    const highRisk=assessments.filter(
        item=>item.risk_level==="High"
    );

    if(highRisk.length===0){
        priorityList.innerHTML=`
            <div class="empty-priority">
                No students currently require attention.
            </div>
        `;
        return;
    }

    highRisk.forEach(item=>{
        const box=document.createElement("div");

        box.className="priority-item";

        box.innerHTML=`
            <strong>${escapeHTML(item.student_name||"Student")}</strong>
            <p>High Risk · ${item.percentage!==undefined&&item.percentage!==null?escapeHTML(item.percentage)+"%":"Assessment result available"}</p>
            <span class="priority-action">View Assessment →</span>
        `;

        box.addEventListener("click",event=>{
            event.preventDefault();
            event.stopPropagation();
            openStudentFromAssessment(item);
        });

        priorityList.appendChild(box);
    });
}

function openStudentFromAssessment(assessment){
    const modal=document.getElementById("modal");
    const body=document.getElementById("modalBody");

    if(!modal||!body||!assessment) return;

    const studentName=assessment.student_name||"Student";
    const riskLevel=assessment.risk_level||"";
    const percentage=assessment.percentage;
    const assessmentId=assessment.assessment_id;

    let submittedDate="";

    if(assessment.submitted_at){
        submittedDate=formatNotificationDate(
            assessment.submitted_at
        );
    }

    modal.classList.remove("hidden");

    body.innerHTML=`
        <div class="assessment-item">
            <h3>${escapeHTML(studentName)}</h3>

            ${
                percentage!==undefined&&percentage!==null
                ?`
                    <p>
                        Assessment Score:
                        <b>${escapeHTML(percentage)}%</b>
                    </p>
                `
                :""
            }

            <p>
                Risk Level:
                <span class="badge ${String(riskLevel).toLowerCase()}">
                    ${escapeHTML(riskLevel)}
                </span>
            </p>

            ${
                submittedDate
                ?`
                    <p>
                        Submitted:
                        ${escapeHTML(submittedDate)}
                    </p>
                `
                :""
            }

            ${
                assessmentId
                ?`
                    <p>
                        Assessment ID:
                        <b>${escapeHTML(assessmentId)}</b>
                    </p>
                `
                :""
            }
        </div>
    `;
}

function openStudent(studentId){
    const assessment=assessments.find(
        item=>String(item.student_id)===String(studentId)
    );

    if(assessment){
        openStudentFromAssessment(assessment);
        return;
    }

    const modal=document.getElementById("modal");
    const body=document.getElementById("modalBody");

    if(!modal||!body) return;

    modal.classList.remove("hidden");
    body.innerHTML="<p>No assessment result available.</p>";
}

function closeModal(){
    const modal=document.getElementById("modal");

    if(modal){
        modal.classList.add("hidden");
    }
}

function getNotificationId(item){
    const studentId=item.student_id||item.student_code||item.student_name||"student";
    const assessmentId=item.assessment_id||item.id||item.submitted_at||"";

    return `warning-${studentId}-assessment-${assessmentId}`;
}

function getNotificationDate(item){
    return item.submitted_at||item.date||"";
}

function buildNotifications(){
    notifications=[];

    const sortedAssessments=[...assessments].sort((a,b)=>{
        const dateA=new Date(a.submitted_at||a.date||0).getTime();
        const dateB=new Date(b.submitted_at||b.date||0).getTime();

        if(dateB!==dateA) return dateB-dateA;

        return Number(b.assessment_id||b.id||0)-Number(a.assessment_id||a.id||0);
    });

    const studentsAdded=new Set();

    sortedAssessments.forEach(item=>{
        if(item.risk_level!=="High"&&item.risk_level!=="Moderate") return;

        const studentId=item.student_id||item.student_code||item.student_name||item.id;

        if(!studentId||studentsAdded.has(String(studentId))) return;

        studentsAdded.add(String(studentId));

        const notificationId=getNotificationId(item);
        const isHigh=item.risk_level==="High";

        notifications.push({
            id:notificationId,
            studentId:studentId,
            assessmentId:item.assessment_id||item.id||"",
            type:isHigh?"high":"moderate",
            title:isHigh?"High-risk student detected":"Student requires monitoring",
            message:isHigh
                ?`${item.student_name||"A student"} received a High Risk result and may require prompt attention.`
                :`${item.student_name||"A student"} received a Moderate Risk result and should continue to be monitored.`,
            date:getNotificationDate(item),
            read:readNotifications.includes(notificationId)
        });
    });
}

function getUnreadNotificationCount(){
    return notifications.filter(
        notification=>!notification.read
    ).length;
}

function updateNotificationBadge(){
    const badge=document.getElementById("notificationBadge");

    if(!badge) return;

    const unread=getUnreadNotificationCount();

    if(unread>0){
        badge.textContent=unread>99?"99+":unread;
        badge.classList.remove("hidden");
    }else{
        badge.classList.add("hidden");
    }
}

function updateNotificationSummary(){
    const summary=document.getElementById("notificationSummary");

    if(!summary) return;

    const total=notifications.length;
    const unread=getUnreadNotificationCount();

    if(total===0){
        summary.textContent="No assessment updates";
    }else if(unread===0){
        summary.textContent=`${total} assessment update${total!==1?"s":""} · All read`;
    }else{
        summary.textContent=`${unread} unread update${unread!==1?"s":""} of ${total}`;
    }
}

function formatNotificationDate(date){
    if(!date) return "";

    const parsed=new Date(date);

    if(Number.isNaN(parsed.getTime())) return date;

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
    const notificationList=document.getElementById("notificationList");

    if(!notificationList) return;

    buildNotifications();
    updateNotificationBadge();
    updateNotificationSummary();

    if(notifications.length===0){
        notificationList.innerHTML=`
            <div class="notification-empty">
                <div class="notification-empty-icon">✓</div>
                <div>
                    <strong>All clear</strong>
                    <p>No students currently have high or moderate risk results.</p>
                </div>
            </div>
        `;
        return;
    }

    notificationList.innerHTML="";

    notifications.forEach(notification=>{
        const item=document.createElement("button");

        item.type="button";
        item.className=`notification-item ${notification.type} ${notification.read?"read":"unread"}`;
        item.dataset.notificationId=notification.id;

        item.innerHTML=`
            <div class="notification-item-icon">
                ${notification.type==="high"?"⚠":"!"}
            </div>

            <div class="notification-item-content">
                <div class="notification-item-top">
                    <strong>${escapeHTML(notification.title)}</strong>
                    ${notification.read?"":`<span class="notification-new">NEW</span>`}
                </div>

                <p>${escapeHTML(notification.message)}</p>

                ${
                    notification.date
                    ?`<small>${escapeHTML(formatNotificationDate(notification.date))}</small>`
                    :""
                }
            </div>

            <span class="notification-item-arrow">→</span>
        `;

        item.addEventListener("click",event=>{
            event.preventDefault();
            event.stopPropagation();

            markNotificationRead(notification.id);
            closeNotificationModal();

            const assessment=assessments.find(
                assessmentItem=>
                    String(assessmentItem.student_id)===String(notification.studentId) &&
                    String(assessmentItem.assessment_id)===String(notification.assessmentId)
            );

            if(assessment){
                openStudentFromAssessment(assessment);
            }else{
                openStudent(notification.studentId);
            }
        });

        notificationList.appendChild(item);
    });
}

function markNotificationRead(notificationId){
    if(!notificationId) return;

    if(!readNotifications.includes(notificationId)){
        readNotifications.push(notificationId);
        saveReadNotifications();
    }

    const notification=notifications.find(
        item=>item.id===notificationId
    );

    if(notification) notification.read=true;

    updateNotificationBadge();
    updateNotificationSummary();

    const notificationElement=document.querySelector(
        `[data-notification-id="${CSS.escape(notificationId)}"]`
    );

    if(notificationElement){
        notificationElement.classList.remove("unread");
        notificationElement.classList.add("read");

        const newBadge=notificationElement.querySelector(
            ".notification-new"
        );

        if(newBadge) newBadge.remove();
    }
}

function markAllNotificationsRead(){
    buildNotifications();

    notifications.forEach(notification=>{
        if(!readNotifications.includes(notification.id)){
            readNotifications.push(notification.id);
        }

        notification.read=true;
    });

    saveReadNotifications();
    renderNotifications();
}

function openNotificationModal(){
    const modal=document.getElementById("notificationModal");

    if(!modal) return;

    renderNotifications();
    modal.classList.remove("hidden");
}

function closeNotificationModal(){
    const modal=document.getElementById("notificationModal");

    if(modal){
        modal.classList.add("hidden");
    }
}

function setupDashboardToggles(){
    document.querySelectorAll(".dashboard-toggle").forEach(button=>{
        button.addEventListener("click",()=>{
            const targetId=button.dataset.target;
            const target=document.getElementById(targetId);

            if(!target) return;

            const isOpen=target.classList.contains("open");

            document.querySelectorAll(".toggle-section").forEach(section=>{
                section.classList.remove("open");
            });

            document.querySelectorAll(".dashboard-toggle").forEach(toggle=>{
                toggle.classList.remove("active");
                toggle.setAttribute("aria-expanded","false");
            });

            if(!isOpen){
                target.classList.add("open");
                button.classList.add("active");
                button.setAttribute("aria-expanded","true");

                setTimeout(()=>{
                    target.scrollIntoView({
                        behavior:"smooth",
                        block:"start"
                    });
                },50);
            }
        });
    });
}

function setupSummaryAppointmentLink(){
    const appointmentCard=document.getElementById(
        "appointmentSummaryCard"
    );

    if(!appointmentCard) return;

    appointmentCard.addEventListener("click",event=>{
        event.preventDefault();

        const target=document.getElementById(
            "counselorAppointments"
        );

        if(target){
            target.scrollIntoView({
                behavior:"smooth",
                block:"start"
            });
        }
    });
}

function formatAppointmentDate(value){
    if(!value) return "Date not provided";

    const parsed=new Date(value);

    if(Number.isNaN(parsed.getTime())) return value;

    return parsed.toLocaleDateString(
        undefined,
        {
            month:"short",
            day:"numeric",
            year:"numeric"
        }
    );
}

function formatAppointmentTime(value){
    if(!value) return "";

    const parsed=new Date(`1970-01-01T${value}`);

    if(Number.isNaN(parsed.getTime())) return value;

    return parsed.toLocaleTimeString(
        undefined,
        {
            hour:"numeric",
            minute:"2-digit"
        }
    );
}

function getAppointmentStatusClass(status){
    const value=String(status||"Pending")
        .toLowerCase()
        .replace(/\s+/g,"-");

    if(
        value==="confirmed"||
        value==="completed"||
        value==="cancelled"
    ){
        return value;
    }

    return "pending";
}

function updateAppointmentCount(){
    const count=document.getElementById("appointmentCount");

    if(!count) return;

    count.textContent=appointments.length;
}

function renderAppointments(){
    const list=document.getElementById("appointmentList");

    if(!list) return;

    updateAppointmentCount();

    if(!appointments.length){
        list.innerHTML=`
            <div class="appointment-empty">
                No counselor follow-up appointments are currently assigned to you.
            </div>
        `;
        return;
    }

    list.innerHTML="";

    appointments.forEach(appointment=>{
        const item=document.createElement("div");

        item.className="appointment-item";

        const studentName=appointment.student_name||"Student";
        const counselorName=appointment.counselor_name||"Counselor";
        const status=appointment.status||"Pending";

        item.innerHTML=`
            <div class="appointment-icon">📅</div>

            <div class="appointment-content">
                <strong>${escapeHTML(studentName)}</strong>

                <p>
                    ${escapeHTML(
                        appointment.date||"Date not provided"
                    )}
                    ${
                        appointment.time
                        ?` · ${escapeHTML(appointment.time)}`
                        :""
                    }
                </p>

                <small>
                    Counselor: ${escapeHTML(counselorName)}
                </small>
            </div>

            <span class="appointment-status ${getAppointmentStatusClass(status)}">
                ${escapeHTML(status)}
            </span>

            <div class="appointment-actions">
                ${
                    status==="Pending"
                    ?`
                        <button
                            type="button"
                            class="appointment-btn"
                            data-action="confirm">
                            Confirm
                        </button>
                    `
                    :""
                }

                <button
                    type="button"
                    class="appointment-btn secondary"
                    data-action="details">
                    View Details
                </button>
            </div>
        `;

        const confirmButton=item.querySelector(
            '[data-action="confirm"]'
        );

        if(confirmButton){
            confirmButton.addEventListener("click",event=>{
                event.preventDefault();
                event.stopPropagation();

                confirmAppointment(
                    appointment.appointment_id
                );
            });
        }

        const detailsButton=item.querySelector(
            '[data-action="details"]'
        );

        if(detailsButton){
            detailsButton.addEventListener("click",event=>{
                event.preventDefault();
                event.stopPropagation();

                openAppointmentModal(appointment);
            });
        }

        list.appendChild(item);
    });
}

async function confirmAppointment(appointmentId){
    if(!appointmentId) return;

    try{
        const response=await fetch(
            `/teacher/appointments/${encodeURIComponent(appointmentId)}/confirm`,
            {
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                }
            }
        );

        const data=await response.json();

        if(!response.ok||!data.success){
            alert(
                data.message||
                "Unable to confirm appointment."
            );
            return;
        }

        const appointment=appointments.find(
            item=>String(item.appointment_id)===String(appointmentId)
        );

        if(appointment){
            appointment.status="Confirmed";
        }

        renderAppointments();
    }catch{
        alert("Unable to confirm appointment.");
    }
}

function openAppointmentModal(appointment){
const modal=document.getElementById("appointmentModal");
const body=document.getElementById("appointmentModalBody");


if(!modal||!body) return;

const studentName=appointment.student_name||"Student";
const counselorName=appointment.counselor_name||"Counselor";
const status=appointment.status||"Pending";
const reason=appointment.reason||"";
const notes=appointment.notes||"";

body.innerHTML=`
    <div class="assessment-item">

        <h3>${escapeHTML(studentName)}</h3>

        <p>
            <b>Appointment Date:</b>
            ${escapeHTML(appointment.date||"Not provided")}
        </p>

        ${
            appointment.time
            ?`
                <p>
                    <b>Time:</b>
                    ${escapeHTML(appointment.time)}
                </p>
            `
            :`
                <p>
                    <b>Time:</b>
                    To be arranged
                </p>
            `
        }

        <p>
            <b>Counselor:</b>
            ${escapeHTML(counselorName)}
        </p>

        <p>
            <b>Status:</b>
            <span class="appointment-status ${getAppointmentStatusClass(status)}">
                ${escapeHTML(status)}
            </span>
        </p>

        ${
            reason
            ?`
                <p>
                    <b>Reason:</b>
                    ${escapeHTML(reason)}
                </p>
            `
            :""
        }

        ${
            notes
            ?`
                <p>
                    <b>Notes:</b>
                    ${escapeHTML(notes)}
                </p>
            `
            :""
        }

        <div class="appointment-info">
            <strong>Appointment Reminder</strong>
            <p>
                Please coordinate with the counselor at the counselor's room or office
                to discuss the appointment details and arrange or confirm the schedule
                when needed.
            </p>
        </div>

    </div>
`;

modal.classList.remove("hidden");

}


function closeAppointmentModal(){
    const modal=document.getElementById("appointmentModal");

    if(modal){
        modal.classList.add("hidden");
    }
}

function escapeHTML(value){
    return String(value??"")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}

document.addEventListener("DOMContentLoaded",()=>{
    updateRiskData();
    createChart();
    generateInsight();
    loadPriorityStudents();
    renderNotifications();
    renderAppointments();
    setupDashboardToggles();
    setupSummaryAppointmentLink();

    const notificationBtn=document.getElementById("notificationBtn");
    const notificationClose=document.getElementById("notificationClose");
    const markAllReadBtn=document.getElementById("markNotificationsRead");
    const appointmentModalClose=document.getElementById("appointmentModalClose");

    if(notificationBtn){
        notificationBtn.addEventListener("click",event=>{
            event.preventDefault();
            event.stopPropagation();
            openNotificationModal();
        });
    }

    if(notificationClose){
        notificationClose.addEventListener("click",event=>{
            event.preventDefault();
            event.stopPropagation();
            closeNotificationModal();
        });
    }

    if(markAllReadBtn){
        markAllReadBtn.addEventListener("click",event=>{
            event.preventDefault();
            event.stopPropagation();
            markAllNotificationsRead();
        });
    }

    if(appointmentModalClose){
        appointmentModalClose.addEventListener("click",event=>{
            event.preventDefault();
            event.stopPropagation();
            closeAppointmentModal();
        });
    }

    const notificationModal=document.getElementById("notificationModal");

    if(notificationModal){
        notificationModal.addEventListener("click",event=>{
            if(event.target===notificationModal){
                closeNotificationModal();
            }
        });
    }

    const appointmentModal=document.getElementById("appointmentModal");

    if(appointmentModal){
        appointmentModal.addEventListener("click",event=>{
            if(event.target===appointmentModal){
                closeAppointmentModal();
            }
        });
    }

    document.querySelectorAll(".student-row").forEach(row=>{
        row.addEventListener("click",()=>{
            const studentId=row.dataset.id;

            if(studentId){
                openStudent(studentId);
            }
        });
    });
});

window.addEventListener("click",event=>{
    const modal=document.getElementById("modal");

    if(event.target===modal){
        closeModal();
    }
});

document.addEventListener("keydown",event=>{
    if(event.key!=="Escape") return;

    closeNotificationModal();
    closeAppointmentModal();
    closeModal();
});