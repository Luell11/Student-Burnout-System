let completedStudents=0;
let highCount=0;
let moderateCount=0;
let studentData={};

document.addEventListener("DOMContentLoaded",()=>{
    loadStudents();

    const searchInput=document.getElementById("searchInput");

    if(searchInput){
        searchInput.addEventListener("input",applyCurrentFilters);
    }

    document.querySelectorAll(".filter-btn").forEach(button=>{
        button.addEventListener("click",()=>{
            document.querySelectorAll(".filter-btn")
                .forEach(btn=>btn.classList.remove("active"));

            button.classList.add("active");
            applyCurrentFilters();
        });
    });

    document.querySelectorAll(".student-row").forEach(row=>{
        row.addEventListener("click",()=>{
            openStudentModal(row.dataset.id);
        });

        row.addEventListener("keydown",event=>{
            if(event.key==="Enter"||event.key===" "){
                event.preventDefault();
                openStudentModal(row.dataset.id);
            }
        });
    });
});

function loadStudents(){
    completedStudents=0;
    highCount=0;
    moderateCount=0;
    studentData={};

    const rows=document.querySelectorAll(".student-row");

    if(rows.length===0){
        updateStats();
        return;
    }

    rows.forEach(row=>{
        loadStudent(row.dataset.id);
    });
}

function loadStudent(id){
    fetch(`/teacher/student/${id}/attempts`)
        .then(response=>{
            if(!response.ok){
                throw new Error("Unable to load student attempts.");
            }

            return response.json();
        })
        .then(data=>{
            if(!Array.isArray(data)){
                studentData[id]=[];
                updateStats();
                return;
            }

            const cycles=normalizeCycles(data);

            studentData[id]=cycles;

            const row=document.querySelector(
                `.student-row[data-id="${id}"]`
            );

            const latestCycle=cycles.length>0?cycles[0]:null;

            const latestResult=latestCycle
                ?(latestCycle.retake_result||latestCycle.initial_result)
                :null;

            if(cycles.length>0){
                completedStudents++;
            }

            if(latestResult){
                if(latestResult.risk_level==="High"){
                    highCount++;
                }

                if(latestResult.risk_level==="Moderate"){
                    moderateCount++;
                }
            }

            if(row){
                row.dataset.risk=latestResult
                    ?getRiskClass(latestResult.risk_level)
                    :"none";

                const assessmentCount=row.querySelector(".assessment-count");

                if(assessmentCount){
                    assessmentCount.textContent=countAssessments(cycles);
                }

                const latestScore=row.querySelector(".latest-score");

                if(latestScore){
                    latestScore.textContent=latestResult
                        ?formatScore(latestResult.percentage)
                        :"—";
                }

                const badge=row.querySelector(".risk-badge");

                if(badge){
                    if(latestResult){
                        badge.className="risk-badge "+getRiskClass(latestResult.risk_level);
                        badge.textContent=latestResult.risk_level;
                    }else{
                        badge.className="risk-badge unknown";
                        badge.textContent="No Data";
                    }
                }
            }

            updateStats();
            applyCurrentFilters();
        })
        .catch(error=>{
            console.error(`Failed to load student ${id}:`,error);

            studentData[id]=[];

            updateStats();
            applyCurrentFilters();
        });
}

function normalizeCycles(data){
    if(!Array.isArray(data)||data.length===0){
        return [];
    }

    const cycles=data.map((item,index)=>{
        const initial=item.initial_result||null;
        const retake=item.retake_result||null;
        const latest=retake||initial;

        return {
            cycle_id:
                item.cycle_id||
                initial?.assessment_id||
                retake?.assessment_id||
                null,
            cycle_number:
                item.cycle_number||
                (data.length-index),
            assessment_id:latest?.assessment_id||null,
            assessment_type:retake?"retake":"initial",
            has_retake:Boolean(retake),
            initial_result:initial,
            retake_result:retake,
            percentage:Number(latest?.percentage||0),
            risk_level:latest?.risk_level||"Low",
            submitted_at:latest?.submitted_at||""
        };
    });

    cycles.sort((a,b)=>{
        const aDate=getAssessmentDate(
            a.retake_result||a.initial_result
        );

        const bDate=getAssessmentDate(
            b.retake_result||b.initial_result
        );

        if(aDate!==bDate){
            return bDate-aDate;
        }

        return Number(b.assessment_id||0)-Number(a.assessment_id||0);
    });

    return cycles.map((cycle,index)=>({
        ...cycle,
        cycle_number:cycles.length-index
    }));
}

function getAssessmentDate(assessment){
    if(!assessment){
        return 0;
    }

    const date=new Date(
        String(assessment.submitted_at||"").replace(" ","T")
    );

    const time=date.getTime();

    return Number.isFinite(time)
        ?time
        :Number(assessment.assessment_id||0);
}

function countAssessments(cycles){
    let count=0;

    cycles.forEach(cycle=>{
        if(cycle.initial_result){
            count++;
        }

        if(cycle.retake_result){
            count++;
        }
    });

    return count;
}

function formatScore(value){
    const number=Number(value);

    if(!Number.isFinite(number)){
        return "—";
    }

    return `${Math.round(number)}%`;
}

function updateStats(){
    const total=document.getElementById("totalAssessments");

    if(total){
        const students=document.querySelectorAll(".student-row").length;

        total.textContent=`${completedStudents} / ${students}`;
    }

    const high=document.getElementById("highCount");

    if(high){
        high.textContent=highCount;
    }

    const moderate=document.getElementById("moderateCount");

    if(moderate){
        moderate.textContent=moderateCount;
    }
}

function applyCurrentFilters(){
    const searchInput=document.getElementById("searchInput");

    const search=searchInput
        ?searchInput.value.toLowerCase().trim()
        :"";

    const activeFilter=document.querySelector(".filter-btn.active");

    const filter=activeFilter
        ?activeFilter.dataset.filter
        :"all";

    document.querySelectorAll(".student-row").forEach(row=>{
        const name=(row.dataset.name||"").toLowerCase();
        const code=(row.dataset.code||"").toLowerCase();
        const risk=row.dataset.risk||"none";

        const matchesSearch=
            name.includes(search)||
            code.includes(search);

        const matchesFilter=
            filter==="all"||
            risk===filter;

        row.style.display=
            matchesSearch&&matchesFilter
            ?""
            :"none";
    });
}

function getRiskClass(risk){
    if(!risk){
        return "unknown";
    }

    return String(risk).toLowerCase();
}