const form=document.getElementById("appointmentForm");
const studentSelect=document.getElementById("studentId");
const assessmentId=document.getElementById("assessmentId");
const selectedAssessment=document.getElementById("selectedAssessment");
const scheduleBtn=document.getElementById("scheduleBtn");
const toastContainer=document.getElementById("toastContainer");
const appointmentList=document.getElementById("appointmentList");
const searchInput=document.getElementById("appointmentSearch");
const sortSelect=document.getElementById("appointmentSort");
const appointmentCount=document.getElementById("appointmentCount");
const noFilterResults=document.getElementById("noFilterResults");
const viewRequestsBtn=document.getElementById("viewRequestsBtn");
const supportRequestCount=document.getElementById("supportRequestCount");
const supportNotificationTitle=document.getElementById("supportNotificationTitle");
const supportNotificationText=document.getElementById("supportNotificationText");

let toastTimer=null;
let appointmentPage=1;
const appointmentsPerPage=10;
let notificationTimer=null;
let lastNotificationCount=null;

function showToast(message,type="success",duration=5000){
    if(!toastContainer)return;

    if(toastTimer){
        clearTimeout(toastTimer);
        toastTimer=null;
    }

    const existingToast=toastContainer.querySelector(".toast");

    if(existingToast){
        existingToast.remove();
    }

    const toast=document.createElement("div");
    toast.className=`toast ${type}`;
    toast.textContent=message;

    toast.style.animation="none";
    toast.style.opacity="1";
    toast.style.visibility="visible";
    toast.style.display="block";

    toastContainer.style.visibility="visible";
    toastContainer.style.opacity="1";

    toastContainer.appendChild(toast);

    if(duration>0){
        toastTimer=setTimeout(()=>{
            if(!toast.parentNode){
                toastTimer=null;
                return;
            }

            toast.classList.add("hide");
            toast.style.opacity="0";

            setTimeout(()=>{
                if(toast.parentNode){
                    toast.remove();
                }
            },400);

            toastTimer=null;
        },duration);
    }
}

function escapeHtml(value){
    const div=document.createElement("div");
    div.textContent=value??"";
    return div.innerHTML;
}

function formatDate(date){
    if(!date)return "Not scheduled";

    const parsed=new Date(`${date}T00:00:00`);

    if(isNaN(parsed.getTime())){
        return "Not scheduled";
    }

    return parsed.toLocaleDateString(
        "en-US",
        {
            month:"short",
            day:"numeric",
            year:"numeric"
        }
    );
}

function formatTime(time){
    if(!time)return "Not scheduled";

    const parsed=new Date(`1970-01-01T${time}`);

    if(isNaN(parsed.getTime())){
        return "Not scheduled";
    }

    return parsed.toLocaleTimeString(
        "en-US",
        {
            hour:"numeric",
            minute:"2-digit"
        }
    );
}

function getAppointmentSource(item){
    return item.dataset.source==="Student"
        ?"student"
        :"staff";
}

function getAppointmentStatus(item){
    const status=item.querySelector(".appointment-status");

    return status
        ?status.textContent.trim().toLowerCase()
        :"";
}

function isStudentRequest(item){
    return getAppointmentSource(item)==="student";
}

function getAppointmentDate(item){
    const date=item.dataset.date;
    const time=item.dataset.time;

    if(date&&time){
        const parsed=new Date(`${date}T${time}`);

        if(!isNaN(parsed.getTime())){
            return parsed.getTime();
        }
    }

    return 0;
}

function getAppointmentSearchText(item){
    const dataSearch=item.dataset.search||"";

    const student=
        item.querySelector(
            ".appointment-student strong"
        )?.textContent||"";

    const counselor=
        item.querySelector(
            ".appointment-meta > div:nth-child(3) strong"
        )?.textContent||"";

    const reason=
        item.querySelector(
            ".appointment-reason p,.appointment-reason strong"
        )?.textContent||"";

    return `${dataSearch} ${student} ${counselor} ${reason}`
        .toLowerCase()
        .trim();
}

