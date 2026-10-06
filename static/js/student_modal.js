let selectedStudentId=null;

document.addEventListener("DOMContentLoaded",()=>{
    const closeButton=document.getElementById("closeStudentModal");
    const modal=document.getElementById("studentModal");

    if(closeButton){
        closeButton.addEventListener("click",closeStudentModal);
    }

    if(modal){
        modal.addEventListener("click",event=>{
            if(event.target===modal){
                closeStudentModal();
            }
        });
    }

    document.addEventListener("keydown",event=>{
        if(event.key==="Escape"){
            closeStudentModal();
        }
    });

    document.querySelectorAll(".student-modal-tab").forEach(tab=>{
        tab.addEventListener("click",()=>{
            switchStudentTab(tab.dataset.tab);
        });
    });

    const generateButton=document.getElementById(
        "generateTemporaryPassword"
    );

    if(generateButton){
        generateButton.addEventListener(
            "click",
            generateTemporaryPassword
        );
    }

    const copyButton=document.getElementById(
        "copyTemporaryPassword"
    );

    if(copyButton){
        copyButton.addEventListener("click",copyTemporaryPassword);
    }
});

function openStudentModal(id){
    const row=document.querySelector(
        `.student-row[data-id="${id}"]`
    );

    const modal=document.getElementById("studentModal");

    if(!row||!modal){
        return;
    }

    selectedStudentId=id;

    const name=row.dataset.name||"Student";
    const code=row.dataset.code||"—";
    const email=row.dataset.email||"Not provided";
    const age=row.dataset.age||"N/A";
    const grade=row.dataset.grade||"—";
    const section=row.dataset.section||"—";

    const nameElement=document.getElementById("modalStudentName");
    const classElement=document.getElementById("modalStudentClass");
    const avatarElement=document.getElementById("modalStudentAvatar");

    if(nameElement){
        nameElement.textContent=name;
    }

    if(classElement){
        classElement.textContent=`Grade ${grade} · ${section}`;
    }

    if(avatarElement){
        const parts=name.trim().split(/\s+/);

        avatarElement.textContent=
            (parts[0]?.[0]||"S")+
            (parts[parts.length-1]?.[0]||"T");
    }

    setText("profileStudentName",name);
    setText("profileStudentCode",code);
    setText("profileStudentEmail",email);
    setText("profileStudentAge",age);
    setText("profileStudentGrade",`Grade ${grade}`);
    setText("profileStudentSection",section);

    resetTemporaryPasswordDisplay();

    switchStudentTab("profile");

    modal.classList.remove("hidden");

    requestAnimationFrame(()=>{
        const closeButton=document.getElementById("closeStudentModal");

        if(closeButton){
            closeButton.focus();
        }
    });
}

function switchStudentTab(tab){
    document.querySelectorAll(".student-modal-tab").forEach(button=>{
        button.classList.toggle(
            "active",
            button.dataset.tab===tab
        );
    });

    document.querySelectorAll(".student-modal-tab-content").forEach(content=>{
        content.classList.remove("active");
    });

    if(tab==="profile"){
        document.getElementById(
            "studentProfileTab"
        )?.classList.add("active");
    }

    if(tab==="history"){
        document.getElementById(
            "studentHistoryTab"
        )?.classList.add("active");

        if(selectedStudentId){
            renderStudentHistory(
                selectedStudentId,
                studentData[selectedStudentId]||[]
            );
        }
    }
}

function closeStudentModal(){
    const modal=document.getElementById("studentModal");

    if(modal){
        modal.classList.add("hidden");
    }

    selectedStudentId=null;
    resetTemporaryPasswordDisplay();
}

function generateTemporaryPassword(){
    if(!selectedStudentId){
        return;
    }

    const button=document.getElementById(
        "generateTemporaryPassword"
    );

    const message=document.getElementById(
        "temporaryPasswordMessage"
    );

    if(button){
        button.disabled=true;
        button.textContent="Generating...";
    }

    fetch(`/teacher/student/${selectedStudentId}/temporary-password`,{
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        }
    })
    .then(response=>{
        return response.json().then(data=>({
            ok:response.ok,
            data:data
        }));
    })
    .then(result=>{
        if(!result.ok||!result.data.success){
            throw new Error(
                result.data.message||
                "Unable to generate temporary password."
            );
        }

        const password=result.data.temporary_password;

        const passwordText=document.getElementById(
            "temporaryPasswordText"
        );

        const passwordResult=document.getElementById(
            "temporaryPasswordResult"
        );

        if(passwordText){
            passwordText.textContent=password;
        }

        if(passwordResult){
            passwordResult.classList.remove("hidden");
        }

        showTemporaryPasswordMessage(
            "Temporary password generated successfully.",
            "success"
        );

        if(button){
            button.textContent="🔄 Generate New Temporary Password";
        }
    })
    .catch(error=>{
        showTemporaryPasswordMessage(
            error.message,
            "error"
        );

        if(button){
            button.textContent="🔐 Generate Temporary Password";
        }
    })
    .finally(()=>{
        if(button){
            button.disabled=false;
        }
    });
}

function copyTemporaryPassword(){
    const passwordText=document.getElementById(
        "temporaryPasswordText"
    );

    const button=document.getElementById(
        "copyTemporaryPassword"
    );

    if(!passwordText||!passwordText.textContent){
        return;
    }

    navigator.clipboard.writeText(
        passwordText.textContent
    ).then(()=>{
        if(button){
            button.textContent="Copied!";
        }

        setTimeout(()=>{
            if(button){
                button.textContent="Copy";
            }
        },1500);
    });
}

function resetTemporaryPasswordDisplay(){
    const result=document.getElementById(
        "temporaryPasswordResult"
    );

    const message=document.getElementById(
        "temporaryPasswordMessage"
    );

    const button=document.getElementById(
        "generateTemporaryPassword"
    );

    const passwordText=document.getElementById(
        "temporaryPasswordText"
    );

    if(result){
        result.classList.add("hidden");
    }

    if(message){
        message.className="temporary-password-message hidden";
        message.textContent="";
    }

    if(passwordText){
        passwordText.textContent="—";
    }

    if(button){
        button.disabled=false;
        button.textContent="🔐 Generate Temporary Password";
    }
}

function showTemporaryPasswordMessage(message,type){
    const element=document.getElementById(
        "temporaryPasswordMessage"
    );

    if(!element){
        return;
    }

    element.textContent=message;
    element.className=
        `temporary-password-message ${type}`;
}

function setText(id,value){
    const element=document.getElementById(id);

    if(element){
        element.textContent=value;
    }
}