let allStudents=reportStudents||[];
let allAssessments=[];
let allAssessmentHistory=[];
let riskChart=null;
let scoreChart=null;
let factorChart=null;
let trendChart=null;
let reportTargetHandled=false;

document.addEventListener("DOMContentLoaded",()=>{
    initializeChartToggles();
    loadReportData();
    createConcernModal();
});

function shouldScrollToAttention(){
    return new URLSearchParams(window.location.search).get("section")==="attention";
}

function scrollToStudentsRequiringAttention(){
    if(!shouldScrollToAttention()||reportTargetHandled)return;

    const target=document.getElementById("studentsRequiringAttention");
    if(!target)return;

    requestAnimationFrame(()=>{
        requestAnimationFrame(()=>{
            target.scrollIntoView({
                behavior:"smooth",
                block:"start"
            });
            reportTargetHandled=true;
        });
    });
}

function immediateAttentionScroll(){
    if(!shouldScrollToAttention()||reportTargetHandled)return;

    let attempts=0;

    const findAndScroll=()=>{
        const target=document.getElementById("studentsRequiringAttention");

        if(!target){
            if(attempts++<20){
                requestAnimationFrame(findAndScroll);
            }
            return;
        }

        requestAnimationFrame(()=>{
            requestAnimationFrame(()=>{
                requestAnimationFrame(()=>{
                    target.scrollIntoView({
                        behavior:"smooth",
                        block:"start"
                    });
                    reportTargetHandled=true;
                });
            });
        });
    };

    requestAnimationFrame(findAndScroll);
}

function loadReportData(){
    if(allStudents.length===0){
        document.getElementById("insightsContainer").innerHTML=
            '<p class="no-data">No students are currently assigned to this class.</p>';

        document.getElementById("summaryText").textContent=
            "No assessment data available.";

        scrollToStudentsRequiringAttention();
        return;
    }

    let completed=0;
    let studentData={};

    allStudents.forEach(student=>{
        fetch(`/teacher/student/${student.id}/attempts`)
            .then(response=>{
                if(!response.ok){
                    throw new Error("Failed to load assessment data");
                }

                return response.json();
            })
            .then(data=>{
                studentData[student.id]=Array.isArray(data)?data:[];

                completed++;

                if(completed===allStudents.length){
                    processReportData(studentData);
                }
            })
            .catch(()=>{
                studentData[student.id]=[];

                completed++;

                if(completed===allStudents.length){
                    processReportData(studentData);
                }
            });
    });
}

function processReportData(studentData){
    let high=0;
    let moderate=0;
    let low=0;
    let noAssessment=0;
    let scores=[];

    allAssessments=[];
    allAssessmentHistory=[];

    allStudents.forEach(student=>{
        const attempts=Array.isArray(studentData[student.id])
            ?studentData[student.id]
            :[];

        if(attempts.length===0){
            noAssessment++;
            return;
        }

        const normalizedAttempts=attempts
            .map(attempt=>normalizeAssessment(student,attempt))
            .filter(Boolean);

        normalizedAttempts.forEach(attempt=>{
            allAssessmentHistory.push(attempt);
        });

        if(normalizedAttempts.length===0){
            noAssessment++;
            return;
        }

        const latest=normalizedAttempts[0];

        if(
            !hasCategoryData(latest.categories)&&
            normalizedAttempts.length>1
        ){
            const previousWithCategories=
                normalizedAttempts.find(
                    attempt=>hasCategoryData(attempt.categories)
                );

            if(previousWithCategories){
                latest.categories=cloneCategories(
                    previousWithCategories.categories
                );

                latest.categorySource="previous_attempt";
                latest.categorySourceDate=
                    previousWithCategories.date||"";
            }
        }

        if(latest.riskLevel==="High"){
            high++;
        }else if(latest.riskLevel==="Moderate"){
            moderate++;
        }else if(latest.riskLevel==="Low"){
            low++;
        }

        if(Number.isFinite(latest.score)){
            scores.push(latest.score);
        }

        allAssessments.push(latest);
    });

    const totalStudents=allStudents.length;
    const completedStudents=totalStudents-noAssessment;

    const completionPercent=
        totalStudents===0
            ?0
            :Math.round(
                completedStudents/totalStudents*100
            );

    document.getElementById("completionRate").textContent=
        completionPercent+"%";

    const completionText=document.getElementById("completionText");

    if(completionText){
        completionText.textContent=
            `${completedStudents} of ${totalStudents} students assessed`;
    }

    document.getElementById("highRiskCount").textContent=high;
    document.getElementById("moderateRiskCount").textContent=moderate;
    document.getElementById("lowRiskCount").textContent=low;

    document.getElementById("highRiskPercent").textContent=
        percent(high,totalStudents);

    document.getElementById("moderateRiskPercent").textContent=
        percent(moderate,totalStudents);

    document.getElementById("lowRiskPercent").textContent=
        percent(low,totalStudents);

    let wellnessStatus="";
    let recommendation="";

    if(high>=Math.ceil(totalStudents*.30)){
        wellnessStatus="Critical";
        recommendation=
            "Several students require immediate intervention and individual follow-up.";
    }else if(high+moderate>=Math.ceil(totalStudents*.40)){
        wellnessStatus="Needs Attention";
        recommendation=
            "Class wellness should be closely monitored through regular check-ins.";
    }else{
        wellnessStatus="Generally Healthy";
        recommendation=
            "Overall class wellness is positive. Continue monitoring and reinforcing healthy habits.";
    }

    document.getElementById("summaryText").textContent=
        `${completedStudents} of ${totalStudents} students completed the latest wellness assessment. ${high} High Risk, ${moderate} Moderate Risk and ${low} Low Risk students were identified. Overall class wellness is currently classified as "${wellnessStatus}". ${recommendation}`;

    updateCharts(
        high,
        moderate,
        low,
        noAssessment,
        scores
    );

    updateStressFactorChart();
    updateTrendChart();

    updateInsights(
        high,
        moderate,
        low,
        noAssessment,
        totalStudents
    );

    updateRecommendations();
    updateRiskTable(allAssessments);
    updateAssessmentTable(allAssessments);

    requestAnimationFrame(()=>{
        scrollToStudentsRequiringAttention();
    });
}

function normalizeAssessment(student,attempt){

    if(!attempt)return null;

    const score=Number(
        attempt.percentage ??
        attempt.score ??
        attempt.overall_percentage
    );

    if(!Number.isFinite(score)){
        return null;
    }

    let rawCategories=
        attempt.categories ??
        attempt.category_scores ??
        attempt.category_results ??
        attempt.stress_factors ??
        attempt.factors;

    if(
        !rawCategories &&
        reportAnalytics &&
        reportAnalytics.latest_categories_by_student
    ){

        rawCategories=
            reportAnalytics.latest_categories_by_student[
                String(student.id)
            ] ??
            reportAnalytics.latest_categories_by_student[
                student.id
            ];
    }

    const categories=
        normalizeCategories(
            rawCategories
        );

    return{

        studentId:
            student.id,

        name:
            student.name,

        code:
            student.code,

        riskLevel:
            attempt.risk_level||
            attempt.riskLevel||
            "Low",

        score:
            score,

        date:
            attempt.submitted_at||
            attempt.date||
            attempt.created_at||
            "",

        categories:
            categories,

        categorySource:
            hasCategoryData(categories)
                ?(
                    rawCategories===
                    attempt.categories||
                    rawCategories===
                    attempt.category_scores||
                    rawCategories===
                    attempt.category_results||
                    rawCategories===
                    attempt.stress_factors||
                    rawCategories===
                    attempt.factors
                        ?"latest_attempt"
                        :"reports_data"
                )
                :"latest_attempt",

        categorySourceDate:
            attempt.submitted_at||
            attempt.date||
            attempt.created_at||
            ""

    };
}