async function loadStudentAssessment(studentId){
    if(!studentId){
        if(assessmentId){
            assessmentId.value="";
        }

        if(selectedAssessment){
            selectedAssessment.innerHTML=
                `<div class="assessment-empty">Select a student to load their latest assessment.</div>`;
        }

        return;
    }

    if(selectedAssessment){
        selectedAssessment.innerHTML=
            `<div class="assessment-loading">Loading latest assessment...</div>`;
    }

    try{
        const response=await fetch(
            `/admin/at-risk/student/${studentId}`,
            {
                method:"GET",
                cache:"no-store",
                credentials:"same-origin"
            }
        );

        const data=await response.json();

        if(!response.ok||!data.success){
            throw new Error(
                data.message||"Unable to load assessment."
            );
        }

        const assessment=data.assessment;

        if(!assessment){
            if(assessmentId){
                assessmentId.value="";
            }

            selectedAssessment.innerHTML=
                `<div class="assessment-empty">This student does not have an assessment yet.</div>`;

            return;
        }

        if(assessmentId){
            assessmentId.value=assessment.assessment_id;
        }

        selectedAssessment.innerHTML=`
            <div class="assessment-preview">
                <div>
                    <span>Baseline Assessment</span>
                    <strong>#${escapeHtml(String(assessment.assessment_id))}</strong>
                </div>
                <div>
                    <span>Risk</span>
                    <strong class="${String(assessment.risk_level||"").toLowerCase()}">
                        ${escapeHtml(assessment.risk_level||"N/A")}
                    </strong>
                </div>
                <div>
                    <span>Score</span>
                    <strong>${escapeHtml(String(assessment.percentage??"N/A"))}%</strong>
                </div>
            </div>
        `;
    }catch(error){
        if(assessmentId){
            assessmentId.value="";
        }

        if(selectedAssessment){
            selectedAssessment.innerHTML=
                `<div class="assessment-error">${escapeHtml(error.message||"Unable to load assessment.")}</div>`;
        }
    }
}

if(studentSelect){
    studentSelect.addEventListener(
        "change",
        ()=>{
            loadStudentAssessment(studentSelect.value);
        }
    );
}

function getCounselorValue(){
    const counselor=document.getElementById("counselorId");

    return counselor
        ?counselor.value
        :"";
}

function openAppointmentEditor(item){
    if(!item)return;

    const modal=document.getElementById("appointmentEditModal");

    if(!modal){
        showToast(
            "Appointment editor is not available.",
            "error",
            5000
        );
        return;
    }

    const appointmentId=item.dataset.appointmentId||"";
    const studentId=item.dataset.studentId||"";
    const date=item.dataset.date||"";
    const time=item.dataset.time||"";
    const reason=item.dataset.reason||"";
    const notes=item.dataset.notes||"";
    const counselorId=item.dataset.counselorId||"";

    const editStudent=
        document.getElementById("editAppointmentStudent");

    const editDate=
        document.getElementById("editScheduledDate");

    const editTime=
        document.getElementById("editScheduledTime");

    const editReason=
        document.getElementById("editReason");

    const editNotes=
        document.getElementById("editNotes");

    const editCounselor=
        document.getElementById("editCounselorId");

    const editId=
        document.getElementById("editAppointmentId");

    const editStudentId=
        document.getElementById("editAppointmentStudentId");

    if(editId){
        editId.value=appointmentId;
    }

    if(editStudentId){
        editStudentId.value=studentId;
    }

    if(editStudent){
        editStudent.textContent=
            item.querySelector(
                ".appointment-student strong"
            )?.textContent.trim()||
            "Student";
    }

    if(editDate){
        editDate.value=date;
    }

    if(editTime){
        editTime.value=time;
    }

    if(editReason){
        editReason.value=reason;
    }

    if(editNotes){
        editNotes.value=notes;
    }

    if(editCounselor){
        editCounselor.value=counselorId;
    }

    modal.classList.add("show");
    modal.setAttribute("aria-hidden","false");
    document.body.classList.add("modal-open");
}

function closeAppointmentEditor(){
    const modal=document.getElementById("appointmentEditModal");

    if(!modal)return;

    modal.classList.remove("show");
    modal.setAttribute("aria-hidden","true");
    document.body.classList.remove("modal-open");
}

document.addEventListener(
    "click",
    event=>{
        const editButton=
            event.target.closest(".appointment-edit");

        if(editButton){
            const item=
                editButton.closest(".appointment-item");

            openAppointmentEditor(item);
            return;
        }

        const scheduleButton=
            event.target.closest(".appointment-schedule");

        if(scheduleButton){
            const item=
                scheduleButton.closest(".appointment-item");

            openAppointmentEditor(item);
            return;
        }

        const closeButton=
            event.target.closest(".appointment-edit-close");

        if(closeButton){
            closeAppointmentEditor();
            return;
        }

        const modal=
            document.getElementById("appointmentEditModal");

        if(
            modal&&
            event.target===modal
        ){
            closeAppointmentEditor();
        }
    }
);

