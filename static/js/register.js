document.addEventListener("DOMContentLoaded", async () => {

    const firstName = document.getElementById("firstName");
    const lastName = document.getElementById("lastName");
    const grade = document.getElementById("grade");
    const section = document.getElementById("section");
    const email = document.getElementById("generatedEmail");
    const password = document.getElementById("password");
    const togglePassword = document.getElementById("togglePassword");
    const form = document.getElementById("registerForm");
    const goLoginBtn = document.getElementById("goLoginBtn");
    const closeErrorBtn = document.getElementById("closeErrorBtn");


    let gradeSectionMap = {};


async function loadSections(){

    try{

        const response = await fetch(
            "/api/grade-sections"
        );

        gradeSectionMap = await response.json();


        grade.innerHTML = `
            <option value="">
                Select Grade
            </option>
        `;


        Object.keys(gradeSectionMap)
        .sort()
        .forEach(level=>{

            const option =
                document.createElement("option");


            option.value = level;

            option.textContent =
                `Grade ${level}`;


            grade.appendChild(option);

        });


    }
    catch(error){

        console.error(
            "Failed loading grade sections:",
            error
        );

    }

}


    function updateSection(){

        const selectedGrade = grade.value;


        section.innerHTML = `
            <option value="">
                Select Section
            </option>
        `;


        if(!selectedGrade)
            return;


        const sections =
            gradeSectionMap[selectedGrade] || [];


        sections.forEach(sectionName=>{

            const option =
                document.createElement("option");


            option.value = sectionName;

            option.textContent = sectionName;


            section.appendChild(option);

        });

    }



    function updateEmail(){

        const first =
            firstName.value
            .trim()
            .toLowerCase()
            .replace(/\s+/g,"");


        const last =
            lastName.value
            .trim()
            .toLowerCase()
            .replace(/\s+/g,"");


        if(!first || !last){

            email.value="";

            return;

        }


        email.value =
            `${first}.${last}@sparkcheck.edu`;

    }



    grade.addEventListener(
        "change",
        updateSection
    );


    firstName.addEventListener(
        "input",
        updateEmail
    );


    lastName.addEventListener(
        "input",
        updateEmail
    );



    togglePassword.addEventListener(
        "click",
        ()=>{


            if(password.type==="password"){

                password.type="text";

                togglePassword.textContent="🙈";

            }
            else{

                password.type="password";

                togglePassword.textContent="👁";

            }

        }
    );



    if(closeErrorBtn){

        closeErrorBtn.addEventListener(
            "click",
            ()=>{

                const modal =
                    document.getElementById(
                        "errorModal"
                    );


                if(modal)
                    modal.remove();

            }
        );

    }



    if(form){

        form.addEventListener(
            "submit",
            event=>{


                let error="";


                if(!firstName.value.trim()){

                    error="Please enter your first name.";

                }
                else if(!lastName.value.trim()){

                    error="Please enter your last name.";

                }
                else if(!grade.value){

                    error="Please select your grade level.";

                }
                else if(!section.value){

                    error="Please select your section.";

                }
                else if(password.value.length<6){

                    error="Password must be at least 6 characters.";

                }



                if(error){

                    event.preventDefault();

                    alert(error);

                }

            }
        );

    }



    if(goLoginBtn){

        goLoginBtn.addEventListener(
            "click",
            ()=>{

                const registeredEmail =
                    goLoginBtn.dataset.email;


                window.location.href =
                    `/login?email=${encodeURIComponent(
                        registeredEmail
                    )}`;

            }
        );

    }



    await loadSections();

    updateSection();

    updateEmail();

});