function normalizeCategories(categories){
    const result={};

    const categoryNames=[
        "School",
        "Home",
        "Social Lifestyle"
    ];

    if(!categories||typeof categories!=="object"){
        return result;
    }

    categoryNames.forEach(category=>{
        let data=categories[category];

        if(!data){
            const normalizedKey=normalizeCategoryKey(category);

            const matchingKey=
                Object.keys(categories).find(
                    key=>normalizeCategoryKey(key)===normalizedKey
                );

            if(matchingKey){
                data=categories[matchingKey];
            }
        }

        if(!data||typeof data!=="object"){
            return;
        }

        const averageCandidates=[
            data.average,
            data.avg,
            data.average_score,
            data.mean,
            data.score
        ];

        let average=null;

        for(const candidate of averageCandidates){
            const value=Number(candidate);

            if(Number.isFinite(value)){
                average=value;
                break;
            }
        }

        let percentage=null;

        const percentageCandidates=[
            data.challenge_percentage,
            data.challengePercent,
            data.challenge_percentage_score,
            data.percentage,
            data.percent
        ];

        for(const candidate of percentageCandidates){
            const value=Number(candidate);

            if(Number.isFinite(value)){
                percentage=value;
                break;
            }
        }

        if(
            !Number.isFinite(average)&&
            !Number.isFinite(percentage)
        ){
            return;
        }

        if(Number.isFinite(average)){
            average=Math.max(
                0,
                Math.min(3,average)
            );
        }

        if(Number.isFinite(percentage)){
            percentage=Math.max(
                0,
                Math.min(100,percentage)
            );
        }

        result[category]={
            average:average,
            percentage:percentage,
            challenge_percentage:
                Number.isFinite(percentage)
                    ?percentage
                    :calculateChallengePercentage(average)
        };
    });

    return result;
}

function normalizeCategoryKey(value){
    return String(value||"")
        .toLowerCase()
        .replace(/[^a-z0-9]/g,"");
}

function hasCategoryData(categories){
    if(!categories||typeof categories!=="object"){
        return false;
    }

    return Object.keys(categories).some(
        category=>{
            const data=categories[category];

            if(!data||typeof data!=="object"){
                return false;
            }

            return(
                Number.isFinite(Number(data.average))||
                Number.isFinite(Number(data.challenge_percentage))||
                Number.isFinite(Number(data.percentage))
            );
        }
    );
}

function cloneCategories(categories){
    const cloned={};

    if(!categories||typeof categories!=="object"){
        return cloned;
    }

    Object.keys(categories).forEach(category=>{
        const data=categories[category];

        if(!data||typeof data!=="object"){
            return;
        }

        cloned[category]={
            average:
                Number.isFinite(Number(data.average))
                    ?Number(data.average)
                    :null,

            percentage:
                Number.isFinite(Number(data.percentage))
                    ?Number(data.percentage)
                    :null,

            challenge_percentage:
                Number.isFinite(
                    Number(data.challenge_percentage)
                )
                    ?Number(data.challenge_percentage)
                    :calculateChallengePercentage(
                        data.average
                    )
        };
    });

    return cloned;
}

function percent(value,total){
    if(total===0){
        return"0%";
    }

    return(
        (value/total*100).toFixed(0)
        +"%"
    );
}

