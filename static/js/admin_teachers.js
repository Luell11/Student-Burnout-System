const teacherModal=document.getElementById("teacherModal");
const addTeacherModal=document.getElementById("addTeacherModal");
const teacherDetails=document.getElementById("teacherDetails");

const openAddTeacher=document.getElementById("openAddTeacher");
const closeAddTeacher=document.getElementById("closeAddTeacher");
const closeModal=document.getElementById("closeModal");

const teacherTableBody=document.getElementById("teacherTableBody");
const teacherCount=document.getElementById("teacherCount");
const teacherForm=document.getElementById("teacherForm");
const toastContainer=document.getElementById("toastContainer");

const confirmModal=document.getElementById("confirmModal");
const confirmTitle=document.getElementById("confirmTitle");
const confirmMessage=document.getElementById("confirmMessage");
const confirmProceed=document.getElementById("confirmProceed");
const confirmCancel=document.getElementById("confirmCancel");
const confirmCancelTop=document.getElementById("confirmCancelTop");

let confirmCallback=null;

function showConfirm(title,message,callback,action="confirm"){
    if(!confirmModal){
        if(window.confirm(message)){
            callback();
        }
        return;
    }

    confirmTitle.textContent=title;
    confirmMessage.textContent=message;

    confirmProceed.textContent=
        action==="delete" ? "Delete Teacher" : "Add Teacher";

    confirmProceed.className=
        action==="delete" ? "danger-btn" : "primary-btn";

    confirmCallback=callback;

    confirmModal.classList.add("show");
}

function closeConfirm(){
    if(!confirmModal){
        return;
    }

    confirmModal.classList.remove("show");
    confirmCallback=null;
}

if(confirmProceed){
    confirmProceed.addEventListener("click",async()=>{
        if(!confirmCallback){
            closeConfirm();
            return;
        }

        const callback=confirmCallback;

        closeConfirm();

        await callback();
    });
}

if(confirmCancel){
    confirmCancel.addEventListener("click",closeConfirm);
}

if(confirmCancelTop){
    confirmCancelTop.addEventListener("click",closeConfirm);
}

if(confirmModal){
    confirmModal.addEventListener("click",e=>{
        if(e.target===confirmModal){
            closeConfirm();
        }
    });
}

function showToast(message,type="success"){
    if(!toastContainer){
        alert(message);
        return;
    }

    const toast=document.createElement("div");

    toast.className=`toast ${type}`;

    const icon=
        type==="success"
        ? "✓"
        : "!"

    const title=
        type==="success"
        ? "Success"
        : "Error";

    toast.innerHTML=`
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <strong>${title}</strong>
            <span>${message}</span>
        </div>
        <button class="toast-close" type="button">×</button>
    `;

    toastContainer.appendChild(toast);

    const closeToast=()=>{
        if(!toast.parentNode){
            return;
        }

        toast.classList.remove("show");

        setTimeout(()=>{
            if(toast.parentNode){
                toast.remove();
            }
        },300);
    };

    const closeButton=toast.querySelector(".toast-close");

    if(closeButton){
        closeButton.addEventListener("click",closeToast);
    }

    requestAnimationFrame(()=>{
        toast.classList.add("show");
    });

    setTimeout(closeToast,8000);
}

if(openAddTeacher){
    openAddTeacher.addEventListener("click",()=>{
        addTeacherModal.classList.add("show");
    });
}

if(closeAddTeacher){
    closeAddTeacher.addEventListener("click",()=>{
        addTeacherModal.classList.remove("show");
    });
}

if(closeModal){
    closeModal.addEventListener("click",()=>{
        teacherModal.classList.remove("show");
    });
}

window.addEventListener("click",e=>{
    if(e.target===teacherModal){
        teacherModal.classList.remove("show");
    }

    if(e.target===addTeacherModal){
        addTeacherModal.classList.remove("show");
    }

    if(e.target===confirmModal){
        closeConfirm();
    }
});

document.addEventListener("keydown",e=>{
    if(e.key!=="Escape"){
        return;
    }

    if(confirmModal && confirmModal.classList.contains("show")){
        closeConfirm();
        return;
    }

    if(addTeacherModal && addTeacherModal.classList.contains("show")){
        addTeacherModal.classList.remove("show");
        return;
    }

    if(teacherModal && teacherModal.classList.contains("show")){
        teacherModal.classList.remove("show");
    }
});