document.addEventListener(
    "keydown",
    event=>{
        if(event.key==="Escape"){
            closeAppointmentEditor();
        }
    }
);

const editAppointmentForm=
    document.getElementById("editAppointmentForm");

if(editAppointmentForm){
    editAppointmentForm.addEventListener(
        "submit",
        async event=>{
            event.preventDefault();

            const appointmentId=
                document.getElementById(
                    "editAppointmentId"
                )?.value;

            if(!appointmentId){
                showToast(
                    "Invalid appointment information.",
                    "error"
                );
                return;
            }

            const submitButton=
                editAppointmentForm.querySelector(
                    'button[type="submit"]'
                );

            if(submitButton){
                submitButton.disabled=true;
                submitButton.textContent="Saving...";
            }

            try{
                const formData=
                    new FormData(editAppointmentForm);

                const response=await fetch(
                    `/admin/appointments/${appointmentId}/schedule`,
                    {
                        method:"POST",
                        body:formData,
                        credentials:"same-origin",
                        cache:"no-store"
                    }
                );

                let data;

                try{
                    data=await response.json();
                }catch(error){
                    throw new Error(
                        "The server returned an invalid response."
                    );
                }

                if(!response.ok||!data.success){
                    throw new Error(
                        data.message||
                        "Unable to save appointment."
                    );
                }

                closeAppointmentEditor();

                showToast(
                    data.message||
                    "Appointment updated successfully.",
                    "success",
                    5000
                );

                await refreshAppointments();
                await loadAppointmentNotifications(false);

            }catch(error){
                showToast(
                    error.message||
                    "Unable to update appointment.",
                    "error",
                    5000
                );
            }finally{
                if(submitButton){
                    submitButton.disabled=false;
                    submitButton.textContent="Save Appointment";
                }
            }
        }
    );
}

if(form){
    form.addEventListener(
        "submit",
        async event=>{
            event.preventDefault();
            event.stopPropagation();

            if(event.stopImmediatePropagation){
                event.stopImmediatePropagation();
            }

            if(!scheduleBtn||scheduleBtn.disabled){
                return false;
            }

            const counselorValue=getCounselorValue();

            if(!studentSelect?.value){
                showToast(
                    "Please select a student.",
                    "error",
                    5000
                );
                return false;
            }

            if(!counselorValue){
                showToast(
                    "Please select a counselor.",
                    "error",
                    5000
                );
                return false;
            }

            scheduleBtn.disabled=true;
            scheduleBtn.textContent="Scheduling...";

            try{
                const formData=new FormData(form);

                const response=await fetch(
                    "/admin/appointments/create",
                    {
                        method:"POST",
                        body:formData,
                        credentials:"same-origin",
                        cache:"no-store"
                    }
                );

                let data;

                try{
                    data=await response.json();
                }catch(error){
                    throw new Error(
                        "The server returned an invalid response."
                    );
                }

                if(!response.ok||!data.success){
                    throw new Error(
                        data.message||
                        "Unable to schedule appointment."
                    );
                }

                form.reset();

                if(assessmentId){
                    assessmentId.value="";
                }

                if(selectedAssessment){
                    selectedAssessment.innerHTML=
                        `<div class="assessment-empty">Select a student to load their latest assessment.</div>`;
                }

                showToast(
                    data.message||
                    "Follow-up appointment scheduled successfully.",
                    "success",
                    5000
                );

                await refreshAppointments();
                await loadAppointmentNotifications(false);

            }catch(error){
                showToast(
                    error.message||
                    "Unable to schedule appointment.",
                    "error",
                    5000
                );
            }finally{
                scheduleBtn.disabled=false;
                scheduleBtn.textContent="Schedule Follow-Up";
            }

            return false;
        },
        true
    );
}

function getCurrentFilter(){
    const active=document.querySelector(
        ".appointment-filter.active"
    );

    return active
        ?active.dataset.filter
        :"all";
}