function updateCharts(
    high,
    moderate,
    low,
    noAssessment,
    scores
){
    const riskCanvas=document.getElementById("riskChart");

    if(riskChart){
        riskChart.destroy();
        riskChart=null;
    }

    if(riskCanvas){
        riskChart=new Chart(riskCanvas,{
            type:"doughnut",

            data:{
                labels:[
                    "High Risk",
                    "Moderate Risk",
                    "Low Risk",
                    "No Assessment"
                ],

                datasets:[{
                    data:[
                        high,
                        moderate,
                        low,
                        noAssessment
                    ],

                    backgroundColor:[
                        "#dc2626",
                        "#f59e0b",
                        "#16a34a",
                        "#cbd5e1"
                    ],

                    borderColor:"#ffffff",
                    borderWidth:3,
                    hoverOffset:12
                }]
            },

            options:{
                responsive:true,
                maintainAspectRatio:false,

                plugins:{
                    legend:{
                        position:"bottom",
                        labels:{
                            usePointStyle:true,
                            padding:20
                        }
                    },

                    tooltip:{
                        callbacks:{
                            label(context){
                                const total=
                                    high+
                                    moderate+
                                    low+
                                    noAssessment;

                                const value=context.raw;

                                const p=
                                    total===0
                                        ?0
                                        :(value/total*100).toFixed(1);

                                return`${context.label}: ${value} student${value!==1?"s":""} (${p}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    const ranges={
        "0-20%":0,
        "21-40%":0,
        "41-60%":0,
        "61-80%":0,
        "81-100%":0
    };

    scores.forEach(score=>{
        if(score<=20){
            ranges["0-20%"]++;
        }else if(score<=40){
            ranges["21-40%"]++;
        }else if(score<=60){
            ranges["41-60%"]++;
        }else if(score<=80){
            ranges["61-80%"]++;
        }else{
            ranges["81-100%"]++;
        }
    });

    const scoreCanvas=document.getElementById("scoreChart");

    if(scoreChart){
        scoreChart.destroy();
        scoreChart=null;
    }

    if(scoreCanvas){
        scoreChart=new Chart(scoreCanvas,{
            type:"bar",

            data:{
                labels:Object.keys(ranges),

                datasets:[{
                    label:"Number of Students",
                    data:Object.values(ranges),
                    backgroundColor:"#3b82f6",
                    borderRadius:10,
                    maxBarThickness:55
                }]
            },

            options:{
                responsive:true,
                maintainAspectRatio:false,

                plugins:{
                    legend:{
                        display:false
                    },

                    tooltip:{
                        callbacks:{
                            title(context){
                                return`Score Range: ${context[0].label}`;
                            },

                            label(context){
                                const value=context.raw;

                                return`${value} student${value!==1?"s":""} achieved a score in this range`;
                            }
                        }
                    }
                },

                scales:{
                    x:{
                        title:{
                            display:true,
                            text:"Assessment Score Percentage"
                        }
                    },

                    y:{
                        beginAtZero:true,
                        ticks:{
                            precision:0
                        },

                        title:{
                            display:true,
                            text:"Number of Students"
                        }
                    }
                }
            }
        });
    }
}

function initializeChartToggles(){
    document.querySelectorAll(".chart-toggle").forEach(toggle=>{
        toggle.addEventListener("click",()=>{
            const chartName=toggle.dataset.chart;

            const panel=document.getElementById(
                chartName+"Panel"
            );

            if(!panel)return;

            const isOpen=
                panel.classList.contains("open");

            document
                .querySelectorAll(".chart-panel")
                .forEach(p=>{
                    p.classList.remove("open");
                });

            document
                .querySelectorAll(".chart-toggle")
                .forEach(t=>{
                    t.classList.remove("active");

                    t.setAttribute(
                        "aria-expanded",
                        "false"
                    );
                });

            if(isOpen){
                return;
            }

            panel.classList.add("open");
            toggle.classList.add("active");

            toggle.setAttribute(
                "aria-expanded",
                "true"
            );

            requestAnimationFrame(()=>{
                resizeActiveChart(chartName);
            });
        });
    });
}

function resizeActiveChart(chartName){
    let chart=null;

    if(chartName==="risk"){
        chart=riskChart;
    }else if(chartName==="score"){
        chart=scoreChart;
    }else if(chartName==="factor"){
        chart=factorChart;
    }else if(chartName==="trend"){
        chart=trendChart;
    }

    if(!chart)return;

    chart.resize();
    chart.update("none");
}

function calculateChallengePercentage(average){
    const numericAverage=Number(average);

    if(!Number.isFinite(numericAverage)){
        return null;
    }

    const clampedAverage=
        Math.max(
            0,
            Math.min(
                3,
                numericAverage
            )
        );

    return Math.max(
        0,
        Math.min(
            100,
            ((3-clampedAverage)/3)*100
        )
    );
}

function getCategoryChallenge(categoryData){
    if(!categoryData)return null;

    const explicitChallenge=
        Number(categoryData.challenge_percentage);

    if(Number.isFinite(explicitChallenge)){
        return Math.max(
            0,
            Math.min(100,explicitChallenge)
        );
    }

    const average=
        Number(categoryData.average);

    if(Number.isFinite(average)){
        return calculateChallengePercentage(average);
    }

    const percentage=
        Number(categoryData.percentage);

    if(Number.isFinite(percentage)){
        return Math.max(
            0,
            Math.min(100,100-percentage)
        );
    }

    return null;
}

function updateStressFactorChart(){

    const categories=[
        "School",
        "Home",
        "Social Lifestyle"
    ];

    const serverData=
        window.reportAnalytics||
        typeof reportAnalytics!=="undefined"
            ?reportAnalytics
            :null;

    const serverPercentages=
        serverData &&
        serverData.challenge_percentages
            ?serverData.challenge_percentages
            :{};

    const values=categories.map(category=>{

        const value=
            Number(
                serverPercentages[category]
            );

        return Number.isFinite(value)
            ?value
            :null;
    });

    if(factorChart){
        factorChart.destroy();
        factorChart=null;
    }

    const canvas=
        document.getElementById("factorChart");

    if(!canvas)return;

    const hasData=
        values.some(
            value=>value!==null
        );

    if(!hasData){

        const container=
            canvas.parentElement;

        container.innerHTML=`
            <div class="no-data">
                Category stress data is not available for the current assessments.
            </div>
            <canvas id="factorChart"></canvas>
        `;

        return;
    }

    const counts={
        "School":0,
        "Home":0,
        "Social Lifestyle":0
    };

    allAssessments.forEach(student=>{

        const studentCategories=
            student.categories||{};

        categories.forEach(category=>{

            const categoryData=
                studentCategories[category];

            if(!categoryData)return;

            const challenge=
                getCategoryChallenge(
                    categoryData
                );

            if(Number.isFinite(challenge)){
                counts[category]++;
            }

        });

    });

    factorChart=new Chart(canvas,{

        type:"bar",

        data:{
            labels:categories,

            datasets:[{

                label:"Average Challenge Level",

                data:values,

                backgroundColor:[
                    "#7a0c0c",
                    "#d97706",
                    "#2459d3"
                ],

                borderRadius:10,
                maxBarThickness:60

            }]
        },

        options:{

            responsive:true,
            maintainAspectRatio:false,

            scales:{

                y:{
                    beginAtZero:true,
                    max:100,

                    ticks:{
                        callback:value=>
                            value+"%"
                    },

                    title:{
                        display:true,
                        text:"Average Challenge Level"
                    }
                },

                x:{
                    title:{
                        display:true,
                        text:"Stress Factor"
                    }
                }

            },

            plugins:{

                legend:{
                    display:false
                },

                tooltip:{

                    callbacks:{

                        title(context){
                            return`${context[0].label} Factor`;
                        },

                        label(context){

                            if(context.raw===null){
                                return"No category data available";
                            }

                            return`Average Challenge: ${context.raw}%`;
                        },

                        afterLabel(context){

                            const category=
                                categories[
                                    context.dataIndex
                                ];

                            const count=
                                counts[category];

                            return`${count} student${count!==1?"s":""} included`;
                        }

                    }

                }

            }

        }

    });

    const description=
        document.getElementById(
            "factorChartDescription"
        );

    if(description){

        const assessedStudents=
            allAssessments.length;

        description.textContent=
            `Class average challenge level across the latest assessment results of ${assessedStudents} assessed student${assessedStudents!==1?"s":""}. Higher percentages indicate greater reported difficulty in that area.`;
    }
}

function updateTrendChart(){
    const grouped={};

    allAssessmentHistory.forEach(item=>{
        if(!item.date)return;

        const score=Number(item.score);

        if(!Number.isFinite(score))return;

        let rawDate=String(item.date).trim();

        if(!rawDate)return;

        let date;

        if(/^\d{4}-\d{2}-\d{2}$/.test(rawDate)){
            date=new Date(`${rawDate}T00:00:00`);
        }else{
            date=new Date(rawDate.replace(" ","T"));
        }

        if(Number.isNaN(date.getTime()))return;

        const key=
            date.getFullYear()+"-"+
            String(date.getMonth()+1).padStart(2,"0")+"-"+
            String(date.getDate()).padStart(2,"0");

        if(!grouped[key]){
            grouped[key]={
                date:date,
                total:0,
                count:0
            };
        }

        grouped[key].total+=score;
        grouped[key].count++;
    });

    const sorted=Object.values(grouped).sort(
        (a,b)=>a.date.getTime()-b.date.getTime()
    );

    const labels=sorted.map(item=>
        item.date.toLocaleDateString("en-US",{
            month:"short",
            day:"numeric"
        })
    );

    const averages=sorted.map(item=>
        Number((item.total/item.count).toFixed(1))
    );

    if(trendChart){
        trendChart.destroy();
        trendChart=null;
    }

    const canvas=document.getElementById("trendChart");

    if(!canvas)return;

    if(averages.length===0){
        const container=canvas.parentElement;

        container.innerHTML=`
            <div class="no-data">
                Assessment dates or scores are not available for the current data.
            </div>
            <canvas id="trendChart"></canvas>
        `;

        return;
    }

    trendChart=new Chart(canvas,{
        type:"line",

        data:{
            labels:labels,

            datasets:[{
                label:"Average Assessment Score",
                data:averages,
                borderColor:"#3b82f6",
                backgroundColor:"rgba(59,130,246,.10)",
                borderWidth:3,
                tension:.35,
                fill:true,
                pointRadius:6,
                pointHoverRadius:8
            }]
        },

        options:{
            responsive:true,
            maintainAspectRatio:false,

            scales:{
                y:{
                    beginAtZero:true,
                    max:100,

                    ticks:{
                        callback:value=>value+"%"
                    },

                    title:{
                        display:true,
                        text:"Average Assessment Score"
                    }
                },

                x:{
                    title:{
                        display:true,
                        text:"Assessment Date"
                    }
                }
            },

            plugins:{
                legend:{
                    display:false
                },

                tooltip:{
                    callbacks:{
                        title(context){
                            return context[0].label;
                        },

                        label(context){
                            return`Average Score: ${context.raw}%`;
                        },

                        afterLabel(context){
                            const index=context.dataIndex;
                            const date=sorted[index];

                            return`${date.count} assessment${date.count!==1?"s":""} included`;
                        }
                    }
                }
            }
        }
    });
}

function updateRecommendations(){
    const container=
        document.getElementById(
            "recommendationContainer"
        );

    if(!allAssessments.length){
        container.innerHTML=
            '<p class="no-data">No assessment data is available for generating recommendations.</p>';

        return;
    }

    let high=0;
    let moderate=0;

    const factors={
        "School":0,
        "Home":0,
        "Social Lifestyle":0
    };

    const factorCounts={
        "School":0,
        "Home":0,
        "Social Lifestyle":0
    };

    allAssessments.forEach(student=>{
        if(student.riskLevel==="High"){
            high++;
        }

        if(student.riskLevel==="Moderate"){
            moderate++;
        }

        const categories=
            student.categories||{};

        Object.keys(factors).forEach(category=>{
            const data=
                categories[category];

            if(!data){
                return;
            }

            const challenge=
                getCategoryChallenge(data);

            if(!Number.isFinite(challenge)){
                return;
            }

            factors[category]+=challenge;
            factorCounts[category]++;
        });
    });

    const factorAverages={};

    Object.keys(factors).forEach(category=>{
        factorAverages[category]=
            factorCounts[category]===0
                ?0
                :factors[category]/
                    factorCounts[category];
    });

    const availableFactors=
        Object.keys(factorAverages).filter(
            category=>factorCounts[category]>0
        );

    const topFactor=
        availableFactors.length
            ?availableFactors.sort(
                (a,b)=>
                    factorAverages[b]-
                    factorAverages[a]
            )[0]
            :null;

    let recommendations=[];

    if(high>0){
        recommendations.push({
            icon:"🔴",
            title:"Prioritize High-Risk Students",
            text:
                `${high} student${high!==1?"s are":" is"} currently classified as High Risk. Consider individual check-ins, closer monitoring, and referral to appropriate school personnel when necessary.`
        });
    }

    if(moderate>0){
        recommendations.push({
            icon:"🟠",
            title:"Monitor Moderate-Risk Students",
            text:
                `${moderate} student${moderate!==1?"s are":" is"} currently classified as Moderate Risk. Regular check-ins and academic support may help address concerns before they become more serious.`
        });
    }

    if(
        topFactor&&
        factorCounts[topFactor]>0&&
        factorAverages[topFactor]>0
    ){
        let factorRecommendation="";

        if(topFactor==="School"){
            factorRecommendation=
                "Consider reviewing workload, study routines, academic difficulties, and classroom demands.";
        }else if(topFactor==="Home"){
            factorRecommendation=
                "Consider checking whether students need additional support related to their home environment, routines, or responsibilities.";
        }else{
            factorRecommendation=
                "Consider encouraging positive peer relationships, healthy social interaction, and appropriate time for rest and recreation.";
        }

        recommendations.push({
            icon:"💡",
            title:`${topFactor} Factor Needs Attention`,
            text:factorRecommendation
        });
    }

    recommendations.push({
        icon:"📋",
        title:"Continue Regular Monitoring",
        text:
            "Use future assessment results and student history to monitor changes over time and determine whether additional follow-up may be appropriate."
    });

    container.innerHTML=
        recommendations.map(item=>`
            <div class="recommendation-item">
                <div class="recommendation-icon">
                    ${item.icon}
                </div>

                <div class="recommendation-content">
                    <h4>${item.title}</h4>
                    <p>${item.text}</p>
                </div>
            </div>
        `).join("");
}

function updateInsights(
    high,
    moderate,
    low,
    noAssessment,
    total
){
    let html="";

    const completed=
        total-noAssessment;

    if(high>0){
        html+=`
        <div class="insight-item danger">
            <div class="insight-icon">🔴</div>

            <div class="insight-content">
                <h4>Immediate Attention Required</h4>

                <p>
                    <strong>${high}</strong>
                    student${high!==1?"s":""}
                    (${percent(high,total)})
                    are currently classified as
                    <strong>High Risk.</strong>
                    These students may benefit from closer monitoring
                    and additional support.
                </p>
            </div>
        </div>`;
    }

    if(moderate>0){
        html+=`
        <div class="insight-item warning">
            <div class="insight-icon">🟠</div>

            <div class="insight-content">
                <h4>Monitor Student Wellness</h4>

                <p>
                    <strong>${moderate}</strong>
                    student${moderate!==1?"s":""}
                    (${percent(moderate,total)})
                    are currently showing
                    <strong>Moderate Risk</strong>.
                    Regular check-ins may help prevent further concerns.
                </p>
            </div>
        </div>`;
    }

    if(high===0&&moderate===0){
        html+=`
        <div class="insight-item success">
            <div class="insight-icon">✅</div>

            <div class="insight-content">
                <h4>Healthy Classroom</h4>

                <p>
                    Based on the latest assessments, no students are
                    currently classified as Moderate or High Risk.
                    Continue promoting healthy classroom habits and
                    monitoring future results.
                </p>
            </div>
        </div>`;
    }

    html+=`
    <div class="insight-item info">
        <div class="insight-icon">📊</div>

        <div class="insight-content">
            <h4>Assessment Coverage</h4>

            <p>
                <strong>${completed}</strong>
                of
                <strong>${total}</strong>
                students have completed the latest wellness assessment
                (${percent(completed,total)}).
            </p>
        </div>
    </div>`;

    document.getElementById(
        "insightsContainer"
    ).innerHTML=html;
}

function updateRiskTable(data){
    const filtered=
        data
            .filter(
                student=>
                    student.riskLevel==="High"||
                    student.riskLevel==="Moderate"
            )
            .sort((a,b)=>{
                if(a.riskLevel===b.riskLevel){
                    return b.score-a.score;
                }

                return a.riskLevel==="High"
                    ?-1
                    :1;
            });

    if(filtered.length===0){
        document.getElementById(
            "riskTableContainer"
        ).innerHTML=
            '<p class="no-data">No students currently require attention.</p>';

        return;
    }

    let html=`
    <p class="table-help">
        Click a student to view their assessment details and identified area of concern.
    </p>

    <table class="attention-table">
        <thead>
            <tr>
                <th>Student</th>
                <th>ID</th>
                <th>Risk</th>
                <th>Score</th>
                <th>Assessment Date</th>
            </tr>
        </thead>

        <tbody>`;

    filtered.forEach(student=>{
        html+=`
        <tr
            class="attention-student-row"
            data-student-id="${student.studentId}"
            tabindex="0"
            role="button"
            aria-label="View wellness details for ${escapeHTML(student.name)}"
        >
            <td>
                <strong>
                    ${escapeHTML(student.name)}
                </strong>
            </td>

            <td>
                ${escapeHTML(student.code)}
            </td>

            <td>
                <span class="status-badge ${student.riskLevel.toLowerCase()}">
                    ${student.riskLevel}
                </span>
            </td>

            <td>
                ${student.score}%
            </td>

            <td>
                ${escapeHTML(student.date||"—")}
            </td>
        </tr>`;
    });

    html+=`
        </tbody>
    </table>`;

    document.getElementById(
        "riskTableContainer"
    ).innerHTML=html;

    document
        .querySelectorAll(".attention-student-row")
        .forEach(row=>{
            const studentId=
                Number(row.dataset.studentId);

            const student=
                filtered.find(
                    item=>
                        Number(item.studentId)===studentId
                );

            if(!student)return;

            row.addEventListener(
                "click",
                ()=>openConcernModal(student)
            );

            row.addEventListener(
                "keydown",
                event=>{
                    if(
                        event.key==="Enter"||
                        event.key===" "
                    ){
                        event.preventDefault();
                        openConcernModal(student);
                    }
                }
            );
        });
}

function createConcernModal(){
    if(
        document.getElementById(
            "studentConcernModal"
        )
    ){
        return;
    }

    const modal=
        document.createElement("div");

    modal.id="studentConcernModal";
    modal.className="student-concern-modal";
    modal.hidden=true;

    modal.innerHTML=`
        <div
            class="student-concern-overlay"
            data-close-modal="true"
        ></div>

        <div
            class="student-concern-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="concernModalTitle"
        >
            <div class="student-concern-modal-header">
                <div>
                    <span class="concern-label">
                        STUDENT WELLNESS DETAILS
                    </span>

                    <h3 id="concernModalTitle">
                        Student Wellness Details
                    </h3>

                    <p id="concernModalStudent">
                        Assessment details
                    </p>
                </div>

                <button
                    type="button"
                    class="concern-modal-close"
                    id="closeConcernModal"
                    aria-label="Close student wellness details"
                >
                    ×
                </button>
            </div>

            <div
                class="student-concern-modal-body"
                id="concernModalBody"
            ></div>
        </div>`;

    document.body.appendChild(modal);

    document
        .getElementById("closeConcernModal")
        .addEventListener(
            "click",
            closeConcernModal
        );

    modal.addEventListener(
        "click",
        event=>{
            if(
                event.target.dataset.closeModal==="true"
            ){
                closeConcernModal();
            }
        }
    );

    document.addEventListener(
        "keydown",
        event=>{
            if(
                event.key==="Escape"&&
                !modal.hidden
            ){
                closeConcernModal();
            }
        }
    );
}

function openConcernModal(student){
    const modal=
        document.getElementById(
            "studentConcernModal"
        );

    if(!modal)return;

    let categories=
        student.categories||{};

    if(
        !hasCategoryData(categories)&&
        student.studentId
    ){
        const historicalAssessment=
            allAssessmentHistory.find(
                assessment=>
                    Number(assessment.studentId)===
                    Number(student.studentId)&&
                    hasCategoryData(assessment.categories)
            );

        if(historicalAssessment){
            categories=
                cloneCategories(
                    historicalAssessment.categories
                );
        }
    }

    const categoryNames=[
        "School",
        "Home",
        "Social Lifestyle"
    ];

    let validCategories=[];

    categoryNames.forEach(category=>{
        const categoryData=
            categories[category];

        if(!categoryData)return;

        const average=
            Number(categoryData.average);

        const challenge=
            getCategoryChallenge(categoryData);

        if(
            Number.isFinite(average)||
            Number.isFinite(challenge)
        ){
            validCategories.push({
                name:category,
                average:
                    Number.isFinite(average)
                        ?average
                        :null,
                percentage:
                    Number.isFinite(challenge)
                        ?challenge
                        :null
            });
        }
    });

    let weakestCategories=[];

    if(validCategories.length>0){
        const lowestAverage=
            Math.min(
                ...validCategories
                    .filter(
                        category=>
                            Number.isFinite(
                                category.average
                            )
                    )
                    .map(
                        category=>category.average
                    )
            );

        if(Number.isFinite(lowestAverage)){
            weakestCategories=
                validCategories.filter(
                    category=>
                        Number.isFinite(
                            category.average
                        )&&
                        Math.abs(
                            category.average-
                            lowestAverage
                        )<.001
                );
        }else{
            const highestChallenge=
                Math.max(
                    ...validCategories.map(
                        category=>category.percentage
                    )
                );

            weakestCategories=
                validCategories.filter(
                    category=>
                        Math.abs(
                            category.percentage-
                            highestChallenge
                        )<.001
                );
        }
    }

    if(weakestCategories.length===0){
        weakestCategories=[{
            name:"Overall",
            average:null,
            percentage:Number(student.score)
        }];
    }

    const studentLabel=
        document.getElementById(
            "concernModalStudent"
        );

    if(studentLabel){
        studentLabel.textContent=
            `${student.name} • ${student.code}`;
    }

    const body=
        document.getElementById(
            "concernModalBody"
        );

    if(body){
        body.innerHTML=
            buildStudentConcern(
                student,
                weakestCategories,
                categories
            );
    }

    modal.hidden=false;

    document.body.classList.add(
        "modal-open"
    );

    requestAnimationFrame(()=>{
        modal.classList.add("show");
    });

    const closeButton=
        document.getElementById(
            "closeConcernModal"
        );

    if(closeButton){
        closeButton.focus();
    }
}

function closeConcernModal(){
    const modal=
        document.getElementById(
            "studentConcernModal"
        );

    if(!modal)return;

    modal.classList.remove("show");

    document.body.classList.remove(
        "modal-open"
    );

    setTimeout(()=>{
        modal.hidden=true;
    },180);
}

function buildStudentConcern(
    student,
    weakestCategories,
    allCategories
){
    const isOverall=
        weakestCategories.length===1&&
        weakestCategories[0].name==="Overall";

    const categoryNames=
        weakestCategories.map(
            category=>category.name
        );

    const categoryTitle=
        categoryNames.length===1
            ?categoryNames[0]
            :categoryNames
                .slice(0,-1)
                .join(", ")+
                " and "+
                categoryNames[
                    categoryNames.length-1
                ];

    let areaDescription="";
    let supportSuggestion="";

    if(isOverall){
        areaDescription=
            "Category results were not available for the student's assessment history, so the overall assessment score is being used.";

        supportSuggestion=
            "Consider a general supportive check-in and monitor the student's future assessment results.";
    }else if(categoryNames.length===1){
        if(categoryNames[0]==="School"){
            areaDescription=
                "The student's lowest area is related to school experiences and academic demands.";

            supportSuggestion=
                "Check whether the student is having difficulty with schoolwork, workload, studying, or classroom demands.";
        }else if(categoryNames[0]==="Home"){
            areaDescription=
                "The student's lowest area is related to their home environment, routines, or responsibilities.";

            supportSuggestion=
                "Consider a supportive check-in about routines, responsibilities, and whether additional support may be needed.";
        }else{
            areaDescription=
                "The student's lowest area is related to social experiences, friendships, rest, or personal balance.";

            supportSuggestion=
                "Check in about friendships, social experiences, rest, recreation, and overall balance outside schoolwork.";
        }
    }else{
        areaDescription=
            "The student has the same lowest average in multiple areas, indicating that these areas may all benefit from supportive follow-up.";

        supportSuggestion=
            "Consider checking in with the student about these areas together rather than focusing on only one concern.";
    }

    let categoryScoresHTML="";

    weakestCategories.forEach(category=>{
        let challengePercentage=null;

        if(Number.isFinite(category.percentage)){
            challengePercentage=
                Math.round(
                    category.percentage
                );
        }else if(
            Number.isFinite(category.average)
        ){
            challengePercentage=
                Math.round(
                    calculateChallengePercentage(
                        category.average
                    )
                );
        }

        const averageText=
            Number.isFinite(category.average)
                ?`${category.average.toFixed(1)} / 3`
                :"N/A";

        categoryScoresHTML+=`
        <div class="concern-category-score">
            <span>
                ${escapeHTML(category.name)}
            </span>

            <strong>
                ${challengePercentage!==null
                    ?challengePercentage+"%"
                    :"N/A"}
            </strong>

            <small>
                Average response: ${averageText}
            </small>
        </div>`;
    });

    const riskMessage=
        student.riskLevel==="High"
            ?"The latest assessment indicates a higher level of reported difficulty and may benefit from closer follow-up."
            :"The latest assessment indicates some areas of difficulty that may benefit from monitoring and supportive check-ins.";

    let sourceNote="";

    if(
        student.categorySource==="previous_attempt"
    ){
        sourceNote=`
        <div class="concern-note">
            <span>ℹ️</span>
            <p>
                The latest retake provided the current risk result, while the category information shown here comes from the student's most recent assessment with available category results.
            </p>
        </div>`;
    }

    return`
    <div class="student-concern-panel">

        <div class="concern-summary">

            <div class="concern-summary-item">
                <span>Risk Level</span>

                <strong class="modal-risk ${student.riskLevel.toLowerCase()}">
                    ${escapeHTML(student.riskLevel)}
                </strong>
            </div>

            <div class="concern-summary-item">
                <span>Overall Score</span>

                <strong>
                    ${
                        Number.isFinite(
                            Number(student.score)
                        )
                            ?Math.round(
                                Number(student.score)
                            )
                            :"N/A"
                    }%
                </strong>
            </div>

        </div>

        <div class="concern-main-area">

            <div class="concern-main-icon">
                ${getCategoryIcon(
                    isOverall
                        ?"Overall"
                        :weakestCategories[0].name
                )}
            </div>

            <div class="concern-main-content">

                <span class="concern-box-label">
                    LOWEST-SCORING
                    ${categoryNames.length>1
                        ?"AREAS"
                        :"AREA"}
                </span>

                <h4>
                    ${escapeHTML(categoryTitle)}
                </h4>

                <p>
                    ${areaDescription}
                </p>

            </div>

            <div class="concern-main-score">

                <strong>
                    ${
                        weakestCategories.length===1&&
                        Number.isFinite(
                            weakestCategories[0].percentage
                        )
                            ?Math.round(
                                weakestCategories[0].percentage
                            )+"%"
                            :weakestCategories.length===1&&
                            Number.isFinite(
                                weakestCategories[0].average
                            )
                                ?Math.round(
                                    calculateChallengePercentage(
                                        weakestCategories[0].average
                                    )
                                )+"%"
                                :weakestCategories.length>1
                                    ?"Same"
                                    :Number.isFinite(
                                        Number(student.score)
                                    )
                                        ?Math.round(
                                            Number(student.score)
                                        )+"%"
                                        :"N/A"
                    }
                </strong>

                <span>
                    ${
                        weakestCategories.length>1
                            ?"Lowest areas"
                            :isOverall
                                ?"Overall assessment"
                                :Number.isFinite(
                                    weakestCategories[0].average
                                )
                                    ?`Challenge: ${Math.round(
                                        calculateChallengePercentage(
                                            weakestCategories[0].average
                                        )
                                    )}%`
                                    :"Challenge level"
                    }
                </span>

            </div>

        </div>

        ${
            weakestCategories.length>1
                ?`
                <div class="concern-category-scores">
                    <span class="concern-box-label">
                        AREAS WITH THE SAME LOWEST SCORE
                    </span>

                    <div class="concern-category-score-list">
                        ${categoryScoresHTML}
                    </div>
                </div>
                `
                :""
        }

        <div class="concern-reason">

            <span class="concern-box-label">
                WHY THEY WERE FLAGGED
            </span>

            <p>
                ${riskMessage}
            </p>

        </div>

        <div class="support-box">

            <span class="support-icon">
                💡
            </span>

            <div>

                <strong>
                    Suggested teacher action
                </strong>

                <p>
                    ${supportSuggestion}
                </p>

            </div>

        </div>

        ${sourceNote}

        <div class="concern-note">

            <span>
                ℹ️
            </span>

            <p>
                Use this result as a guide for supportive follow-up, not as a diagnosis.
            </p>

        </div>

    </div>`;
}

function getCategoryIcon(category){
    if(category==="School"){
        return"📚";
    }

    if(category==="Home"){
        return"🏡";
    }

    if(category==="Social Lifestyle"){
        return"🤝";
    }

    return"💡";
}

function updateAssessmentTable(data){
    if(data.length===0){
        document.getElementById(
            "assessmentTableContainer"
        ).innerHTML=
            '<p class="no-data">No assessments have been submitted yet.</p>';

        return;
    }

    const sortedData=
        [...data].sort(
            (a,b)=>b.score-a.score
        );

    let html=`
    <table>
        <thead>
            <tr>
                <th>Student</th>
                <th>ID</th>
                <th>Risk</th>
                <th>Score</th>
                <th>Assessment Date</th>
            </tr>
        </thead>

        <tbody>`;

    sortedData.forEach(student=>{
        html+=`
        <tr>

            <td>
                <strong>
                    ${escapeHTML(student.name)}
                </strong>
            </td>

            <td>
                ${escapeHTML(student.code)}
            </td>

            <td>
                <span class="status-badge ${student.riskLevel.toLowerCase()}">
                    ${student.riskLevel}
                </span>
            </td>

            <td>
                ${student.score}%
            </td>

            <td>
                ${escapeHTML(student.date||"—")}
            </td>

        </tr>`;
    });

    html+=`
        </tbody>
    </table>`;

    document.getElementById(
        "assessmentTableContainer"
    ).innerHTML=html;
}

function escapeHTML(value){
    return String(value??"")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}






async function exportReport(format){

    if(allAssessments.length===0){

        alert("No assessment data available.");

        return;
    }

    const factorCategories=[
        "School",
        "Home",
        "Social Lifestyle"
    ];

    if(format==="csv"){

        function csvEscape(value){

            return `"${String(value ?? "")
                .replace(/"/g,'""')}"`;
        }

        let csv="";

        csv+="Spark Check Teacher Report\n";

        csv+=
            csvEscape(
                `Generated: ${new Date().toLocaleString()}`
            )+
            "\n\n";

        csv+="CLASS SUMMARY\n";

        csv+=
            `Total Students,${csvEscape(allStudents.length)}\n`;

        csv+=
            `Assessment Coverage,${csvEscape(
                document.getElementById(
                    "completionRate"
                )?.textContent || "0%"
            )}\n`;

        csv+=
            `High Risk,${csvEscape(
                document.getElementById(
                    "highRiskCount"
                )?.textContent || "0"
            )}\n`;

        csv+=
            `Moderate Risk,${csvEscape(
                document.getElementById(
                    "moderateRiskCount"
                )?.textContent || "0"
            )}\n`;

        csv+=
            `Low Risk,${csvEscape(
                document.getElementById(
                    "lowRiskCount"
                )?.textContent || "0"
            )}\n`;

        csv+="\n";

        csv+="STRESS FACTOR ANALYSIS\n";

        csv+="Stress Factor,Average Challenge Level\n";

        const serverFactors=
            reportAnalytics &&
            reportAnalytics.challenge_percentages
                ?reportAnalytics.challenge_percentages
                :{};

        factorCategories.forEach(category=>{

            const value=
                Number(
                    serverFactors[category]
                );

            csv+=
                `${csvEscape(category)},`+
                `${csvEscape(
                    Number.isFinite(value)
                        ?value+"%"
                        :"N/A"
                )}\n`;

        });

        csv+="\n";

        csv+="LATEST ASSESSMENT RESULTS\n";

        csv+=
            "Student Name,Student ID,Risk Level,Score,Assessment Date,Lowest Stress Factor\n";

        allAssessments.forEach(student=>{

            let lowestFactor="N/A";

            const categories=
                student.categories||{};

            const availableCategories=
                factorCategories
                    .map(category=>{

                        const data=
                            categories[category];

                        if(!data){
                            return null;
                        }

                        const average=
                            Number(
                                data.average
                            );

                        const challenge=
                            getCategoryChallenge(
                                data
                            );

                        if(
                            Number.isFinite(average)
                        ){

                            return{
                                category:category,
                                value:average,
                                type:"average"
                            };

                        }

                        if(
                            Number.isFinite(challenge)
                        ){

                            return{
                                category:category,
                                value:challenge,
                                type:"challenge"
                            };

                        }

                        return null;

                    })
                    .filter(Boolean);

            if(availableCategories.length){

                const averageCategories=
                    availableCategories.filter(
                        item=>item.type==="average"
                    );

                if(averageCategories.length){

                    const lowest=
                        Math.min(
                            ...averageCategories.map(
                                item=>item.value
                            )
                        );

                    const match=
                        averageCategories.find(
                            item=>
                                Math.abs(
                                    item.value-lowest
                                )<0.001
                        );

                    if(match){

                        lowestFactor=
                            match.category;

                    }

                }else{

                    const highest=
                        Math.max(
                            ...availableCategories.map(
                                item=>item.value
                            )
                        );

                    const match=
                        availableCategories.find(
                            item=>
                                Math.abs(
                                    item.value-highest
                                )<0.001
                        );

                    if(match){

                        lowestFactor=
                            match.category;

                    }

                }

            }

            csv+=
                [
                    csvEscape(student.name),
                    csvEscape(student.code),
                    csvEscape(student.riskLevel),
                    csvEscape(student.score+"%"),
                    csvEscape(student.date),
                    csvEscape(lowestFactor)
                ].join(",")+
                "\n";

        });

        csv+="\n";

        csv+="STUDENT STRESS FACTOR DETAILS\n";

        csv+=
            "Student Name,Student ID,School Challenge,Home Challenge,Social Lifestyle Challenge\n";

        allAssessments.forEach(student=>{

            const categories=
                student.categories||{};

            const getChallenge=(category)=>{

                const data=
                    categories[category];

                if(!data){
                    return "N/A";
                }

                const challenge=
                    getCategoryChallenge(
                        data
                    );

                return Number.isFinite(challenge)
                    ?Math.round(challenge)+"%"
                    :"N/A";
            };

            csv+=
                [
                    csvEscape(student.name),
                    csvEscape(student.code),
                    csvEscape(
                        getChallenge("School")
                    ),
                    csvEscape(
                        getChallenge("Home")
                    ),
                    csvEscape(
                        getChallenge("Social Lifestyle")
                    )
                ].join(",")+
                "\n";

        });

        const blob=
            new Blob(
                [csv],
                {
                    type:"text/csv;charset=utf-8;"
                }
            );

        const url=
            URL.createObjectURL(blob);

        const link=
            document.createElement("a");

        link.href=url;

        const today=
            new Date();

        link.download=
            `SparkCheck_Report_${today.getFullYear()}-`+
            `${String(today.getMonth()+1).padStart(2,"0")}-`+
            `${String(today.getDate()).padStart(2,"0")}.csv`;

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        return;
    }




    if(format==="pdf"){

        if(typeof window.jspdf==="undefined"){

            alert(
                "PDF export library is not available. Please refresh the page and try again."
            );

            return;
        }

        try{

            const {jsPDF}=window.jspdf;

            const pdf=new jsPDF(
                "p",
                "mm",
                "a4"
            );

            let y=18;

            const chartPanels=[
                document.getElementById("riskPanel"),
                document.getElementById("scorePanel"),
                document.getElementById("factorPanel"),
                document.getElementById("trendPanel")
            ];

            const previousPanelStates=chartPanels.map(panel=>{

                if(!panel){
                    return null;
                }

                return {
                    panel:panel,
                    display:panel.style.display,
                    visibility:panel.style.visibility,
                    height:panel.style.height,
                    overflow:panel.style.overflow
                };

            });

            chartPanels.forEach(panel=>{

                if(!panel){
                    return;
                }

                panel.style.display="block";
                panel.style.visibility="visible";
                panel.style.height="auto";
                panel.style.overflow="visible";

            });

            const chartInstances=[
                window.riskChart,
                window.scoreChart,
                window.factorChart,
                window.trendChart
            ];

            chartInstances.forEach(chart=>{

                if(!chart){
                    return;
                }

                try{

                    chart.resize();

                    chart.update("none");

                }catch(error){

                    console.warn(
                        "Chart refresh failed:",
                        error
                    );

                }

            });

            await new Promise(resolve=>{
                requestAnimationFrame(()=>{
                    requestAnimationFrame(resolve);
                });
            });

            function restoreChartPanels(){

                previousPanelStates.forEach(state=>{

                    if(!state){
                        return;
                    }

                    state.panel.style.display=
                        state.display;

                    state.panel.style.visibility=
                        state.visibility;

                    state.panel.style.height=
                        state.height;

                    state.panel.style.overflow=
                        state.overflow;

                });

            }

            function checkPage(space=20){

                if(y+space>280){

                    pdf.addPage();

                    y=20;

                }

            }

            function addText(
                text,
                x,
                size=11,
                maxWidth=180
            ){

                pdf.setFontSize(size);

                const lines=
                    pdf.splitTextToSize(
                        String(text||""),
                        maxWidth
                    );

                checkPage(
                    Math.max(
                        10,
                        lines.length*5
                    )
                );

                pdf.text(
                    lines,
                    x,
                    y
                );

                y+=
                    lines.length*5;

            }

            function getChartImage(canvas){

                if(!canvas){
                    return null;
                }

                try{

                    const width=canvas.width;
                    const height=canvas.height;

                    if(
                        !width ||
                        !height
                    ){

                        return null;

                    }

                    const imageCanvas=
                        document.createElement("canvas");

                    imageCanvas.width=
                        width*2;

                    imageCanvas.height=
                        height*2;

                    const context=
                        imageCanvas.getContext("2d");

                    context.fillStyle="#ffffff";

                    context.fillRect(
                        0,
                        0,
                        imageCanvas.width,
                        imageCanvas.height
                    );

                    context.drawImage(
                        canvas,
                        0,
                        0,
                        imageCanvas.width,
                        imageCanvas.height
                    );

                    return imageCanvas.toDataURL(
                        "image/png"
                    );

                }catch(error){

                    console.error(
                        "Chart image generation failed:",
                        error
                    );

                    return null;

                }

            }

            function addChart(
                title,
                canvas
            ){

                if(!canvas){

                    return;

                }

                const image=
                    getChartImage(canvas);

                if(!image){

                    console.warn(
                        "Chart image unavailable:",
                        title
                    );

                    return;

                }

                checkPage(105);

                pdf.setFontSize(12);

                pdf.setFont(
                    undefined,
                    "bold"
                );

                pdf.text(
                    title,
                    15,
                    y
                );

                pdf.setFont(
                    undefined,
                    "normal"
                );

                y+=5;

                try{

                    pdf.addImage(
                        image,
                        "PNG",
                        25,
                        y,
                        160,
                        75
                    );

                    y+=85;

                }catch(error){

                    console.error(
                        "Chart could not be added to PDF:",
                        error
                    );

                }

            }

            pdf.setFontSize(22);

            pdf.text(
                "Spark Check",
                105,
                y,
                {
                    align:"center"
                }
            );

            y+=8;

            pdf.setFontSize(16);

            pdf.text(
                "Teacher Wellness Report",
                105,
                y,
                {
                    align:"center"
                }
            );

            y+=12;

            addText(
                `Generated: ${new Date().toLocaleString()}`,
                15,
                10
            );

            y+=3;

            addText(
                document.getElementById(
                    "summaryText"
                )?.textContent||
                "No summary available.",
                15,
                10,
                180
            );

            y+=5;

            checkPage(50);

            pdf.setFontSize(14);

            pdf.setFont(
                undefined,
                "bold"
            );

            pdf.text(
                "Overall Statistics",
                15,
                y
            );

            pdf.setFont(
                undefined,
                "normal"
            );

            y+=8;

            addText(
                `Total Students: ${allStudents.length}`,
                18,
                10
            );

            addText(
                `Assessment Coverage: ${
                    document.getElementById(
                        "completionRate"
                    )?.textContent||
                    "0%"
                }`,
                18,
                10
            );

            addText(
                `High Risk: ${
                    document.getElementById(
                        "highRiskCount"
                    )?.textContent||
                    "0"
                }`,
                18,
                10
            );

            addText(
                `Moderate Risk: ${
                    document.getElementById(
                        "moderateRiskCount"
                    )?.textContent||
                    "0"
                }`,
                18,
                10
            );

            addText(
                `Low Risk: ${
                    document.getElementById(
                        "lowRiskCount"
                    )?.textContent||
                    "0"
                }`,
                18,
                10
            );

            y+=8;

            checkPage(100);

            pdf.setFontSize(14);

            pdf.setFont(
                undefined,
                "bold"
            );

            pdf.text(
                "Charts & Analytics",
                15,
                y
            );

            pdf.setFont(
                undefined,
                "normal"
            );

            y+=8;

            addChart(
                "Risk Level Distribution",
                document.getElementById("riskChart")
            );

            addChart(
                "Assessment Score Distribution",
                document.getElementById("scoreChart")
            );

            addChart(
                "Stress Factor Analysis",
                document.getElementById("factorChart")
            );

            addChart(
                "Assessment Trend Analysis",
                document.getElementById("trendChart")
            );

            checkPage(60);

            pdf.setFontSize(14);

            pdf.setFont(
                undefined,
                "bold"
            );

            pdf.text(
                "Key Insights",
                15,
                y
            );

            pdf.setFont(
                undefined,
                "normal"
            );

            y+=8;

            document
                .querySelectorAll(
                    ".insight-item"
                )
                .forEach(item=>{

                    const title=
                        item.querySelector(
                            "h4"
                        )?.innerText||
                        "";

                    const body=
                        item.querySelector(
                            "p"
                        )?.innerText||
                        "";

                    checkPage(25);

                    pdf.setFont(
                        undefined,
                        "bold"
                    );

                    addText(
                        title,
                        18,
                        10,
                        170
                    );

                    pdf.setFont(
                        undefined,
                        "normal"
                    );

                    addText(
                        body,
                        18,
                        9,
                        170
                    );

                    y+=3;

                });

            checkPage(60);

            pdf.setFontSize(14);

            pdf.setFont(
                undefined,
                "bold"
            );

            pdf.text(
                "Stress Factor Summary",
                15,
                y
            );

            pdf.setFont(
                undefined,
                "normal"
            );

            y+=8;

            const pdfFactors=
                reportAnalytics&&
                reportAnalytics.challenge_percentages
                    ?reportAnalytics.challenge_percentages
                    :{};

            factorCategories.forEach(category=>{

                const value=
                    Number(
                        pdfFactors[category]
                    );

                checkPage(10);

                pdf.setFontSize(10);

                pdf.text(
                    `${category}: ${
                        Number.isFinite(value)
                            ?value+"%"
                            :"N/A"
                    }`,
                    18,
                    y
                );

                y+=6;

            });

            checkPage(30);

            pdf.setFontSize(9);

            pdf.text(
                "Higher percentages indicate greater reported difficulty in that area.",
                18,
                y
            );

            y+=10;

            checkPage(60);

            pdf.setFontSize(14);

            pdf.setFont(
                undefined,
                "bold"
            );

            pdf.text(
                "Latest Assessment Results",
                15,
                y
            );

            pdf.setFont(
                undefined,
                "normal"
            );

            y+=8;

            pdf.setFontSize(9);

            allAssessments.forEach(student=>{

                checkPage(30);

                pdf.setFont(
                    undefined,
                    "bold"
                );

                pdf.text(
                    `${student.name} (${student.code})`,
                    18,
                    y
                );

                pdf.setFont(
                    undefined,
                    "normal"
                );

                y+=5;

                pdf.text(
                    `Risk: ${student.riskLevel}`,
                    22,
                    y
                );

                pdf.text(
                    `Score: ${student.score}%`,
                    75,
                    y
                );

                pdf.text(
                    `Date: ${student.date||"N/A"}`,
                    125,
                    y
                );

                y+=5;

                const categories=
                    student.categories||
                    {};

                factorCategories.forEach(category=>{

                    const data=
                        categories[category];

                    if(!data){
                        return;
                    }

                    const challenge=
                        getCategoryChallenge(
                            data
                        );

                    if(!Number.isFinite(challenge)){
                        return;
                    }

                    checkPage(8);

                    pdf.text(
                        `${category}: ${Math.round(challenge)}% challenge`,
                        22,
                        y
                    );

                    y+=4;

                });

                y+=4;

            });

            restoreChartPanels();

            const today=
                new Date();

            pdf.save(
                `SparkCheck_Teacher_Report_${today.getFullYear()}-`+
                `${String(today.getMonth()+1).padStart(2,"0")}-`+
                `${String(today.getDate()).padStart(2,"0")}.pdf`
            );

        }catch(error){

            console.error(
                "PDF export failed:",
                error
            );

            document
                .querySelectorAll(".chart-panel")
                .forEach(panel=>{
                    panel.style.display="";
                    panel.style.visibility="";
                    panel.style.height="";
                    panel.style.overflow="";
                });

            alert(
                "The PDF could not be generated. Check the browser console for the exact error."
            );

        }

        return;
    }

}