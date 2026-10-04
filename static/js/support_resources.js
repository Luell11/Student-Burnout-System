const supportData={
    school:{
        title:"📚 When School Feels Difficult",
        icon:"📚",
        description:"Schoolwork can sometimes feel like a lot. You do not have to finish everything at once.",
        tips:[
            ["📝","Start Small","Break a big assignment into smaller steps and work on one step at a time."],
            ["⏰","Make a Simple Plan","Write down what you need to finish today instead of trying to remember everything."],
            ["☕","Take Short Breaks","Give your mind a short break between study activities."],
            ["🙋","Ask for Help","If you do not understand something, ask your teacher, parent, or another trusted adult."]
        ]
    },
    home:{
        title:"🏠 When Home Responsibilities Feel Difficult",
        icon:"🏠",
        description:"Home life can include chores, responsibilities, and other challenges. It is okay to ask for support.",
        tips:[
            ["😴","Make Time for Rest","Try to give yourself enough time to rest after school and responsibilities."],
            ["🍽️","Look After Yourself","Remember regular meals, water, movement, and time to relax."],
            ["💬","Talk About Problems","Tell a trusted adult when something at home is making things difficult."],
            ["⚖️","Find Balance","Try to make time for school, responsibilities, hobbies, and rest."]
        ]
    },
    social:{
        title:"🤝 When Friendships Feel Difficult",
        icon:"🤝",
        description:"Friendships can sometimes be confusing or stressful. You deserve relationships where you feel respected and supported.",
        tips:[
            ["💬","Talk to Someone","Tell a trusted person when a friendship problem is bothering you."],
            ["🛑","Respect Boundaries","It is okay to say no when something makes you uncomfortable."],
            ["💙","Choose Supportive Friends","Spend time with people who treat you with kindness and respect."],
            ["📱","Take a Break","If social media is making you feel overwhelmed, take some time away from it."]
        ]
    },
    help:{
        title:"🗣️ When You Feel Like You Need Help",
        icon:"🗣️",
        description:"Asking for help is not a weakness. Talking to a trusted adult can make a difficult situation easier to handle.",
        tips:[
            ["👨‍👩‍👧","Tell a Parent or Guardian","Let them know what is bothering you and how you are feeling."],
            ["👩‍🏫","Talk to a Teacher","A teacher can listen and help you find the right person to talk to."],
            ["🧑‍⚕️","Talk to a Counselor","School counselors and qualified professionals can provide additional support."],
            ["💙","Keep Talking","If the first person cannot help, try talking to another trusted adult."]
        ]
    }
};

let appointmentToastTimer=null;

function showSupport(type,button){
    const data=supportData[type];

    if(!data)return;

    document.getElementById("supportTitle").textContent=data.title;
    document.getElementById("personalIcon").textContent=data.icon;
    document.getElementById("supportDescription").textContent=data.description;

    document.querySelectorAll(".support-choice").forEach(choice=>{
        choice.classList.remove("selected");
    });

    if(button){
        button.classList.add("selected");
    }

    const container=document.getElementById("supportTips");

    container.innerHTML=data.tips.map(tip=>`
        <div class="support-tip">
            <div class="tip-icon">${tip[0]}</div>
            <div>
                <h3>${tip[1]}</h3>
                <p>${tip[2]}</p>
            </div>
        </div>
    `).join("");
}

function showAppointmentToast(message,type="success",duration=5000){
    const container=document.getElementById("toastContainer");

    if(!container)return;

    if(appointmentToastTimer){
        clearTimeout(appointmentToastTimer);
        appointmentToastTimer=null;
    }

    const oldToast=container.querySelector(".toast");

    if(oldToast){
        oldToast.remove();
    }

    const toast=document.createElement("div");

    toast.className=`toast ${type}`;
    toast.textContent=message;
    toast.style.opacity="1";
    toast.style.visibility="visible";
    toast.style.display="block";

    container.appendChild(toast);

    appointmentToastTimer=setTimeout(()=>{
        if(!toast.parentNode){
            appointmentToastTimer=null;
            return;
        }

        toast.classList.add("hide");

        setTimeout(()=>{
            if(toast.parentNode){
                toast.remove();
            }
        },400);

        appointmentToastTimer=null;
    },duration);
}

function escapeHtml(value){
    const div=document.createElement("div");
    div.textContent=value??"";
    return div.innerHTML;
}