function setActiveFilter(filter){
    const filterButtons=document.querySelectorAll(
        ".appointment-filter"
    );

    if(!filterButtons.length){
        return;
    }

    filterButtons.forEach(button=>{
        button.classList.toggle(
            "active",
            button.dataset.filter===filter
        );
    });

    appointmentPage=1;
    renderAppointments();
}

function setDefaultFilter(){
    const filterButtons=document.querySelectorAll(
        ".appointment-filter"
    );

    if(!filterButtons.length){
        return;
    }

    filterButtons.forEach(button=>{
        button.classList.remove("active");
    });

    const allButton=document.querySelector(
        '.appointment-filter[data-filter="ongoing"]'
    );

    if(allButton){
        allButton.classList.add("active");
    }else{
        filterButtons[0].classList.add("active");
    }

    appointmentPage=1;
}

function appointmentMatchesFilter(item){
    const filter=getCurrentFilter();
    const status=getAppointmentStatus(item);

    if(filter==="all"){
        return true;
    }

    if(filter==="requests"){
        return isStudentRequest(item)&&
               (
                   status==="pending"||
                   status==="confirmed"
               );
    }

    if(filter==="ongoing"){
        return status==="pending"||
               status==="confirmed";
    }

    if(filter==="completed"){
        return status==="completed";
    }

    if(filter==="cancelled"){
        return status==="cancelled";
    }

    return true;
}

function renderAppointments(){
    if(!appointmentList){
        return;
    }

    const items=Array.from(
        appointmentList.querySelectorAll(
            ".appointment-item"
        )
    );

    const searchValue=
        searchInput
            ?searchInput.value.trim().toLowerCase()
            :"";

    const sortValue=
        sortSelect
            ?sortSelect.value
            :"newest";

    let filtered=items.filter(item=>{
        if(!appointmentMatchesFilter(item)){
            return false;
        }

        if(!searchValue){
            return true;
        }

        return getAppointmentSearchText(item)
            .includes(searchValue);
    });

    filtered.sort((a,b)=>{
        const dateA=getAppointmentDate(a);
        const dateB=getAppointmentDate(b);

        if(sortValue==="oldest"){
            return dateA-dateB;
        }

        if(sortValue==="upcoming"){
            if(dateA===0&&dateB===0){
                return 0;
            }

            if(dateA===0){
                return 1;
            }

            if(dateB===0){
                return -1;
            }

            return dateA-dateB;
        }

        return dateB-dateA;
    });

    items.forEach(item=>{
        item.style.display="none";
    });

    const totalPages=Math.max(
        1,
        Math.ceil(
            filtered.length/appointmentsPerPage
        )
    );

    if(appointmentPage>totalPages){
        appointmentPage=totalPages;
    }

    const start=
        (appointmentPage-1)*
        appointmentsPerPage;

    const pageItems=
        filtered.slice(
            start,
            start+appointmentsPerPage
        );

    pageItems.forEach(item=>{
        item.style.display="flex";
    });

    if(noFilterResults){
        noFilterResults.classList.toggle(
            "show",
            filtered.length===0
        );
    }

    updateAppointmentPagination(
        filtered.length,
        totalPages
    );

    updateAppointmentCount(
        filtered.length,
        items.length
    );
}

function updateAppointmentPagination(
    totalItems,
    totalPages
){
    const pagination=
        document.getElementById(
            "appointmentPagination"
        );

    if(!pagination){
        return;
    }

    if(totalItems===0){
        pagination.innerHTML="";
        return;
    }

    const start=
        ((appointmentPage-1)*
        appointmentsPerPage)+1;

    const end=
        Math.min(
            appointmentPage*
            appointmentsPerPage,
            totalItems
        );

    pagination.innerHTML=`
        <div class="pagination-info">
            Showing ${start}-${end} of ${totalItems}
        </div>

        <div class="pagination-buttons">
            <button
                type="button"
                class="pagination-btn"
                id="appointmentPrev"
                ${appointmentPage===1?"disabled":""}
            >
                ←
            </button>

            <span class="pagination-page">
                Page ${appointmentPage} of ${totalPages}
            </span>

            <button
                type="button"
                class="pagination-btn"
                id="appointmentNext"
                ${appointmentPage===totalPages?"disabled":""}
            >
                →
            </button>
        </div>
    `;

    const previous=
        document.getElementById(
            "appointmentPrev"
        );

    const next=
        document.getElementById(
            "appointmentNext"
        );

    if(previous){
        previous.addEventListener(
            "click",
            ()=>{
                if(appointmentPage>1){
                    appointmentPage--;
                    renderAppointments();
                }
            }
        );
    }

    if(next){
        next.addEventListener(
            "click",
            ()=>{
                if(appointmentPage<totalPages){
                    appointmentPage++;
                    renderAppointments();
                }
            }
        );
    }
}

