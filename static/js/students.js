let completedStudents=0;
let highCount=0;
let moderateCount=0;
let studentData={};

document.addEventListener("DOMContentLoaded",()=>{
    loadStudents();

    const searchInput=document.getElementById("searchInput");

    if(searchInput){
        searchInput.addEventListener("input",()=>{
            applyCurrentFilters();
        });
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
            openStudent(row.dataset.id);
        });

        row.addEventListener("keydown",event=>{
            if(event.key==="Enter"||event.key===" "){
                event.preventDefault();
                openStudent(row.dataset.id);
            }
        });
    });

    const closeButton=document.getElementById("closeStudentModal");

    if(closeButton){
        closeButton.addEventListener("click",closeModal);
    }

    const modal=document.getElementById("studentModal");

    if(modal){
        modal.addEventListener("click",event=>{
            if(event.target===modal){
                closeModal();
            }
        });
    }
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

            const latestCycle=cycles.length>0
                ?cycles[0]
                :null;

            const latestResult=latestCycle
                ?(
                    latestCycle.retake_result||
                    latestCycle.initial_result
                )
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

                const assessmentCount=
                    row.querySelector(".assessment-count");

                if(assessmentCount){
                    assessmentCount.textContent=
                        countAssessments(cycles);
                }

                const latestScore=
                    row.querySelector(".latest-score");

                if(latestScore){
                    latestScore.textContent=latestResult
                        ?formatScore(latestResult.percentage)
                        :"—";
                }

                const badge=row.querySelector(".risk-badge");

                if(badge){

                    if(latestResult){

                        badge.className=
                            "risk-badge "+
                            getRiskClass(latestResult.risk_level);

                        badge.textContent=
                            latestResult.risk_level;

                    }else{

                        badge.className=
                            "risk-badge unknown";

                        badge.textContent=
                            "No Data";
                    }
                }
            }

            updateStats();
            applyCurrentFilters();
        })
        .catch(error=>{

            console.error(
                `Failed to load student ${id}:`,
                error
            );

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

            assessment_id:
                latest?.assessment_id||
                null,

            assessment_type:
                retake
                ?"retake"
                :"initial",

            has_retake:
                Boolean(retake),

            initial_result:
                initial,

            retake_result:
                retake,

            percentage:
                Number(
                    latest?.percentage||0
                ),

            risk_level:
                latest?.risk_level||
                "Low",

            submitted_at:
                latest?.submitted_at||
                ""
        };
    });

    cycles.sort((a,b)=>{

        const aDate=getAssessmentDate(
            a.retake_result||
            a.initial_result
        );

        const bDate=getAssessmentDate(
            b.retake_result||
            b.initial_result
        );

        if(aDate!==bDate){
            return bDate-aDate;
        }

        return Number(
            b.assessment_id||0
        )-
        Number(
            a.assessment_id||0
        );
    });

    return cycles.map((cycle,index)=>{

        return {
            ...cycle,

            cycle_number:
                cycles.length-index
        };
    });
}

function isInitialAssessment(assessment){

    if(!assessment){
        return false;
    }

    const type=String(
        assessment.assessment_type||""
    ).toLowerCase();

    return type==="initial"||type==="";
}

function isRetakeAssessment(assessment){

    if(!assessment){
        return false;
    }

    const type=String(
        assessment.assessment_type||""
    ).toLowerCase();

    return type==="retake";
}

function getAssessmentDate(assessment){

    if(!assessment){
        return 0;
    }

    const date=new Date(
        String(assessment.submitted_at||"")
            .replace(" ","T")
    );

    const time=date.getTime();

    if(Number.isFinite(time)){
        return time;
    }

    return Number(
        assessment.assessment_id||0
    );
}

