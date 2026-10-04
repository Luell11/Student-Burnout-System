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


function showToast(message,type="success"){

    if(!toastContainer){
        alert(message);
        return;
    }

    const toast=document.createElement("div");

    toast.className=`toast ${type}`;

    toast.textContent=message;

    toast.style.userSelect="text";
    toast.style.cursor="text";
    toast.style.pointerEvents="auto";

    toastContainer.appendChild(toast);

    requestAnimationFrame(()=>{
        toast.classList.add("show");
    });

    setTimeout(()=>{

        toast.classList.remove("show");

        setTimeout(()=>{

            toast.remove();

        },300);

    },8000);

}


openAddTeacher.addEventListener("click",()=>{
    addTeacherModal.classList.add("show");
});


closeAddTeacher.addEventListener("click",()=>{
    addTeacherModal.classList.remove("show");
});


closeModal.addEventListener("click",()=>{
    teacherModal.classList.remove("show");
});


window.addEventListener("click",e=>{

    if(e.target===teacherModal){
        teacherModal.classList.remove("show");
    }

    if(e.target===addTeacherModal){
        addTeacherModal.classList.remove("show");
    }

});



async function openTeacherModal(id){

    const response=await fetch(`/admin/teacher/${id}`);

    const data=await response.json();


    let html=`

    <h2>${data.teacher}</h2>


    <div class="credentials-box">

        <h4>Teacher Login Credentials</h4>

        <p>
            <strong>Email:</strong>
            ${data.email}
        </p>

        <p>
            <strong>Password:</strong>
            ${data.password}
        </p>

    </div>



<div class="teacher-info">

<div>
    <strong>Total Students</strong>
    <span>${data.students}</span>
</div>

<div>
    <strong>Completed Assessments</strong>
    <span>${data.completed}</span>
</div>

<div>
    <strong>Total Attempts</strong>
    <span>${data.attempts ?? 0}</span>
</div>

</div>



    <h3>Student Assessment Overview</h3>


    <div class="student-table-wrapper">

    <table class="student-table">

    <thead>

    <tr>
        <th>Student</th>
        <th>Status</th>
        <th>Risk</th>
    </tr>

    </thead>


    <tbody>

    `;


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


        html+=`

        <tr>

            <td>
                ${student.name}
            </td>


            <td>

                <span class="badge ${student.completed?"low":"none"}">

                    ${student.completed?"Completed":"Pending"}

                </span>

            </td>


            <td>

                <span class="badge ${badge}">

                    ${student.risk}

                </span>

            </td>


        </tr>

        `;

    });



    html+=`

    </tbody>

    </table>

    </div>

    `;


    teacherDetails.innerHTML=html;

    teacherModal.classList.add("show");

}




function attachRowEvents(row){


    row.addEventListener("click",e=>{

        if(e.target.closest(".delete-teacher"))
            return;


        openTeacherModal(row.dataset.id);

    });



    const deleteBtn=row.querySelector(".delete-teacher");


    deleteBtn.addEventListener("click",async e=>{


        e.stopPropagation();


        if(!confirm("Delete teacher?"))
            return;



        const response=await fetch(
            `/admin/delete-teacher/${deleteBtn.dataset.id}`,
            {
                method:"POST"
            }
        );


        const data=await response.json();



        if(!data.success){

            showToast(data.message,"error");

            return;

        }



        row.remove();



        teacherCount.textContent=
            Number(teacherCount.textContent)-1;



        showToast(data.message);


    });


}



document.querySelectorAll(".teacher-row")
.forEach(attachRowEvents);




teacherForm.addEventListener("submit",async e=>{

    e.preventDefault();


    const submitButton=document.getElementById("submitTeacher");

    submitButton.disabled=true;
    submitButton.textContent="Adding...";


    try{


        const response=await fetch("/admin/add-teacher",{

            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },


            body:JSON.stringify({

                first_name:
                document.getElementById("firstName").value.trim(),

                middle_initial:
                document.getElementById("middleInitial").value.trim(),

                last_name:
                document.getElementById("lastName").value.trim(),

                grade_level:
                document.getElementById("gradeSelect").value,

                section:
                document.getElementById("section").value.trim()

            })

        });



        const data=await response.json();



        if(!data.success){

            showToast(
                data.message || "Failed to add teacher.",
                "error"
            );

            return;

        }



        const teacher=data.teacher;



        const row=document.createElement("tr");


        row.className="teacher-row";

        row.dataset.id=teacher.teacher_id;



        row.innerHTML=`

        <td>

            <strong>
                ${teacher.teacher_name}
            </strong>

            <br>

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
            0 students
        </td>


        <td>
            0 attempts
        </td>


        <td>

            <button class="delete-btn delete-teacher"
                    data-id="${teacher.teacher_id}">

                Delete

            </button>

        </td>

        `;



        teacherTableBody.appendChild(row);



        attachRowEvents(row);



        teacherCount.textContent =
            Number(teacherCount.textContent)+1;



        teacherForm.reset();


        addTeacherModal.classList.remove("show");



        showToast(
            "Teacher added successfully.",
            "success"
        );


    }
    catch(error){


        showToast(
            "Server error. Please try again.",
            "error"
        );


    }
    finally{


        submitButton.disabled=false;

        submitButton.textContent="Add Teacher";


    }

});



function toggleCredentials(){

    const box=document.getElementById("teacherCredentials");

    if(box){
        box.classList.toggle("show");
    }

}