function updateAppointmentCount(
    visible,
    total
){
    if(!appointmentCount){
        return;
    }

    appointmentCount.innerHTML=
        visible===total
            ?`Showing <strong>${total}</strong> appointments`
            :`Showing <strong>${visible}</strong> of <strong>${total}</strong> appointments`;
}

function updateAppointmentItemStatus(
    item,
    status
){
    if(!item){
        return;
    }

    item.dataset.status=status;

    const statusElement=
        item.querySelector(
            ".appointment-status"
        );

    if(statusElement){
        statusElement.textContent=status;

        statusElement.className=
            `appointment-status ${status.toLowerCase()}`;
    }

    if(
        status==="Completed"||
        status==="Cancelled"
    ){
        const actions=
            item.querySelector(
                ".appointment-action-buttons"
            );

        if(actions){
            actions.remove();
        }
    }
}

function setupAppointmentActions(){
    document
        .querySelectorAll(".appointment-action")
        .forEach(button=>{
            if(button.dataset.bound==="true"){
                return;
            }

            button.dataset.bound="true";

            button.addEventListener(
                "click",
                async event=>{
                    event.preventDefault();
                    event.stopPropagation();

                    if(
                        button.classList.contains("edit")||
                        button.classList.contains("schedule")
                    ){
                        const item=
                            button.closest(
                                ".appointment-item"
                            );

                        openAppointmentEditor(item);
                        return;
                    }

                    const appointmentId=
                        button.dataset.id;

                    const status=
                        button.dataset.status;

                    if(!appointmentId||!status){
                        showToast(
                            "Invalid appointment information.",
                            "error",
                            5000
                        );
                        return;
                    }

                    const appointmentItem=
                        button.closest(
                            ".appointment-item"
                        );

                    if(!appointmentItem){
                        return;
                    }

                    const buttons=
                        appointmentItem.querySelectorAll(
                            ".appointment-action"
                        );

                    buttons.forEach(
                        actionButton=>{
                            actionButton.disabled=true;
                        }
                    );

                    const originalText=
                        button.textContent;

                    button.textContent=
                        status==="Completed"
                            ?"Completing..."
                            :"Cancelling...";

                    try{
                        const response=
                            await fetch(
                                `/admin/appointments/${appointmentId}/status`,
                                {
                                    method:"POST",
                                    headers:{
                                        "Content-Type":
                                            "application/json"
                                    },
                                    credentials:"same-origin",
                                    cache:"no-store",
                                    body:
                                        JSON.stringify({
                                            status
                                        })
                                }
                            );

                        let data;

                        try{
                            data=await response.json();
                        }catch(error){
                            throw new Error(
                                "The server returned an invalid response."
                            );
                        }

                        if(
                            !response.ok||
                            !data.success
                        ){
                            throw new Error(
                                data.message||
                                "Unable to update appointment."
                            );
                        }

                        updateAppointmentItemStatus(
                            appointmentItem,
                            status
                        );

                        showToast(
                            status==="Completed"
                                ?"Appointment completed successfully."
                                :"Appointment cancelled successfully.",
                            "success",
                            5000
                        );

                        renderAppointments();
                        await loadAppointmentNotifications(false);

                    }catch(error){
                        buttons.forEach(
                            actionButton=>{
                                actionButton.disabled=false;
                            }
                        );

                        button.textContent=originalText;

                        showToast(
                            error.message||
                            "Unable to update appointment.",
                            "error",
                            5000
                        );
                    }
                }
            );
        });
}

