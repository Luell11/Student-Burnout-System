function renderStudentHistory(id,data){
    const body=document.getElementById("studentModalBody");

    if(!body){
        return;
    }

    if(!data||data.length===0){
        body.innerHTML=`
            <div class="history-empty">
                <span>📊</span>
                <h3>No Assessment History</h3>
                <p>This student has not completed an assessment yet.</p>
            </div>
        `;
        return;
    }

    const latestCycle=data[0];

    const latestResult=
        latestCycle.retake_result||
        latestCycle.initial_result;

    const initial=latestCycle.initial_result;
    const retake=latestCycle.retake_result;

    let interventionComparison="";

    if(initial&&retake){
        const scoreChange=
            Number(retake.percentage)-
            Number(initial.percentage);

        const riskChange=getRiskChange(
            initial.risk_level,
            retake.risk_level
        );

        interventionComparison=`

            <div class="intervention-comparison">

                <div class="comparison-header">

                    <div>
                        <span class="comparison-label">
                            LATEST INTERVENTION CYCLE
                        </span>

                        <h3>Before and After Support</h3>
                    </div>

                    <span class="cycle-badge">
                        Cycle ${latestCycle.cycle_number||1}
                    </span>

                </div>

                <div class="comparison-grid">

                    <div class="comparison-card before">

                        <div class="comparison-card-header">
                            <span>Before Support</span>

                            <span class="comparison-date">
                                ${escapeHTML(initial.submitted_at)}
                            </span>
                        </div>

                        <div class="comparison-score">
                            ${formatHistoryScore(initial.percentage)}
                        </div>

                        <span class="risk-badge ${getHistoryRiskClass(initial.risk_level)}">
                            ${escapeHTML(initial.risk_level)}
                        </span>

                    </div>

                    <div class="comparison-arrow">→</div>

                    <div class="comparison-card after">

                        <div class="comparison-card-header">
                            <span>After Support</span>

                            <span class="comparison-date">
                                ${escapeHTML(retake.submitted_at)}
                            </span>
                        </div>

                        <div class="comparison-score">
                            ${formatHistoryScore(retake.percentage)}
                        </div>

                        <span class="risk-badge ${getHistoryRiskClass(retake.risk_level)}">
                            ${escapeHTML(retake.risk_level)}
                        </span>

                    </div>

                </div>

                <div class="comparison-result">

                    <div class="change-item">
                        <span>Score Change</span>
                        <strong class="${getScoreChangeClass(scoreChange)}">
                            ${formatScoreChange(scoreChange)}
                        </strong>
                    </div>

                    <div class="change-item">
                        <span>Risk Change</span>
                        <strong>${escapeHTML(riskChange)}</strong>
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

                        <h3>Initial Assessment</h3>
                    </div>

                    <span class="cycle-badge">
                        Cycle ${latestCycle.cycle_number||1}
                    </span>

                </div>

                <div class="single-assessment-card">

                    <div>
                        <span class="comparison-label">
                            ASSESSMENT RESULT
                        </span>

                        <div class="comparison-score">
                            ${formatHistoryScore(initial.percentage)}
                        </div>

                        <span class="risk-badge ${getHistoryRiskClass(initial.risk_level)}">
                            ${escapeHTML(initial.risk_level)}
                        </span>
                    </div>

                    <div class="assessment-date">
                        <span>Submitted</span>
                        <strong>${escapeHTML(initial.submitted_at)}</strong>
                    </div>

                </div>

                <div class="no-retake-note">
                    <span>ℹ️</span>
                    <p>
                        No post-intervention assessment is available
                        for this cycle yet.
                    </p>
                </div>

            </div>
        `;
    }

    const history=buildAssessmentHistory(data);

    body.innerHTML=`

        <div class="student-modal-summary">

            <div class="modal-summary-item">
                <span>Latest Score</span>
                <strong>
                    ${latestResult
                        ?formatHistoryScore(latestResult.percentage)
                        :"—"}
                </strong>
            </div>

            <div class="modal-summary-item">

                <span>Current Risk</span>

                ${latestResult
                    ?`
                    <span class="risk-badge ${getHistoryRiskClass(latestResult.risk_level)}">
                        ${escapeHTML(latestResult.risk_level)}
                    </span>
                    `
                    :"<strong>—</strong>"
                }

            </div>

            <div class="modal-summary-item">
                <span>Total Attempts</span>
                <strong>${countHistoryAssessments(data)}</strong>
            </div>

        </div>

        ${interventionComparison}

        <h3 class="history-title">
            Assessment History
        </h3>

        ${history}
    `;
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
                    <span>${getCategoryIcon(category)}</span>
                    <strong>${escapeHTML(category)}</strong>
                </div>

                <div class="category-score before-score">
                    <span>Before</span>
                    <strong>${formatHistoryScore(beforeValue)}</strong>
                </div>

                <div class="category-arrow">→</div>

                <div class="category-score after-score">
                    <span>After</span>
                    <strong>${formatHistoryScore(afterValue)}</strong>
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

                <h3>Areas Before and After Support</h3>

            </div>

            <div class="category-comparison-list">
                ${rows}
            </div>

            <p class="category-help">
                A positive change means the student's score increased
                after the intervention.
            </p>

        </div>
    `;
}

function buildAssessmentHistory(data){
    const rows=[];

    data.forEach((cycle,index)=>{
        const cycleNumber=
            cycle.cycle_number||
            (data.length-index);

        if(cycle.initial_result){
            rows.push({
                type:"Initial",
                label:"Before Support",
                date:cycle.initial_result.submitted_at,
                risk:cycle.initial_result.risk_level,
                score:cycle.initial_result.percentage,
                cycle:cycleNumber
            });
        }

        if(cycle.retake_result){
            rows.push({
                type:"Retake",
                label:"After Support",
                date:cycle.retake_result.submitted_at,
                risk:cycle.retake_result.risk_level,
                score:cycle.retake_result.percentage,
                cycle:cycleNumber
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

        return a.type==="Retake"?-1:1;
    });

    if(rows.length===0){
        return`
            <p class="no-data">
                No assessment history available.
            </p>
        `;
    }

    return`

        <div class="history-table-wrapper">

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

                            <td>Cycle ${item.cycle}</td>

                            <td>${item.label}</td>

                            <td>${escapeHTML(item.date)}</td>

                            <td>
                                <span class="risk-badge ${getHistoryRiskClass(item.risk)}">
                                    ${escapeHTML(item.risk)}
                                </span>
                            </td>

                            <td>${formatHistoryScore(item.score)}</td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>
    `;
}

function countHistoryAssessments(data){
    let count=0;

    data.forEach(cycle=>{
        if(cycle.initial_result){
            count++;
        }

        if(cycle.retake_result){
            count++;
        }
    });

    return count;
}

function formatHistoryScore(value){
    const number=Number(value);

    if(!Number.isFinite(number)){
        return "—";
    }

    return `${Math.round(number)}%`;
}

function getHistoryRiskClass(risk){
    if(!risk){
        return "unknown";
    }

    return String(risk).toLowerCase();
}

function getRiskChange(before,after){
    if(!before||!after){
        return "—";
    }

    if(before===after){
        return `No change (${after})`;
    }

    const order={
        High:3,
        Moderate:2,
        Low:1
    };

    if(order[after]<order[before]){
        return `${before} → ${after} (Improved)`;
    }

    if(order[after]>order[before]){
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

    return rounded>0
        ?`+${rounded}%`
        :`${rounded}%`;
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