async function openTeacherModal(id){
    try{
        const response=await fetch(`/admin/teacher/${id}`);
        const data=await response.json();

        if(!response.ok){
            showToast(
                data.message||"Unable to load teacher details.",
                "error"
            );
            return;
        }

        let html=`
            <div class="teacher-detail-header">
                <div>
                    <span class="detail-kicker">TEACHER PROFILE</span>
                    <h2>${data.teacher}</h2>
                    <p>Grade ${data.grade} - ${data.section}</p>
                </div>
            </div>

            <div class="credentials-box">
                <div>
                    <strong>Teacher Login</strong>
                    <span>${data.email}</span>
                </div>

                <div>
                    <strong>Teacher Code</strong>
                    <span>${data.teacher_code}</span>
                </div>

                <div>
                    <strong>Default Password</strong>
                    <span>${data.password}</span>
                </div>
            </div>

            <div class="teacher-info">
                <div>
                    <strong>Total Students</strong>
                    <span>${data.students}</span>
                </div>

                <div>
                    <strong>Students Assessed</strong>
                    <span>${data.completed}</span>
                </div>

                <div>
                    <strong>Total Attempts</strong>
                    <span>${data.attempts||0}</span>
                </div>
            </div>

            <div class="detail-section">
                <h3>Student Assessment Overview</h3>
                <p class="detail-description">
                    Each student is shown using their latest assessment result.
                </p>
            </div>

            <div class="student-table-wrapper">
                <table class="student-table">
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Status</th>
                            <th>Latest Risk</th>
                        </tr>
                    </thead>

                    <tbody>
        `;

        if(!data.student_list || !data.student_list.length){

            html+=`
                <tr>
                    <td colspan="3">
                        <div class="empty-state small">
                            <span>🌱</span>
                            <strong>No students assigned</strong>
                            <p>
                                This teacher does not have any students yet.
                            </p>
                        </div>
                    </td>
                </tr>
            `;

        }else{

            data.student_list.forEach(student=>{

                let badge="none";

                if(student.risk==="High"){
                    badge="high";
                }
                else if(student.risk==="Moderate"){
                    badge="moderate";
                }
                else if(student.risk==="Low"){
                    badge="low";
                }

                const statusClass=
                    student.completed
                    ? "low"
                    : "none";

                const statusText=
                    student.completed
                    ? "Completed"
                    : "Pending";

                html+=`
                    <tr>
                        <td>
                            <strong>${student.name}</strong>
                        </td>

                        <td>
                            <span class="badge ${statusClass}">
                                ${statusText}
                            </span>
                        </td>

                        <td>
                            <span class="badge ${badge}">
                                ${student.risk||"No Assessment"}
                            </span>
                        </td>
                    </tr>
                `;
            });
        }

        html+=`
                    </tbody>
                </table>
            </div>
        `;

        teacherDetails.innerHTML=html;

        teacherModal.classList.add("show");

    }catch(error){

        console.error(error);

        showToast(
            "Unable to load teacher details.",
            "error"
        );
    }
}

async function deleteTeacher(deleteBtn,row,teacherName){

    deleteBtn.disabled=true;
    deleteBtn.textContent="Deleting...";

    try{

        const response=await fetch(
            `/admin/delete-teacher/${deleteBtn.dataset.id}`,
            {
                method:"POST"
            }
        );

        const data=await response.json();

        if(!data.success){

            showToast(
                data.message||"Failed to delete teacher.",
                "error"
            );

            deleteBtn.disabled=false;
            deleteBtn.textContent="Delete";

            return;
        }

        row.remove();

        teacherCount.textContent=Math.max(
            0,
            Number(teacherCount.textContent)-1
        );

        const remainingRows=
            teacherTableBody.querySelectorAll(".teacher-row");

        if(!remainingRows.length){

            const existingEmpty=
                document.getElementById("emptyTeacherRow");

            if(!existingEmpty){

                const emptyRow=
                    document.createElement("tr");

                emptyRow.id="emptyTeacherRow";

                emptyRow.innerHTML=`
                    <td colspan="5">
                        <div class="empty-state">
                            <span>👩‍🏫</span>
                            <h3>No Teachers Registered</h3>
                            <p>
                                Add a teacher to begin managing
                                assigned classes.
                            </p>
                        </div>
                    </td>
                `;

                teacherTableBody.appendChild(emptyRow);
            }
        }

        showToast(
            data.message||
            `${teacherName} was deleted successfully.`,
            "success"
        );

    }catch(error){

        console.error(error);

        showToast(
            "Server error. The teacher could not be deleted.",
            "error"
        );

        deleteBtn.disabled=false;
        deleteBtn.textContent="Delete";
    }
}