function updateNotificationUI(
    count,
    requests
){
    const badge=
        document.getElementById(
            "appointmentNotificationBadge"
        );

    const notificationCount=
        document.getElementById(
            "appointmentNotificationCount"
        );

    const notificationList=
        document.getElementById(
            "appointmentNotificationList"
        );

    if(badge){
        badge.textContent=count;

        badge.style.display=
            count>0
                ?"inline-flex"
                :"none";
    }

    if(notificationCount){
        notificationCount.textContent=count;
    }

    if(supportRequestCount){
        supportRequestCount.textContent=count;
    }

    if(supportNotificationTitle){
        supportNotificationTitle.textContent=
            count>0
                ?`${count} student support request${count===1?"":"s"} waiting`
                :"No new support requests";
    }

    if(supportNotificationText){
        supportNotificationText.textContent=
            count>0
                ?"Students are waiting for an admin or counselor to schedule their support session."
                :"New requests from students will appear here.";
    }

    if(notificationList){
        if(!requests.length){
            notificationList.innerHTML=`
                <div class="notification-empty">
                    <span>✓</span>
                    <p>No new student support requests.</p>
                </div>
            `;
        }else{
            notificationList.innerHTML=
                requests.map(request=>`
                    <button
                        type="button"
                        class="appointment-notification"
                        data-appointment-id="${escapeHtml(
                            String(request.appointment_id||"")
                        )}"
                    >
                        <div class="notification-icon">
                            🧑‍🎓
                        </div>

                        <div class="notification-content">
                            <strong>
                                ${escapeHtml(
                                    request.student_name||
                                    "Student"
                                )}
                            </strong>

                            <span>
                                Requested counselor support
                            </span>

                            <small>
                                ${escapeHtml(
                                    request.reason||
                                    "Support request"
                                )}
                            </small>
                        </div>

                        <span class="notification-arrow">
                            →
                        </span>
                    </button>
                `).join("");
        }
    }
}

async function loadAppointmentNotifications(
    showToastForNew=true
){
    try{
        const response=await fetch(
            "/admin/appointments/notifications",
            {
                method:"GET",
                credentials:"same-origin",
                cache:"no-store"
            }
        );

        if(!response.ok){
            return;
        }

        const data=await response.json();

        if(!data.success){
            return;
        }

        const requests=
            Array.isArray(data.requests)
                ?data.requests
                :[];

        const count=requests.length;

        const previousCount=lastNotificationCount;

        updateNotificationUI(
            count,
            requests
        );

        if(
            showToastForNew&&
            previousCount!==null&&
            count>previousCount
        ){
            const difference=count-previousCount;
            const newest=requests[0];

            showToast(
                newest
                    ?`🧑‍🎓 ${newest.student_name} requested counselor support.`
                    :`${difference} new student support request${difference===1?"":"s"}.`,
                "info",
                7000
            );

            await refreshAppointments();
        }

        lastNotificationCount=count;

    }catch(error){
        console.error(
            "Unable to load appointment notifications:",
            error
        );
    }
}

function openStudentRequestsFilter(){
    const requestButton=
        document.querySelector(
            '.appointment-filter[data-filter="requests"]'
        );

    if(!requestButton){
        return;
    }

    document
        .querySelectorAll(
            ".appointment-filter"
        )
        .forEach(button=>{
            button.classList.remove("active");
        });

    requestButton.classList.add("active");

    appointmentPage=1;

    renderAppointments();

    const appointmentLog=
        document.querySelector(
            ".appointment-list-card"
        );

    if(appointmentLog){
        appointmentLog.scrollIntoView({
            behavior:"smooth",
            block:"start"
        });
    }
}

if(viewRequestsBtn){
    viewRequestsBtn.addEventListener(
        "click",
        ()=>{
            openStudentRequestsFilter();
        }
    );
}

document.addEventListener(
    "click",
    event=>{
        const notification=
            event.target.closest(
                ".appointment-notification"
            );

        if(!notification){
            return;
        }

        const appointmentId=
            notification.dataset.appointmentId;

        const item=
            document.querySelector(
                `.appointment-item[data-appointment-id="${appointmentId}"]`
            );

        openStudentRequestsFilter();

        if(item){
            setTimeout(()=>{
                item.scrollIntoView({
                    behavior:"smooth",
                    block:"center"
                });

                item.classList.add(
                    "appointment-highlight"
                );

                setTimeout(()=>{
                    item.classList.remove(
                        "appointment-highlight"
                    );
                },2500);
            },100);
        }
    }
);

function startNotificationPolling(){
    loadAppointmentNotifications(false);

    if(notificationTimer){
        clearInterval(notificationTimer);
    }

    notificationTimer=setInterval(
        ()=>{
            loadAppointmentNotifications(true);
        },
        5000
    );
}