function renderAppointmentContent(appointments){
    const container=document.getElementById("studentAppointmentContent");
    const intro=document.getElementById("appointmentIntro");

    if(!container)return;

    const activeAppointments=appointments.filter(appointment=>
        appointment.status==="Pending"||
        appointment.status==="Confirmed"
    );

    if(activeAppointments.length){
        const appointment=activeAppointments[0];

        if(appointment.date&&appointment.time){
            intro.textContent="A counselor has scheduled a support session for you.";

            container.innerHTML=`
                <div class="student-appointment-card">
                    <div class="student-appointment-status ${appointment.status.toLowerCase()}">
                        ${appointment.status==="Confirmed"?"✓ Confirmed":"⏳ Pending"}
                    </div>

                    <div class="student-appointment-main">
                        <div class="student-appointment-icon">🧑‍🏫</div>

                        <div class="student-appointment-details">
                            <span class="appointment-label">YOUR SUPPORT SESSION</span>
                            <h3>Appointment with ${escapeHtml(appointment.counselor)}</h3>

                            <div class="student-appointment-info">
                                <div>
                                    <span>📅 Date</span>
                                    <strong>${escapeHtml(appointment.date)}</strong>
                                </div>

                                <div>
                                    <span>🕐 Time</span>
                                    <strong>${escapeHtml(appointment.time)}</strong>
                                </div>

                                <div>
                                    <span>👤 Support Person</span>
                                    <strong>${escapeHtml(appointment.counselor_role)}</strong>
                                </div>
                            </div>

                            <p class="student-appointment-reason">
                                ${escapeHtml(appointment.reason)}
                            </p>
                        </div>
                    </div>

                    <div class="student-appointment-message">
                        💙 Your support session has been scheduled. If you are unsure about anything, talk to a trusted adult or your school counselor.
                    </div>
                </div>
            `;

            return;
        }

        intro.textContent="Your support request has been received and is waiting for a counselor to arrange a session.";

        container.innerHTML=`
            <div class="student-request-pending">
                <div class="student-request-icon">⏳</div>
                <div>
                    <span class="appointment-label">SUPPORT REQUEST RECEIVED</span>
                    <h3>A counselor has not scheduled a time yet.</h3>
                    <p>Your request is waiting to be arranged. You can check this page again later for an appointment update.</p>
                </div>

                <span class="student-appointment-status pending">Pending</span>
            </div>
        `;

        return;
    }

    intro.textContent="Would you like to talk with a counselor or trusted school support person?";

    container.innerHTML=`
        <div class="student-support-request">
            <div class="student-support-request-icon">💬</div>

            <div class="student-support-request-content">
                <span class="appointment-label">NEED SOMEONE TO TALK TO?</span>
                <h3>Ask for Counselor Support</h3>
                <p>
                    If you would like to talk with a counselor about something
                    you're experiencing at school, home, with friends, or in
                    everyday life, you can send a support request here.
                </p>

                <button type="button" class="support-request-btn" id="requestSupportBtn">
                    🧑‍🏫 Request Counselor Support
                </button>
            </div>
        </div>
    `;

    const requestButton=document.getElementById("requestSupportBtn");

    if(requestButton){
        requestButton.addEventListener(
            "click",
            requestCounselorSupport
        );
    }
}

async function loadStudentAppointments(){
    const container=document.getElementById("studentAppointmentContent");
    const intro=document.getElementById("appointmentIntro");

    if(!container)return;

    try{
        const response=await fetch(
            "/student/support/appointments",
            {
                method:"GET",
                credentials:"same-origin",
                cache:"no-store"
            }
        );

        const data=await response.json();

        if(!response.ok||!data.success){
            throw new Error(
                data.message||
                "Unable to load appointment information."
            );
        }

        renderAppointmentContent(
            data.appointments||[]
        );

    }catch(error){
        if(intro){
            intro.textContent="We could not load your appointment information right now.";
        }

        container.innerHTML=`
            <div class="student-appointment-error">
                <span>⚠️</span>
                <div>
                    <h3>Unable to load support information</h3>
                    <p>Please try refreshing the page later.</p>
                </div>
            </div>
        `;
    }
}

async function requestCounselorSupport(){
    const button=document.getElementById("requestSupportBtn");

    if(!button)return;

    if(button.disabled)return;

    button.disabled=true;
    button.textContent="Sending Request...";

    try{
        const response=await fetch(
            "/student/support/request",
            {
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },
                credentials:"same-origin",
                cache:"no-store",
                body:JSON.stringify({
                    reason:"Student requested support"
                })
            }
        );

        const data=await response.json();

        if(!response.ok||!data.success){
            throw new Error(
                data.message||
                "Unable to send your support request."
            );
        }

        showAppointmentToast(
            data.message||
            "Your counselor support request has been sent.",
            "success",
            5000
        );

        await loadStudentAppointments();

    }catch(error){
        button.disabled=false;
        button.textContent="🧑‍🏫 Request Counselor Support";

        showAppointmentToast(
            error.message||
            "Unable to send your support request.",
            "error",
            5000
        );
    }
}

document.addEventListener("DOMContentLoaded",()=>{
    document.querySelectorAll(".support-choice").forEach(button=>{
        button.addEventListener("click",()=>{
            showSupport(
                button.dataset.support,
                button
            );
        });
    });

    const selectedButton=document.querySelector(
        ".support-choice.selected"
    );

    showSupport(
        "school",
        selectedButton
    );

    loadStudentAppointments();
});