function attachRowEvents(row){

    row.addEventListener("click",e=>{

        if(e.target.closest(".delete-teacher")){
            return;
        }

        openTeacherModal(row.dataset.id);
    });

    const deleteBtn=
        row.querySelector(".delete-teacher");

    if(!deleteBtn){
        return;
    }

    deleteBtn.addEventListener("click",e=>{

        e.stopPropagation();

        const teacherName=
            row.querySelector("strong")?.textContent.trim()
            ||"this teacher";

        showConfirm(
            "Delete Teacher?",
            `Are you sure you want to delete ${teacherName}?

This will permanently delete the teacher, all students assigned to this teacher, and their assessment records.

This action cannot be undone.`,
            async()=>{
                await deleteTeacher(
                    deleteBtn,
                    row,
                    teacherName
                );
            },
            "delete"
        );
    });
}

document
    .querySelectorAll(".teacher-row")
    .forEach(attachRowEvents);

if(teacherForm){

    teacherForm.addEventListener("submit",e=>{

        e.preventDefault();

        const firstName=
            document.getElementById("firstName")
            .value.trim();

        const middleInitial=
            document.getElementById("middleInitial")?.value.trim()
            ||"";

        const lastName=
            document.getElementById("lastName")
            .value.trim();

        const gradeLevel=
            document.getElementById("gradeSelect")
            .value;

        const section=
            document.getElementById("section")
            .value.trim();

        if(
            !firstName||
            !lastName||
            !gradeLevel||
            !section
        ){

            showToast(
                "Please complete all required teacher fields.",
                "error"
            );

            return;
        }

        showConfirm(
            "Add Teacher?",
            `Add ${firstName} ${lastName} as the teacher for Grade ${gradeLevel} - ${section}?

A teacher account will be created with a generated email and default password.`,
            async()=>{
                await addTeacher(
                    firstName,
                    middleInitial,
                    lastName,
                    gradeLevel,
                    section
                );
            },
            "add"
        );
    });
}

async function addTeacher(
    firstName,
    middleInitial,
    lastName,
    gradeLevel,
    section
){

    const submitButton=
        document.getElementById("submitTeacher");

    submitButton.disabled=true;
    submitButton.textContent="Adding...";

    try{

        const response=
            await fetch("/admin/add-teacher",{

                method:"POST",

                headers:{
                    "Content-Type":"application/json"
                },

                body:JSON.stringify({

                    first_name:firstName,

                    middle_initial:
                        middleInitial,

                    last_name:lastName,

                    grade_level:
                        gradeLevel,

                    section:section
                })
            });

        const data=
            await response.json();

        if(!data.success){

            showToast(
                data.message||
                "Failed to add teacher.",
                "error"
            );

            return;
        }

        const teacher=
            data.teacher;

        const emptyRow=
            document.getElementById(
                "emptyTeacherRow"
            );

        if(emptyRow){
            emptyRow.remove();
        }

        const row=
            document.createElement("tr");

        row.className="teacher-row";

        row.dataset.id=
            teacher.teacher_id;

        row.innerHTML=`
            <td>
                <strong>
                    ${teacher.teacher_name}
                </strong>

                <small>
                    Code: ${teacher.teacher_code}
                </small>
            </td>

            <td>
                Grade ${teacher.grade}
                -
                ${teacher.section}
            </td>

            <td>
                <span class="table-number">0</span>
                students
            </td>

            <td>
                <span class="table-number">0</span>
                attempts
            </td>

            <td>
                <button
                    class="delete-btn delete-teacher"
                    data-id="${teacher.teacher_id}"
                    type="button">

                    Delete

                </button>
            </td>
        `;

        teacherTableBody.appendChild(row);

        attachRowEvents(row);

        teacherCount.textContent=
            Number(teacherCount.textContent)+1;

        teacherForm.reset();

        addTeacherModal.classList.remove("show");

        showToast(
            `Teacher added successfully. Login email: ${teacher.email} | Default password: ${teacher.password}`,
            "success"
        );

    }catch(error){

        console.error(error);

        showToast(
            "Server error. The teacher could not be added.",
            "error"
        );

    }finally{

        submitButton.disabled=false;

        submitButton.textContent=
            "Add Teacher";
    }
}