async function refreshAppointments(){
    try{
        const response=await fetch(
            "/admin/appointments/list",
            {
                method:"GET",
                credentials:"same-origin",
                cache:"no-store"
            }
        );

        if(!response.ok){
            renderAppointments();
            return;
        }

        const data=await response.json();

        if(
            data.success&&
            Array.isArray(data.appointments)
        ){
            rebuildAppointmentList(
                data.appointments
            );
        }else{
            renderAppointments();
        }

    }catch(error){
        console.error(
            "Unable to refresh appointments:",
            error
        );

        renderAppointments();
    }
}

function rebuildAppointmentList(appointments){
    if(!appointmentList){
        return;
    }

    appointmentList
        .querySelectorAll(
            ".appointment-item"
        )
        .forEach(item=>{
            item.remove();
        });

    if(!appointments.length){
        if(noFilterResults){
            noFilterResults.classList.remove("show");
        }

        renderAppointments();
        return;
    }

    appointments.forEach(
        (appointment,index)=>{
            const item=
                document.createElement("div");

            item.className="appointment-item";

            if(
                appointment.request_source==="Student"
            ){
                item.classList.add(
                    "student-request-item"
                );
            }else{
                item.classList.add(
                    "staff-scheduled-item"
                );
            }

            item.dataset.appointmentId=
                appointment.appointment_id;

            item.dataset.status=
                appointment.status||
                "Pending";

            item.dataset.source=
                appointment.request_source||
                "";

            item.dataset.requestSource=
                appointment.request_source||
                "";

            item.dataset.studentId=
                appointment.student_id||
                "";

            item.dataset.date=
                appointment.scheduled_date||
                "";

            item.dataset.time=
                appointment.scheduled_time||
                "";

            item.dataset.reason=
                appointment.reason||
                "";

            item.dataset.notes=
                appointment.notes||
                "";

            item.dataset.counselorId=
                appointment.counselor_id
                    ?`teacher:${appointment.counselor_id}`
                    :appointment.counselor_admin_id
                        ?`admin:${appointment.counselor_admin_id}`
                        :"";

            item.dataset.search=`
                ${appointment.student_name||""}
                ${appointment.student_code||""}
                ${appointment.counselor_name||""}
                ${appointment.reason||""}
            `;

            const source=
                appointment.request_source==="Student"
                    ?`
                        <div class="appointment-source student-request">
                            <span>🧑‍🎓</span>

                            <div>
                                <strong>
                                    STUDENT REQUESTED SUPPORT
                                </strong>

                                <small>
                                    The student asked for a support session.
                                    Schedule a date and time.
                                </small>
                            </div>
                        </div>
                    `
                    :`
                        <div class="appointment-source staff-scheduled">
                            <span>🧑‍🏫</span>

                            <div>
                                <strong>
                                    SCHEDULED BY STAFF
                                </strong>

                                <small>
                                    This appointment was arranged by
                                    an admin or counselor.
                                </small>
                            </div>
                        </div>
                    `;

            const hasSchedule=
                Boolean(
                    appointment.scheduled_date&&
                    appointment.scheduled_time
                );

            const scheduleInfo=
                hasSchedule
                    ?`
                        <div>
                            <span>Date</span>
                            <strong>
                                ${formatDate(
                                    appointment.scheduled_date
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Time</span>
                            <strong>
                                ${formatTime(
                                    appointment.scheduled_time
                                )}
                            </strong>
                        </div>
                    `
                    :`
                        <div class="not-scheduled">
                            <span>Date</span>
                            <strong>
                                Not scheduled
                            </strong>
                        </div>

                        <div class="not-scheduled">
                            <span>Time</span>
                            <strong>
                                Needs scheduling
                            </strong>
                        </div>
                    `;

            const actionButtons=
                appointment.status==="Pending"||
                appointment.status==="Confirmed"
                    ?`
                        <div class="appointment-action-buttons">

                            ${
                                appointment.request_source==="Student"&&
                                !hasSchedule
                                    ?`
                                        <button
                                            type="button"
                                            class="appointment-action schedule appointment-schedule"
                                            data-id="${appointment.appointment_id}"
                                        >
                                            📅 Schedule Request
                                        </button>
                                    `
                                    :""
                            }

                            ${
                                hasSchedule
                                    ?`
                                        <button
                                            type="button"
                                            class="appointment-action edit appointment-edit"
                                            data-id="${appointment.appointment_id}"
                                        >
                                            ✎ Edit Date & Time
                                        </button>
                                    `
                                    :""
                            }

                            <button
                                type="button"
                                class="appointment-action cancel"
                                data-id="${appointment.appointment_id}"
                                data-status="Cancelled"
                            >
                                Cancel
                            </button>

                            ${
                                hasSchedule
                                    ?`
                                        <button
                                            type="button"
                                            class="appointment-action complete"
                                            data-id="${appointment.appointment_id}"
                                            data-status="Completed"
                                        >
                                            ✓ Completed
                                        </button>
                                    `
                                    :""
                            }

                        </div>
                    `
                    :"";

            const studentFirstName=
                appointment.student_first_name||
                (appointment.student_name||"Student")
                    .split(" ")[0]||
                "S";

            const studentLastName=
                appointment.student_last_name||
                "";

            const avatar=
                `${studentFirstName.charAt(0)}${studentLastName.charAt(0)}`;

            item.innerHTML=`
                <span class="appointment-sequence">
                    #${index+1}
                </span>

                <div class="appointment-main">

                    ${source}

                    <div class="appointment-student">
                        <div class="appointment-avatar">
                            ${escapeHtml(avatar.toUpperCase())}
                        </div>

                        <div>
                            <strong>
                                ${escapeHtml(
                                    appointment.student_name||
                                    "Student"
                                )}
                            </strong>

                            <span>
                                ${escapeHtml(
                                    appointment.student_code||
                                    ""
                                )}
                                · Grade
                                ${escapeHtml(
                                    String(
                                        appointment.grade_level||
                                        ""
                                    )
                                )}
                                ·
                                ${escapeHtml(
                                    appointment.section||
                                    ""
                                )}
                            </span>
                        </div>
                    </div>

                    <div class="appointment-meta">

                        ${scheduleInfo}

                        <div>
                            <span>Counselor</span>

                            <strong>
                                ${escapeHtml(
                                    appointment.counselor_name||
                                    "Not assigned"
                                )}
                            </strong>
                        </div>

                    </div>

                    ${
                        appointment.baseline_assessment
                            ?`
                                <div class="baseline-pill">
                                    <span>
                                        Assessment #${escapeHtml(
                                            String(
                                                appointment.baseline_assessment.assessment_id
                                            )
                                        )}
                                    </span>

                                    <strong class="${String(
                                        appointment.baseline_assessment.risk_level||
                                        ""
                                    ).toLowerCase()}">
                                        ${escapeHtml(
                                            appointment.baseline_assessment.risk_level||
                                            "N/A"
                                        )}
                                        ·
                                        ${escapeHtml(
                                            String(
                                                appointment.baseline_assessment.percentage||
                                                "0"
                                            )
                                        )}%
                                    </strong>
                                </div>
                            `
                            :""
                    }

                    ${
                        appointment.reason
                            ?`
                                <div class="appointment-reason">
                                    <span>Reason</span>

                                    <p>
                                        ${escapeHtml(
                                            appointment.reason
                                        )}
                                    </p>
                                </div>
                            `
                            :""
                    }

                </div>

                <div class="appointment-actions">

                    <span class="appointment-status ${String(
                        appointment.status||
                        "Pending"
                    ).toLowerCase()}">
                        ${escapeHtml(
                            appointment.status||
                            "Pending"
                        )}
                    </span>

                    ${actionButtons}

                </div>
            `;

            appointmentList.appendChild(item);
        }
    );

    if(noFilterResults){
        appointmentList.appendChild(
            noFilterResults
        );
    }

    setupAppointmentActions();
    renderAppointments();
}

document
    .querySelectorAll(".appointment-filter")
    .forEach(button=>{
        button.addEventListener(
            "click",
            ()=>{
                document
                    .querySelectorAll(
                        ".appointment-filter"
                    )
                    .forEach(item=>{
                        item.classList.remove("active");
                    });

                button.classList.add("active");

                appointmentPage=1;

                renderAppointments();
            }
        );
    });

if(searchInput){
    searchInput.addEventListener(
        "input",
        ()=>{
            appointmentPage=1;
            renderAppointments();
        }
    );
}

if(sortSelect){
    sortSelect.addEventListener(
        "change",
        ()=>{
            appointmentPage=1;
            renderAppointments();
        }
    );
}

if(appointmentList){
    setupAppointmentActions();
    setDefaultFilter();
    renderAppointments();
}

startNotificationPolling();