function isEarlierAssessment(initial,retake){

    if(!initial||!retake){
        return false;
    }

    const initialDate=getAssessmentDate(initial);
    const retakeDate=getAssessmentDate(retake);

    if(initialDate&&retakeDate){
        return initialDate<retakeDate;
    }

    return Number(
        initial.assessment_id||0
    )<Number(
        retake.assessment_id||0
    );
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

        const students=document.querySelectorAll(
            ".student-row"
        ).length;

        total.textContent=
            `${completedStudents} / ${students}`;
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

    const activeFilter=document.querySelector(
        ".filter-btn.active"
    );

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

function openStudent(id){

    const data=studentData[id];

    const modal=document.getElementById("studentModal");
    const body=document.getElementById("studentModalBody");

    if(!modal||!body){
        return;
    }

    if(!data||data.length===0){

        body.innerHTML=`
            <p class="no-data">
                No assessment history available.
            </p>
        `;

        modal.classList.remove("hidden");
        return;
    }

    const latestCycle=data[0];

    const latestResult=
        latestCycle.retake_result||
        latestCycle.initial_result;

    const initial=latestCycle.initial_result;
    const retake=latestCycle.retake_result;

    let scoreChange=null;
    let riskChange=null;

    if(initial&&retake){

        scoreChange=
            Number(retake.percentage)-
            Number(initial.percentage);

        riskChange=
            getRiskChange(
                initial.risk_level,
                retake.risk_level
            );
    }

    const cycleNumber=
        latestCycle.cycle_number||1;

    let interventionComparison="";

    if(initial&&retake){

        interventionComparison=`

        <div class="intervention-comparison">

            <div class="comparison-header">

                <div>

                    <span class="comparison-label">
                        LATEST INTERVENTION CYCLE
                    </span>

                    <h3>
                        Before and After Support
                    </h3>

                </div>

                <span class="cycle-badge">
                    Cycle ${cycleNumber}
                </span>

            </div>

            <div class="comparison-grid">

                <div class="comparison-card before">

                    <div class="comparison-card-header">

                        <span>
                            Before Support
                        </span>

                        <span class="comparison-date">
                            ${escapeHTML(initial.submitted_at)}
                        </span>

                    </div>

                    <div class="comparison-score">
                        ${formatScore(initial.percentage)}
                    </div>

                    <span class="risk-badge ${getRiskClass(initial.risk_level)}">
                        ${escapeHTML(initial.risk_level)}
                    </span>

                </div>

                <div class="comparison-arrow">
                    →
                </div>

                <div class="comparison-card after">

                    <div class="comparison-card-header">

                        <span>
                            After Support
                        </span>

                        <span class="comparison-date">
                            ${escapeHTML(retake.submitted_at)}
                        </span>

                    </div>

                    <div class="comparison-score">
                        ${formatScore(retake.percentage)}
                    </div>

                    <span class="risk-badge ${getRiskClass(retake.risk_level)}">
                        ${escapeHTML(retake.risk_level)}
                    </span>

                </div>

            </div>

            <div class="comparison-result">

                <div class="change-item">

                    <span>
                        Score Change
                    </span>

                    <strong class="${getScoreChangeClass(scoreChange)}">
                        ${formatScoreChange(scoreChange)}
                    </strong>

                </div>

                <div class="change-item">

                    <span>
                        Risk Change
                    </span>

                    <strong>
                        ${escapeHTML(riskChange)}
                    </strong>

                </div>

            </div>

        </div>

        ${buildCategoryComparison(initial,retake)}

        `;

    }else if(initial){

        interventionComparison=`

        <div class="intervention-comparison">

            <div class="comparison-header">

                <div>

                    <span class="comparison-label">
                        CURRENT ASSESSMENT CYCLE
                    </span>

                    <h3>
                        Initial Assessment
                    </h3>

                </div>

                <span class="cycle-badge">
                    Cycle ${cycleNumber}
                </span>

            </div>

            <div class="single-assessment-card">

                <div>

                    <span class="comparison-label">
                        ASSESSMENT RESULT
                    </span>

                    <div class="comparison-score">
                        ${formatScore(initial.percentage)}
                    </div>

                    <span class="risk-badge ${getRiskClass(initial.risk_level)}">
                        ${escapeHTML(initial.risk_level)}
                    </span>

                </div>

                <div class="assessment-date">

                    <span>
                        Submitted
                    </span>

                    <strong>
                        ${escapeHTML(initial.submitted_at)}
                    </strong>

                </div>

            </div>

            <div class="no-retake-note">

                <span>ℹ️</span>

                <p>
                    No post-intervention assessment is available
                    for this cycle yet. A retake will appear here
                    once the student completes the follow-up assessment.
                </p>

            </div>

        </div>

        `;

    }else if(retake){

        interventionComparison=`

        <div class="intervention-comparison">

            <div class="comparison-header">

                <div>

                    <span class="comparison-label">
                        POST-INTERVENTION ASSESSMENT
                    </span>

                    <h3>
                        Retake Result
                    </h3>

                </div>

                <span class="cycle-badge">
                    Cycle ${cycleNumber}
                </span>

            </div>

            <div class="single-assessment-card">

                <div>

                    <span class="comparison-label">
                        RETAKE RESULT
                    </span>

                    <div class="comparison-score">
                        ${formatScore(retake.percentage)}
                    </div>

                    <span class="risk-badge ${getRiskClass(retake.risk_level)}">
                        ${escapeHTML(retake.risk_level)}
                    </span>

                </div>

                <div class="assessment-date">

                    <span>
                        Submitted
                    </span>

                    <strong>
                        ${escapeHTML(retake.submitted_at)}
                    </strong>

                </div>

            </div>

        </div>

        `;
    }

    const history=
        buildAssessmentHistory(data);

    body.innerHTML=`

        <div class="student-modal-summary">

            <div class="modal-summary-item">

                <span>
                    Latest Score
                </span>

                <strong>
                    ${
                        latestResult
                        ?formatScore(latestResult.percentage)
                        :"—"
                    }
                </strong>

            </div>

            <div class="modal-summary-item">

                <span>
                    Current Risk
                </span>

                ${
                    latestResult
                    ?`
                    <span class="risk-badge ${getRiskClass(latestResult.risk_level)}">
                        ${escapeHTML(latestResult.risk_level)}
                    </span>
                    `
                    :`
                    <strong>—</strong>
                    `
                }

            </div>

            <div class="modal-summary-item">

                <span>
                    Total Attempts
                </span>

                <strong>
                    ${countAssessments(data)}
                </strong>

            </div>

        </div>

        ${interventionComparison}

        <h3 class="history-title">
            Assessment History
        </h3>

        ${history}

    `;

    modal.classList.remove("hidden");

    requestAnimationFrame(()=>{

        const closeButton=
            document.getElementById("closeStudentModal");

        if(closeButton){
            closeButton.focus();
        }

    });
}

function buildCategoryComparison(initial,retake){

    if(!initial||!retake){
        return "";
    }

    const categories=[
        "School",
        "Home",
        "Social Lifestyle"
    ];

    const rows=categories.map(category=>{

        const before=initial.categories
            ?initial.categories[category]
            :null;

        const after=retake.categories
            ?retake.categories[category]
            :null;

        const beforeValue=before
            ?Number(before.percentage)
            :null;

        const afterValue=after
            ?Number(after.percentage)
            :null;

        if(
            !Number.isFinite(beforeValue)&&
            !Number.isFinite(afterValue)
        ){
            return "";
        }

        const change=
            Number.isFinite(beforeValue)&&
            Number.isFinite(afterValue)
            ?afterValue-beforeValue
            :null;

        return`

            <div class="category-comparison-row">

                <div class="category-name">

                    <span>
                        ${getCategoryIcon(category)}
                    </span>

                    <strong>
                        ${escapeHTML(category)}
                    </strong>

                </div>

                <div class="category-score before-score">

                    <span>
                        Before
                    </span>

                    <strong>
                        ${formatScore(beforeValue)}
                    </strong>

                </div>

                <div class="category-arrow">
                    →
                </div>

                <div class="category-score after-score">

                    <span>
                        After
                    </span>

                    <strong>
                        ${formatScore(afterValue)}
                    </strong>

                </div>

                <div class="category-change ${getScoreChangeClass(change)}">

                    ${formatScoreChange(change)}

                </div>

            </div>

        `;
    }).join("");

    if(!rows){
        return "";
    }

    return`

        <div class="category-comparison">

            <div class="comparison-section-header">

                <span class="comparison-label">
                    CATEGORY PROGRESS
                </span>

                <h3>
                    Areas Before and After Support
                </h3>

            </div>

            <div class="category-comparison-list">

                ${rows}

            </div>

            <p class="category-help">
                A positive change means the student's score
                increased after the intervention.
            </p>

        </div>

    `;
}

function buildAssessmentHistory(data){

    if(!Array.isArray(data)||data.length===0){

        return`
            <p class="no-data">
                No assessment history available.
            </p>
        `;
    }

    let rows=[];

    data.forEach((cycle,index)=>{

        const cycleNumber=
            cycle.cycle_number||
            (data.length-index);

        if(cycle.initial_result){

            rows.push({

                type:"Initial",

                label:"Before Support",

                date:
                    cycle.initial_result.submitted_at,

                risk:
                    cycle.initial_result.risk_level,

                score:
                    cycle.initial_result.percentage,

                cycle:
                    cycleNumber
            });
        }

        if(cycle.retake_result){

            rows.push({

                type:"Retake",

                label:"After Support",

                date:
                    cycle.retake_result.submitted_at,

                risk:
                    cycle.retake_result.risk_level,

                score:
                    cycle.retake_result.percentage,

                cycle:
                    cycleNumber
            });
        }
    });

    rows.sort((a,b)=>{

        if(a.cycle!==b.cycle){
            return b.cycle-a.cycle;
        }

        if(a.type===b.type){
            return 0;
        }

        return a.type==="Retake"
            ?-1
            :1;
    });

    if(rows.length===0){

        return`
            <p class="no-data">
                No assessment history available.
            </p>
        `;
    }

    return`

        <table class="history-table">

            <thead>

                <tr>

                    <th>Cycle</th>
                    <th>Stage</th>
                    <th>Date</th>
                    <th>Risk Level</th>
                    <th>Score</th>

                </tr>

            </thead>

            <tbody>

                ${rows.map(item=>`

                    <tr>

                        <td>
                            Cycle ${item.cycle}
                        </td>

                        <td>
                            ${item.label}
                        </td>

                        <td>
                            ${escapeHTML(item.date)}
                        </td>

                        <td>

                            <span class="risk-badge ${getRiskClass(item.risk)}">
                                ${escapeHTML(item.risk)}
                            </span>

                        </td>

                        <td>
                            ${formatScore(item.score)}
                        </td>

                    </tr>

                `).join("")}

            </tbody>

        </table>

    `;
}

function getRiskChange(before,after){

    if(!before||!after){
        return "—";
    }

    if(before===after){
        return `No change (${after})`;
    }

    const order={
        "High":3,
        "Moderate":2,
        "Low":1
    };

    if(
        order[after]&&
        order[before]&&
        order[after]<order[before]
    ){
        return `${before} → ${after} (Improved)`;
    }

    if(
        order[after]&&
        order[before]&&
        order[after]>order[before]
    ){
        return `${before} → ${after} (Increased)`;
    }

    return `${before} → ${after}`;
}

function getScoreChangeClass(change){

    if(!Number.isFinite(change)){
        return "";
    }

    if(change>0){
        return "positive";
    }

    if(change<0){
        return "negative";
    }

    return "neutral";
}

function formatScoreChange(change){

    if(!Number.isFinite(change)){
        return "—";
    }

    const rounded=Math.round(change);

    if(rounded>0){
        return `+${rounded}%`;
    }

    return `${rounded}%`;
}

function getRiskClass(risk){

    if(!risk){
        return "unknown";
    }

    return String(risk).toLowerCase();
}

function getCategoryIcon(category){

    if(category==="School"){
        return "📚";
    }

    if(category==="Home"){
        return "🏡";
    }

    if(category==="Social Lifestyle"){
        return "🤝";
    }

    return "💡";
}

function escapeHTML(value){

    return String(value??"")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}

function closeModal(){

    const modal=document.getElementById("studentModal");

    if(modal){
        modal.classList.add("hidden");
    }
}