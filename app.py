from flask import (
    Flask,
    render_template,
    request,
    redirect,
    session,
    jsonify,
    flash,
    url_for
)

import hashlib
import secrets

from werkzeug.security import (
    generate_password_hash,
    check_password_hash
)

from config import Config
from database.db import db
from sqlalchemy import func

from models import (
    Admin,
    Teacher,
    Student,
    AssessmentQuestion,
    Assessment,
    AssessmentAnswer,
    GradeSection,
    WellnessCheckIn,
    MoodEntry,
    AnonymousScreening,
    Appointment
)

from datetime import datetime
import uuid
import hashlib

app = Flask(__name__)
app.config.from_object(Config)
app.secret_key = "sparkcheck_secret"
db.init_app(app)

def get_anonymous_key(student_id):
    value = f"{student_id}:{app.secret_key}"
    return hashlib.sha256(value.encode()).hexdigest()


@app.route("/")
def home():
    return render_template("login.html")


@app.route("/login", methods=["GET","POST"])
def login():

    if request.method=="POST":

        email=request.form.get("email","").strip().lower()
        password=request.form.get("password","")

        admin=Admin.query.filter_by(email=email).first()

        if admin:
            if admin.password==password or check_password_hash(admin.password,password):
                session["user_id"]=admin.admin_id
                session["role"]="admin"
                return redirect("/admin")

            return render_template(
                "login.html",
                login_error="Incorrect password."
            )

        teacher=Teacher.query.filter_by(email=email).first()

        if teacher:
            if teacher.password==password or check_password_hash(teacher.password,password):
                session["user_id"]=teacher.teacher_id
                session["role"]="teacher"
                return redirect("/teacher")

            return render_template(
                "login.html",
                login_error="Incorrect password."
            )

        student=Student.query.filter_by(email=email).first()

        if student:
            if student.password==password or check_password_hash(student.password,password):
                session["user_id"]=student.student_id
                session["role"]="student"
                return redirect("/assessment")

            return render_template(
                "login.html",
                login_error="Incorrect password."
            )

        return render_template(
            "login.html",
            login_error="School email was not found."
        )

    return render_template("login.html")


@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")


@app.route("/register", methods=["GET", "POST"])
def register():

    if request.method == "GET":

        return render_template(
            "register.html"
        )


    first_name = request.form.get(
        "first_name",
        ""
    ).strip()

    middle_initial = request.form.get(
        "middle_initial",
        ""
    ).strip()

    last_name = request.form.get(
        "last_name",
        ""
    ).strip()

    suffix = request.form.get(
        "suffix",
        ""
    ).strip()


    age = request.form.get(
        "age",
        type=int
    )

    grade_level = request.form.get(
        "grade_level",
        type=int
    )

    section = request.form.get(
        "section",
        ""
    ).strip()


    email = request.form.get(
        "email",
        ""
    ).strip().lower()

    password = request.form.get(
        "password",
        ""
    )


    form_data = {
        "first_name": first_name,
        "middle_initial": middle_initial,
        "last_name": last_name,
        "suffix": suffix,
        "age": age,
        "grade_level": grade_level,
        "section": section,
        "email": email
    }

    if not first_name or not last_name:

        return render_template(
            "register.html",
            register_error="Please complete your name information.",
            form_data=form_data
        )

    if not grade_level or not section:

        return render_template(
            "register.html",
            register_error="Please select your grade and section.",
            form_data=form_data
        )

    if len(password) < 6:

        return render_template(
            "register.html",
            register_error="Password must be at least 6 characters.",
            form_data=form_data
        )

    existing_student = Student.query.filter_by(

        first_name=first_name,
        middle_initial=middle_initial,
        last_name=last_name,
        suffix=suffix

    ).first()


    if existing_student:

        return render_template(

            "register.html",

            register_error=(
                "This student is already registered. "
                "Please log in instead."
            ),
            form_data=form_data

        )

    if Student.query.filter_by(
        email=email
    ).first():

        return render_template(

            "register.html",

            register_error=(
                "This school email already exists. "
                "Please use your existing account."
            ),

            form_data=form_data
        )

    teacher = Teacher.query.filter_by(

        grade_level=grade_level,
        section=section
    ).first()

    if not teacher:

        return render_template(

            "register.html",
            register_error=(
                "No teacher is assigned to this class. "
                "Please check your grade and section."
            ),
            form_data=form_data
        )

    section_code = "".join(

        letter
        for letter in section.upper()
        if letter.isalpha()

    )[:2]

    prefix = f"G{grade_level}{section_code}"

    last_student = Student.query.order_by(
        Student.student_id.desc()

    ).first()

    next_number = 1

    if last_student and last_student.student_code:

        try:

            next_number = int(
                last_student.student_code[-3:]
            ) + 1

        except:

            next_number = Student.query.count() + 1

    student_code = f"{prefix}{next_number:03d}"

    while Student.query.filter_by(
        student_code=student_code
    ).first():

        next_number += 1
        student_code = f"{prefix}{next_number:03d}"


    student = Student(

        student_code=student_code,
        teacher_id=teacher.teacher_id,
        first_name=first_name,
        middle_initial=middle_initial,
        last_name=last_name,
        suffix=suffix,
        age=age,
        grade_level=grade_level,
        section=section,
        email=email,
        password=generate_password_hash(
            password
        )
    )

    db.session.add(student)
    db.session.commit()

    return render_template(

        "register.html",
        registration_success=True,
        registered_email=email
    )






@app.route("/assessment", methods=["GET", "POST"])
def assessment():

    if session.get("role") != "student":
        return redirect("/")

    student = Student.query.get(session["user_id"])

    if not student:
        return redirect("/")

    assessment_questions = AssessmentQuestion.query.filter_by(
        active=True
    ).order_by(
        AssessmentQuestion.page_number,
        AssessmentQuestion.display_order
    ).all()

    if not assessment_questions:
        return redirect("/")

    latest_assessment = Assessment.query.filter_by(
        student_id=student.student_id
    ).order_by(
        Assessment.assessment_id.desc()
    ).first()

    is_retake = (
        request.args.get("mode") == "retake"
        or request.form.get("mode") == "retake"
    )

    if not latest_assessment:

        if request.method == "GET":

            return render_template(
                "student/assessment.html",
                student=student,
                assessment_questions=assessment_questions,
                latest_assessment=None,
                is_retake=False
            )

        assessment_type = "initial"
        previous_assessment_id = None

    elif is_retake:

        current_assessment = latest_assessment

        completed_appointment = Appointment.query.filter(
            Appointment.student_id == student.student_id,
            Appointment.baseline_assessment_id == current_assessment.assessment_id,
            db.func.lower(Appointment.status) == "completed"
        ).order_by(
            Appointment.appointment_id.desc()
        ).first()

        # Find whether the retake for this cycle already exists.
        existing_retake = Assessment.query.filter_by(
            student_id=student.student_id,
            assessment_type="retake",
            previous_assessment_id=current_assessment.assessment_id
        ).order_by(
            Assessment.assessment_id.desc()
        ).first()

        # No completed follow-up yet.
        if not completed_appointment:

            return redirect(
                url_for(
                    "results",
                    assessment_id=current_assessment.assessment_id
                )
            )

        if existing_retake:

            return redirect(
                url_for(
                    "results",
                    assessment_id=existing_retake.assessment_id
                )
            )

        assessment_type = "retake"
        previous_assessment_id = current_assessment.assessment_id

        if request.method == "GET":

            return render_template(
                "student/assessment.html",
                student=student,
                assessment_questions=assessment_questions,
                latest_assessment=current_assessment,
                is_retake=True
            )

    else:

        # If an assessment already exists, don't allow another
        # initial assessment.
        return redirect(
            url_for(
                "results",
                assessment_id=latest_assessment.assessment_id
            )
        )

    total_score = 0

    max_score = len(assessment_questions) * 3

    assessment = Assessment(
        student_id=student.student_id,
        total_score=0,
        max_score=max_score,
        percentage=0,
        risk_level="Low",
        remarks="",
        submitted_at=datetime.utcnow(),
        assessment_type=assessment_type,
        previous_assessment_id=previous_assessment_id
    )

    db.session.add(assessment)

    db.session.flush()

    for question in assessment_questions:

        raw_value = request.form.get(
            f"q{question.question_id}"
        )

        selected_score = (
            int(raw_value)
            if raw_value
            else 0
        )

        weighted_score = (
            4 - selected_score
            if question.reverse_score and selected_score > 0
            else selected_score
        )

        total_score += weighted_score

        db.session.add(
            AssessmentAnswer(
                assessment_id=assessment.assessment_id,
                question_id=question.question_id,
                selected_score=selected_score,
                weighted_score=weighted_score
            )
        )

    percentage = (
        round((total_score / max_score) * 100, 2)
        if max_score > 0
        else 0
    )

    if percentage >= 80:

        risk = "Low"

        remarks = (
            "You’re doing great 🌟 Keep going strong!"
        )

    elif percentage >= 60:

        risk = "Moderate"

        remarks = (
            "You’re doing okay 👍 A few things to improve."
        )

    else:

        risk = "High"

        remarks = (
            "You might need support ❤️ It’s okay to ask for help."
        )

    assessment.total_score = total_score
    assessment.max_score = max_score
    assessment.percentage = percentage
    assessment.risk_level = risk
    assessment.remarks = remarks

    db.session.commit()

    return redirect(
        url_for(
            "results",
            assessment_id=assessment.assessment_id
        )
    )


@app.route("/results")
def latest_results():
    if session.get("role")!="student":
        return redirect("/")
    student=Student.query.get(session["user_id"])
    if not student:
        return redirect("/")
    assessment=Assessment.query.filter_by(student_id=student.student_id).order_by(Assessment.assessment_id.desc()).first()
    if not assessment:
        return redirect(url_for("assessment"))
    return redirect(url_for("results",assessment_id=assessment.assessment_id))


@app.route("/results/<int:assessment_id>")
def results(assessment_id):

    if session.get("role") != "student":
        return redirect("/")

    student = Student.query.get(session["user_id"])

    if not student:
        return redirect("/")

    assessment = Assessment.query.filter_by(
        assessment_id=assessment_id,
        student_id=student.student_id
    ).first()

    if not assessment:
        return redirect(url_for("assessment"))

    answers = AssessmentAnswer.query.filter_by(
        assessment_id=assessment.assessment_id
    ).order_by(
        AssessmentAnswer.question_id
    ).all()

    categories = {
        "School": [],
        "Home": [],
        "Social Lifestyle": []
    }

    for answer in answers:

        category = answer.question.category

        if category in categories:
            categories[category].append(
                answer.weighted_score
            )

    category_data = {}

    for category, scores in categories.items():

        if scores:

            average = round(
                sum(scores) / len(scores),
                2
            )

            percentage = round(
                (average / 3) * 100
            )

        else:

            average = 0
            percentage = 0

        category_data[category] = {
            "average": average,
            "percentage": percentage
        }

    valid_categories = {
        category: data
        for category, data in category_data.items()
        if data["average"] > 0
    }

    if valid_categories:

        lowest_percentage = min(
            data["percentage"]
            for data in valid_categories.values()
        )

        attention_categories = [
            category
            for category, data in valid_categories.items()
            if data["percentage"] == lowest_percentage
        ]

        strongest_category = max(
            valid_categories,
            key=lambda category:
            valid_categories[category]["percentage"]
        )

    else:

        attention_categories = ["School"]
        strongest_category = "School"

    recommendations = {

        "School": [
            "📚 Break a big school task into smaller steps.",
            "⏰ Give yourself short breaks while studying.",
            "💬 Ask a teacher or trusted adult when a lesson feels difficult."
        ],

        "Home": [
            "🏡 Talk with someone you trust when something at home feels difficult.",
            "🌙 Try to keep a regular sleep and rest routine.",
            "❤️ Make time to talk, eat, or relax with people who support you."
        ],

        "Social Lifestyle": [
            "🤝 Spend time with people who make you feel supported.",
            "⚽ Make time for play, hobbies, or enjoyable activities.",
            "💙 Talk to someone you trust if you feel left out or alone."
        ]
    }

    category_names = {
        "School": "school and learning",
        "Home": "home and daily life",
        "Social Lifestyle": "friends, activities, and social life"
    }

    category_labels = {
        "School": "School",
        "Home": "Home",
        "Social Lifestyle": "Social Lifestyle"
    }

    attention_labels = [
        category_labels[category]
        for category in attention_categories
    ]

    if len(attention_labels) == 1:

        attention_category_text = attention_labels[0]

        attention_category_description = (
            category_names[attention_categories[0]]
        )

    elif len(attention_labels) == 2:

        attention_category_text = (
            f"{attention_labels[0]} and "
            f"{attention_labels[1]}"
        )

        attention_category_description = (
            f"{category_names[attention_categories[0]]} "
            f"and "
            f"{category_names[attention_categories[1]]}"
        )

    else:

        attention_category_text = (
            ", ".join(attention_labels[:-1])
            + ", and "
            + attention_labels[-1]
        )

        attention_category_description = (
            ", ".join(
                category_names[category]
                for category in attention_categories[:-1]
            )
            + ", and "
            + category_names[attention_categories[-1]]
        )

    personalized_recommendations = {
        category: recommendations[category]
        for category in attention_categories
    }

    risk_explanation = {

        "Low": {
            "title": "Your answers show many positive areas 🌟",
            "description": (
                "Your responses suggest that you are doing well "
                "in several parts of your daily life. Keep practicing "
                "the healthy habits that are already working for you."
            )
        },

        "Moderate": {
            "title": "Some areas may need a little more attention 🌤️",
            "description": (
                "Your answers suggest that some parts of your daily "
                "life may be challenging right now. Small changes and "
                "talking with someone you trust can help."
            )
        },

        "High": {
            "title": "Some areas may be difficult right now 💙",
            "description": (
                "Your answers suggest that you may be experiencing "
                "challenges in some parts of your daily life. You do "
                "not have to handle these challenges alone, and talking "
                "with a trusted adult can be helpful."
            )
        }
    }

    cycle_assessment = assessment

    # Find the next/latest completed appointment for THIS assessment.
    completed_appointment = Appointment.query.filter(
        Appointment.student_id == student.student_id,
        Appointment.baseline_assessment_id ==
        cycle_assessment.assessment_id,
        db.func.lower(Appointment.status) == "completed"
    ).order_by(
        Appointment.appointment_id.desc()
    ).first()

    # Find the retake generated by THIS assessment.
    post_assessment = Assessment.query.filter_by(
        student_id=student.student_id,
        assessment_type="retake",
        previous_assessment_id=cycle_assessment.assessment_id
    ).order_by(
        Assessment.assessment_id.desc()
    ).first()

    can_take_again = (
        completed_appointment is not None
        and post_assessment is None
    )

    return render_template(
        "student/results.html",

        student=student,

        assessment=assessment,

        answers=answers,

        category_data=category_data,

        attention_categories=attention_categories,

        strongest_category=strongest_category,

        recommendations=personalized_recommendations,

        attention_category_text=attention_category_text,

        attention_category_description=(
            attention_category_description
        ),

        risk_explanation=risk_explanation.get(
            assessment.risk_level,
            {
                "title": "Assessment Result",
                "description": (
                    "Your assessment has been completed."
                )
            }
        ),

        can_take_again=can_take_again
    )


@app.route("/wellness")
def wellness():

    if session.get("role") != "student":
        return redirect("/")

    student = Student.query.get(session["user_id"])

    if not student:
        return redirect("/")

    mood_entries = MoodEntry.query.filter_by(
        student_id=student.student_id
    ).order_by(
        MoodEntry.created_at.desc()
    ).limit(10).all()

    return render_template(
        "student/wellness.html",
        mood_entries=mood_entries
    )


@app.route("/wellness/self-assessment", methods=["POST"])
def wellness_self_assessment():

    if session.get("role") != "student":
        return jsonify({
            "success": False,
            "message": "Unauthorized"
        }), 401

    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "No data received"
        }), 400

    average = data.get("average")

    try:
        average = float(average)
    except (TypeError, ValueError):
        return jsonify({
            "success": False,
            "message": "Invalid score"
        }), 400

    student = Student.query.get(session["user_id"])

    if not student:
        return jsonify({
            "success": False,
            "message": "Student not found"
        }), 404

    checkin = WellnessCheckIn(
        student_id=student.student_id,
        average_score=average
    )

    db.session.add(checkin)
    db.session.commit()

    return jsonify({
        "success": True
    })


@app.route("/wellness/anonymous-screening", methods=["POST"])
def anonymous_screening():
    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "No data received"
        }), 400

    overwhelmed = data.get("overwhelmed")
    motivation = data.get("motivation")
    support = data.get("support")

    allowed_overwhelmed = {"yes", "sometimes", "no"}
    allowed_motivation = {"yes", "sometimes", "no"}
    allowed_support = {"yes", "maybe", "no"}

    if (
        overwhelmed not in allowed_overwhelmed
        or motivation not in allowed_motivation
        or support not in allowed_support
    ):
        return jsonify({
            "success": False,
            "message": "Invalid screening response"
        }), 400

    if session.get("role") != "student" or not session.get("user_id"):
        return jsonify({
            "success": False,
            "message": "Student login required"
        }), 401

    student_id = session["user_id"]

    anonymous_key = hashlib.sha256(
        f"sparkcheck-anonymous-student-{student_id}-{app.secret_key}".encode()
    ).hexdigest()

    existing = AnonymousScreening.query.filter_by(
        anonymous_key=anonymous_key
    ).first()

    if existing:
        existing.overwhelmed = overwhelmed
        existing.motivation = motivation
        existing.support = support
        existing.created_at = datetime.utcnow()
    else:
        screening = AnonymousScreening(
            anonymous_key=anonymous_key,
            overwhelmed=overwhelmed,
            motivation=motivation,
            support=support
        )

        db.session.add(screening)

    db.session.commit()

    return jsonify({
        "success": True
    })


@app.route("/wellness/mood", methods=["POST"])
def save_mood():

    if session.get("role") != "student":
        return jsonify({
            "success": False,
            "message": "Unauthorized"
        }), 401

    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "No data received"
        }), 400

    mood = data.get("mood")
    note = data.get("note", "").strip()

    allowed_moods = [
        "Great",
        "Good",
        "Okay",
        "Not Great",
        "Difficult"
    ]

    if mood not in allowed_moods:
        return jsonify({
            "success": False,
            "message": "Invalid mood"
        }), 400

    if len(note) > 500:
        return jsonify({
            "success": False,
            "message": "Note is too long"
        }), 400

    student = Student.query.get(session["user_id"])

    if not student:
        return jsonify({
            "success": False,
            "message": "Student not found"
        }), 404

    entry = MoodEntry(
        student_id=student.student_id,
        mood=mood,
        note=note
    )

    db.session.add(entry)
    db.session.commit()

    return jsonify({
        "success": True
    })


@app.route("/support-resources")
def support_resources():

    if session.get("role") != "student":
        return redirect("/")

    student = Student.query.get(session["user_id"])

    if not student:
        return redirect("/")

    appointments = Appointment.query.filter_by(
        student_id=student.student_id
    ).order_by(
        Appointment.scheduled_date.asc(),
        Appointment.scheduled_time.asc()
    ).all()

    return render_template(
        "student/support_resources.html",
        appointments=appointments
    )


@app.route("/student/support/appointments")
def student_support_appointments():
    if session.get("role") != "student":
        return jsonify({
            "success": False,
            "message": "Unauthorized."
        }), 403

    student = Student.query.get(session["user_id"])

    if not student:
        return jsonify({
            "success": False,
            "message": "Student not found."
        }), 404

    appointments = Appointment.query.filter_by(
        student_id=student.student_id
    ).order_by(
        Appointment.scheduled_date.desc(),
        Appointment.scheduled_time.desc()
    ).all()

    results = []

    for appointment in appointments:
        if appointment.counselor_admin:
            counselor_name = (
                f"{appointment.counselor_admin.first_name} "
                f"{appointment.counselor_admin.last_name}"
            )
            counselor_role = "School Counselor"
        elif appointment.counselor:
            counselor_name = (
                f"{appointment.counselor.first_name} "
                f"{appointment.counselor.last_name}"
            )
            counselor_role = "Teacher"
        else:
            counselor_name = "Waiting for counselor assignment"
            counselor_role = "Pending"

        results.append({
            "appointment_id": appointment.appointment_id,
            "counselor": counselor_name,
            "counselor_role": counselor_role,
            "date": (
                appointment.scheduled_date.strftime("%b %d, %Y")
                if appointment.scheduled_date
                else None
            ),
            "time": (
                appointment.scheduled_time.strftime("%I:%M %p")
                if appointment.scheduled_time
                else None
            ),
            "status": appointment.status,
            "request_source": appointment.request_source,
            "reason": appointment.reason or "Student support"
        })

    return jsonify({
        "success": True,
        "appointments": results
    })


@app.route("/student/support/request", methods=["POST"])
def request_counselor_support():
    if session.get("role") != "student":
        return jsonify({
            "success": False,
            "message": "You must be logged in as a student."
        }), 401

    student = Student.query.get(session["user_id"])

    if not student:
        return jsonify({
            "success": False,
            "message": "Student account could not be found."
        }), 404

    existing = Appointment.query.filter(
        Appointment.student_id == student.student_id,
        Appointment.status.in_(["Pending", "Confirmed"])
    ).first()

    if existing:
        return jsonify({
            "success": False,
            "message": "You already have an active counselor support request or appointment."
        }), 400

    data = request.get_json(silent=True) or {}

    reason = data.get(
        "reason",
        "Student requested counselor support"
    )

    appointment = Appointment(
        student_id=student.student_id,
        status="Pending",
        request_source="Student",
        reason=reason
    )

    db.session.add(appointment)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Your counselor support request has been sent. A counselor can review it and arrange a support session."
    })


@app.route("/profile")
def student_profile():
    if session.get("role") != "student":
        return redirect("/")

    student = Student.query.get(session["user_id"])

    if not student:
        return redirect("/")

    teacher = Teacher.query.get(student.teacher_id)

    return render_template(
        "student/profile.html",
        student=student,
        teacher=teacher
    )


@app.route("/profile/change-password", methods=["POST"])
def change_student_password():
    if session.get("role") != "student":
        return redirect("/")

    student = Student.query.get(session["user_id"])

    if not student:
        return redirect("/")

    current_password = request.form.get("current_password", "")
    new_password = request.form.get("new_password", "")
    confirm_password = request.form.get("confirm_password", "")

    if not check_password_hash(student.password, current_password):
        flash("Your current password is incorrect.", "error")
        return redirect("/profile")

    if len(new_password) < 6:
        flash("Your new password must be at least 6 characters long.", "error")
        return redirect("/profile")

    if new_password != confirm_password:
        flash("The new passwords do not match.", "error")
        return redirect("/profile")

    if check_password_hash(student.password, new_password):
        flash("Your new password must be different from your current password.", "error")
        return redirect("/profile")

    student.password = generate_password_hash(new_password)
    db.session.commit()

    flash("Your password has been changed successfully.", "success")
    return redirect("/profile")








@app.route("/teacher")
def teacher_dashboard():

    if session.get("role") != "teacher":
        return redirect("/")

    teacher = Teacher.query.get(
        session["user_id"]
    )

    if not teacher:
        return redirect("/")

    students = Student.query.filter_by(
        teacher_id=teacher.teacher_id
    ).all()

    student_ids = [
        student.student_id
        for student in students
    ]

    latest_assessments = []

    if student_ids:

        all_assessments = Assessment.query.filter(
            Assessment.student_id.in_(student_ids)
        ).order_by(
            Assessment.assessment_id.desc()
        ).all()

        latest = {}

        for assessment in all_assessments:

            if assessment.student_id not in latest:
                latest[assessment.student_id] = assessment

        latest_assessments = list(
            latest.values()
        )

    dashboard_assessments = []

    for assessment in latest_assessments:

        dashboard_assessments.append({

            "student_id":
                assessment.student_id,

            "student_name":
                f"{assessment.student.first_name} "
                f"{assessment.student.last_name}",

            "risk_level":
                assessment.risk_level,

            "percentage":
                assessment.percentage,

            "assessment_id":
                assessment.assessment_id,

            "submitted_at":
                assessment.submitted_at.isoformat()
                if assessment.submitted_at
                else ""

        })

    appointments = Appointment.query.filter(
        Appointment.counselor_id == teacher.teacher_id,
        Appointment.status.in_([
            "Pending",
            "Confirmed"
        ])
    ).order_by(
        Appointment.scheduled_date.asc(),
        Appointment.scheduled_time.asc()
    ).all()

    appointment_data = []

    for appointment in appointments:

        student = appointment.student

        if appointment.counselor_admin:

            counselor_name = (
                f"{appointment.counselor_admin.first_name} "
                f"{appointment.counselor_admin.last_name}"
            )

        elif appointment.counselor:

            counselor_name = (
                f"{appointment.counselor.first_name} "
                f"{appointment.counselor.last_name}"
            )

        else:

            counselor_name = "Counselor"

        appointment_data.append({

            "appointment_id":
                appointment.appointment_id,

            "student_id":
                appointment.student_id,

            "student_name":
                (
                    f"{student.first_name} "
                    f"{student.last_name}"
                )
                if student
                else "Unknown Student",

            "student_code":
                student.student_code
                if student
                else "",

            "grade_level":
                student.grade_level
                if student
                else "",

            "section":
                student.section
                if student
                else "",

            "counselor_name":
                counselor_name,

            "date":
                appointment.scheduled_date.strftime(
                    "%B %d, %Y"
                )
                if appointment.scheduled_date
                else "",

            "time":
                appointment.scheduled_time.strftime(
                    "%I:%M %p"
                )
                if appointment.scheduled_time
                else "",

            "status":
                appointment.status or "Pending",

            "reason":
                appointment.reason or "Student follow-up",

            "notes":
                appointment.notes or "",

            "baseline_assessment_id":
                appointment.baseline_assessment_id

        })

    return render_template(
        "teacher/dashboard.html",
        teacher=teacher,
        students=students,
        assessments=latest_assessments,
        assessment_data=dashboard_assessments,
        appointment_data=appointment_data
    )



@app.route(
    "/teacher/appointments/<int:appointment_id>/confirm",
    methods=["POST"]
)
def teacher_confirm_appointment(appointment_id):

    if session.get("role") != "teacher":
        return jsonify({
            "success": False,
            "message": "Unauthorized."
        }), 403

    teacher = Teacher.query.get(
        session["user_id"]
    )

    if not teacher:
        return jsonify({
            "success": False,
            "message": "Teacher not found."
        }), 404

    appointment = Appointment.query.filter_by(
        appointment_id=appointment_id,
        counselor_id=teacher.teacher_id
    ).first()

    if not appointment:
        return jsonify({
            "success": False,
            "message": "Appointment not found."
        }), 404

    if appointment.status != "Pending":
        return jsonify({
            "success": False,
            "message": "This appointment is no longer pending."
        }), 400

    appointment.status = "Confirmed"

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Appointment confirmed successfully.",
        "status": appointment.status
    })




@app.route("/teacher/student/<int:student_id>/attempts")
def student_attempts(student_id):

    if session.get("role") != "teacher":
        return jsonify([])

    teacher = Teacher.query.get(session["user_id"])

    if not teacher:
        return jsonify([])

    student = Student.query.filter_by(
        student_id=student_id,
        teacher_id=teacher.teacher_id
    ).first()

    if not student:
        return jsonify([])

    assessments = Assessment.query.filter_by(
        student_id=student.student_id
    ).order_by(
        Assessment.assessment_id.asc()
    ).all()

    if not assessments:
        return jsonify([])

    assessment_map = {
        assessment.assessment_id: assessment
        for assessment in assessments
    }

    def get_category_data(assessment):

        categories = {
            "School": [],
            "Home": [],
            "Social Lifestyle": []
        }

        if not assessment:
            return {
                "School": {
                    "average": 0,
                    "percentage": 0
                },
                "Home": {
                    "average": 0,
                    "percentage": 0
                },
                "Social Lifestyle": {
                    "average": 0,
                    "percentage": 0
                }
            }

        answers = AssessmentAnswer.query.filter_by(
            assessment_id=assessment.assessment_id
        ).all()

        for answer in answers:

            question = AssessmentQuestion.query.get(
                answer.question_id
            )

            if not question:
                continue

            category = question.category

            if category == "Self":
                category = "Social Lifestyle"

            elif category == "Health":
                category = "Home"

            if category not in categories:
                continue

            categories[category].append(
                answer.weighted_score
            )

        result = {}

        for category, scores in categories.items():

            if scores:

                average = round(
                    sum(scores) / len(scores),
                    2
                )

                percentage = round(
                    (average / 3) * 100,
                    1
                )

            else:

                average = 0
                percentage = 0

            result[category] = {
                "average": average,
                "percentage": percentage
            }

        return result

    def serialize_assessment(assessment):

        if not assessment:
            return None

        return {
            "assessment_id": assessment.assessment_id,

            "assessment_type": (
                assessment.assessment_type
                or "initial"
            ),

            "previous_assessment_id": getattr(
                assessment,
                "previous_assessment_id",
                None
            ),

            "submitted_at": (
                assessment.submitted_at.strftime(
                    "%Y-%m-%d %H:%M"
                )
                if assessment.submitted_at
                else ""
            ),

            "percentage": float(
                assessment.percentage or 0
            ),

            "risk_level": (
                assessment.risk_level or "Low"
            ),

            "categories": get_category_data(
                assessment
            )
        }

    cycles = []
    used_assessment_ids = set()

    for assessment in assessments:

        assessment_id = assessment.assessment_id

        if assessment_id in used_assessment_ids:
            continue

        if assessment.assessment_type == "retake":

            previous_id = getattr(
                assessment,
                "previous_assessment_id",
                None
            )

            initial = (
                assessment_map.get(previous_id)
                if previous_id
                else None
            )

            if initial:

                cycle = {
                    "cycle_id": initial.assessment_id,
                    "initial": initial,
                    "retake": assessment
                }

                cycles.append(cycle)

                used_assessment_ids.add(
                    initial.assessment_id
                )

                used_assessment_ids.add(
                    assessment_id
                )

                continue

            cycles.append({
                "cycle_id": assessment.assessment_id,
                "initial": None,
                "retake": assessment
            })

            used_assessment_ids.add(
                assessment_id
            )

            continue

        if assessment.assessment_type == "initial":

            retake = None

            for possible_retake in assessments:

                if possible_retake.assessment_type != "retake":
                    continue

                previous_id = getattr(
                    possible_retake,
                    "previous_assessment_id",
                    None
                )

                if previous_id == assessment_id:

                    retake = possible_retake
                    break

            cycles.append({
                "cycle_id": assessment_id,
                "initial": assessment,
                "retake": retake
            })

            used_assessment_ids.add(
                assessment_id
            )

            if retake:
                used_assessment_ids.add(
                    retake.assessment_id
                )

            continue

        cycles.append({
            "cycle_id": assessment_id,
            "initial": assessment,
            "retake": None
        })

        used_assessment_ids.add(
            assessment_id
        )

    cycles.sort(
        key=lambda cycle:
        cycle["cycle_id"]
    )

    result = []

    for cycle_number, cycle in enumerate(
        cycles,
        start=1
    ):

        initial = cycle["initial"]
        retake = cycle["retake"]

        if not initial and not retake:
            continue

        initial_result = serialize_assessment(
            initial
        )

        retake_result = serialize_assessment(
            retake
        )

        latest = (
            retake
            if retake
            else initial
        )

        if not latest:
            continue

        result.append({
            "cycle_id": cycle["cycle_id"],

            "cycle_number": cycle_number,

            "assessment_id": latest.assessment_id,

            "assessment_type": (
                latest.assessment_type
                or "initial"
            ),

            "has_retake": (
                retake is not None
            ),

            "initial_result": initial_result,

            "retake_result": retake_result,

            "percentage": float(
                latest.percentage or 0
            ),

            "risk_level": (
                latest.risk_level or "Low"
            ),

            "submitted_at": (
                latest.submitted_at.strftime(
                    "%Y-%m-%d %H:%M"
                )
                if latest.submitted_at
                else ""
            )
        })

    result.reverse()

    return jsonify(result)



@app.route("/teacher/student/<int:student_id>/debug-attempts")
def debug_student_attempts(student_id):

    if session.get("role") != "teacher":
        return jsonify({
            "error": "Unauthorized",
            "session_role": session.get("role"),
            "session_user_id": session.get("user_id")
        }), 403

    teacher = Teacher.query.get(
        session["user_id"]
    )

    if not teacher:
        return jsonify({
            "error": "Teacher not found"
        }), 403

    student = Student.query.filter_by(
        student_id=student_id,
        teacher_id=teacher.teacher_id
    ).first()

    if not student:
        return jsonify({
            "error": "Student not found"
        }), 404

    assessments = Assessment.query.filter_by(
        student_id=student.student_id
    ).order_by(
        Assessment.assessment_id.asc()
    ).all()

    appointments = Appointment.query.filter_by(
        student_id=student.student_id
    ).order_by(
        Appointment.appointment_id.asc()
    ).all()

    return jsonify({

        "student": {
            "student_id": student.student_id,
            "name": (
                f"{student.first_name} "
                f"{student.last_name}"
            )
        },

        "assessments": [
            {
                "assessment_id": assessment.assessment_id,
                "assessment_type": assessment.assessment_type,
                "previous_assessment_id": getattr(
                    assessment,
                    "previous_assessment_id",
                    None
                ),
                "percentage": float(
                    assessment.percentage or 0
                ),
                "risk_level": (
                    assessment.risk_level or ""
                ),
                "submitted_at": (
                    assessment.submitted_at.strftime(
                        "%Y-%m-%d %H:%M:%S"
                    )
                    if assessment.submitted_at
                    else None
                )
            }
            for assessment in assessments
        ],

        "appointments": [
            {
                "appointment_id": appointment.appointment_id,
                "student_id": appointment.student_id,
                "baseline_assessment_id": (
                    appointment.baseline_assessment_id
                ),
                "status": appointment.status,
                "scheduled_date": (
                    appointment.scheduled_date.strftime(
                        "%Y-%m-%d"
                    )
                    if appointment.scheduled_date
                    else None
                ),
                "scheduled_time": (
                    appointment.scheduled_time.strftime(
                        "%H:%M:%S"
                    )
                    if appointment.scheduled_time
                    else None
                )
            }
            for appointment in appointments
        ]
    })


@app.route("/teacher/student/<int:student_id>")
def teacher_student_details(student_id):
    if session.get("role") != "teacher":
        return jsonify({"success":False})

    teacher=Teacher.query.get(session["user_id"])

    student=Student.query.filter_by(
        student_id=student_id,
        teacher_id=teacher.teacher_id
    ).first()

    if not student:
        return jsonify({"success":False})

    assessments=Assessment.query.filter_by(
        student_id=student.student_id
    ).order_by(
        Assessment.assessment_id.asc()
    ).all()

    attempts=[]

    for assessment in assessments:
        if assessment.assessment_type=="retake":
            continue

        retake=None

        for possible_retake in assessments:
            if possible_retake.assessment_type!="retake":
                continue

            previous_id=getattr(
                possible_retake,
                "previous_assessment_id",
                None
            )

            if previous_id==assessment.assessment_id:
                retake=possible_retake
                break

        latest=retake if retake else assessment

        attempts.append({
            "attempt_number":len(attempts)+1,
            "initial":{
                "assessment_id":assessment.assessment_id,
                "submitted_at":assessment.submitted_at.strftime(
                    "%Y-%m-%d %H:%M"
                ) if assessment.submitted_at else "",
                "risk_level":assessment.risk_level,
                "percentage":float(assessment.percentage or 0)
            },
            "retake":{
                "assessment_id":retake.assessment_id,
                "submitted_at":retake.submitted_at.strftime(
                    "%Y-%m-%d %H:%M"
                ) if retake.submitted_at else "",
                "risk_level":retake.risk_level,
                "percentage":float(retake.percentage or 0)
            } if retake else None,
            "completed":retake is not None,
            "latest":{
                "assessment_id":latest.assessment_id,
                "submitted_at":latest.submitted_at.strftime(
                    "%Y-%m-%d %H:%M"
                ) if latest.submitted_at else "",
                "risk_level":latest.risk_level,
                "percentage":float(latest.percentage or 0)
            }
        })

    attempts.reverse()

    for index,attempt in enumerate(attempts):
        attempt["attempt_number"]=len(attempts)-index

    latest_attempt=attempts[0] if attempts else None

    before_support=None
    after_support=None

    if latest_attempt:
        before_support=latest_attempt["initial"]
        after_support=latest_attempt["retake"]

    return jsonify({
        "success":True,
        "student":{
            "name":f"{student.first_name} {student.last_name}",
            "code":student.student_code,
            "age":student.age,
            "grade":student.grade_level,
            "section":student.section
        },
        "latest":latest_attempt["latest"] if latest_attempt else None,
        "before_support":before_support,
        "after_support":after_support,
        "history":attempts
    })


@app.route("/teacher/students")
def teacher_students():

    if session.get("role") != "teacher":
        return redirect("/")


    teacher = Teacher.query.get(session["user_id"])


    students = Student.query.filter_by(
        teacher_id=teacher.teacher_id
    ).all()


    return render_template(
        "teacher/students.html",
        teacher=teacher,
        students=students
    )

@app.route("/teacher/student/<int:student_id>/temporary-password", methods=["POST"])
def teacher_student_temporary_password(student_id):

    if session.get("role") != "teacher":
        return jsonify({
            "success": False,
            "message": "Unauthorized."
        }), 403

    teacher = Teacher.query.get(session["user_id"])

    if not teacher:
        return jsonify({
            "success": False,
            "message": "Teacher account not found."
        }), 404

    student = Student.query.filter_by(
        student_id=student_id,
        teacher_id=teacher.teacher_id
    ).first()

    if not student:
        return jsonify({
            "success": False,
            "message": "Student not found."
        }), 404

    characters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"

    temporary_password = "".join(
        secrets.choice(characters)
        for _ in range(10)
    )

    student.password = generate_password_hash(
        temporary_password
    )

    db.session.commit()

    return jsonify({
        "success": True,
        "temporary_password": temporary_password
    })

@app.route("/teacher/reports")
def teacher_reports():

    if session.get("role") != "teacher":
        return redirect("/")

    teacher = Teacher.query.get(session["user_id"])

    students = Student.query.filter_by(
        teacher_id=teacher.teacher_id
    ).all()

    student_ids = [
        student.student_id
        for student in students
    ]

    all_assessments = []

    if student_ids:
        all_assessments = Assessment.query.filter(
            Assessment.student_id.in_(student_ids)
        ).order_by(
            Assessment.submitted_at.asc(),
            Assessment.assessment_id.asc()
        ).all()

    assessments_by_student = {}

    for assessment in all_assessments:

        if assessment.student_id not in assessments_by_student:
            assessments_by_student[assessment.student_id] = []

        assessments_by_student[assessment.student_id].append(
            assessment
        )

    def get_categories(assessment):

        category_scores = {
            "School": [],
            "Home": [],
            "Social Lifestyle": []
        }

        for answer in assessment.answers:

            question = AssessmentQuestion.query.get(
                answer.question_id
            )

            if not question:
                continue

            category = question.category

            if category == "Self":
                category = "Social Lifestyle"

            if category == "Health":
                category = "Home"

            if category in category_scores:
                category_scores[category].append(
                    answer.weighted_score
                )

        categories = {}

        for category, scores in category_scores.items():

            if not scores:
                categories[category] = {
                    "average": None,
                    "challenge_percentage": 0
                }
                continue

            average = round(
                sum(scores) / len(scores),
                2
            )

            challenge_points = sum(
                3 - score
                for score in scores
            )

            max_points = len(scores) * 2

            challenge_percentage = round(
                (challenge_points / max_points) * 100,
                1
            ) if max_points else 0

            categories[category] = {
                "average": average,
                "challenge_percentage": challenge_percentage
            }

        return categories

    def get_cycle_assessments(student_assessments):

        cycles = []

        for assessment in student_assessments:

            if assessment.assessment_type == "retake":
                continue

            retake = None

            for possible_retake in assessment.follow_up_assessments:

                if possible_retake.assessment_type == "retake":
                    retake = possible_retake
                    break

            latest = retake if retake else assessment

            cycles.append({
                "initial": assessment,
                "retake": retake,
                "latest": latest
            })

        return cycles

    all_cycles = []

    for student in students:

        student_assessments = assessments_by_student.get(
            student.student_id,
            []
        )

        cycles = get_cycle_assessments(
            student_assessments
        )

        for cycle in cycles:

            all_cycles.append({
                "student": student,
                "initial": cycle["initial"],
                "retake": cycle["retake"],
                "latest": cycle["latest"]
            })

    latest_assessments = []

    latest_categories_by_student = {}

    for student in students:

        student_assessments = assessments_by_student.get(
            student.student_id,
            []
        )

        cycles = get_cycle_assessments(
            student_assessments
        )

        if not cycles:
            continue

        latest_cycle = cycles[-1]

        latest_assessment = latest_cycle["latest"]

        latest_assessments.append(
            latest_assessment
        )

        latest_categories_by_student[
            student.student_id
        ] = get_categories(
            latest_assessment
        )

    risk_counts = {
        "High": 0,
        "Moderate": 0,
        "Low": 0
    }

    challenge_points = {
        "School": 0,
        "Home": 0,
        "Social Lifestyle": 0
    }

    challenge_max = {
        "School": 0,
        "Home": 0,
        "Social Lifestyle": 0
    }

    total_percentage = 0

    score_distribution = {
        "0-20": 0,
        "21-40": 0,
        "41-60": 0,
        "61-80": 0,
        "81-100": 0
    }

    priority_students = []

    for assessment in latest_assessments:

        risk_counts[assessment.risk_level] += 1

        percentage = float(
            assessment.percentage
        )

        total_percentage += percentage

        if percentage <= 20:
            score_distribution["0-20"] += 1
        elif percentage <= 40:
            score_distribution["21-40"] += 1
        elif percentage <= 60:
            score_distribution["41-60"] += 1
        elif percentage <= 80:
            score_distribution["61-80"] += 1
        else:
            score_distribution["81-100"] += 1

        categories = get_categories(
            assessment
        )

        main_category = "-"
        highest_challenge = -1

        for category, data in categories.items():

            challenge = data["challenge_percentage"]

            if data["average"] is not None:

                total_questions = len([
                    answer
                    for answer in assessment.answers
                    if (
                        AssessmentQuestion.query.get(
                            answer.question_id
                        )
                        and (
                            AssessmentQuestion.query.get(
                                answer.question_id
                            ).category == category
                            or (
                                category == "Social Lifestyle"
                                and AssessmentQuestion.query.get(
                                    answer.question_id
                                ).category == "Self"
                            )
                            or (
                                category == "Home"
                                and AssessmentQuestion.query.get(
                                    answer.question_id
                                ).category == "Health"
                            )
                        )
                    )
                ])

                challenge_points[category] += (
                    challenge * total_questions / 100 * 2
                )

                challenge_max[category] += (
                    total_questions * 2
                )

            if challenge > highest_challenge:
                highest_challenge = challenge
                main_category = category

        priority_students.append({

            "student":
                f"{assessment.student.first_name} "
                f"{assessment.student.last_name}",

            "code":
                assessment.student.student_code,

            "risk":
                assessment.risk_level,

            "percentage":
                percentage,

            "main_challenge":
                main_category,

            "date":
                assessment.submitted_at.strftime(
                    "%Y-%m-%d"
                )

        })

    challenge_percentages = {}

    for category in challenge_points:

        if challenge_max[category] == 0:

            challenge_percentages[category] = 0

        else:

            challenge_percentages[category] = round(
                (
                    challenge_points[category]
                    / challenge_max[category]
                ) * 100,
                1
            )

    wellness_score = round(
        total_percentage / len(latest_assessments),
        1
    ) if latest_assessments else 0

    completion_rate = round(
        (
            len(latest_assessments)
            / len(students)
        ) * 100,
        1
    ) if students else 0

    top_challenge = (
        max(
            challenge_percentages,
            key=challenge_percentages.get
        )
        if challenge_percentages
        else "None"
    )

    priority_students.sort(
        key=lambda x: (
            {
                "High": 0,
                "Moderate": 1,
                "Low": 2
            }[x["risk"]],
            x["percentage"]
        )
    )

    student_data = []

    for student in students:

        student_data.append({

            "student_id":
                student.student_id,

            "first_name":
                student.first_name,

            "last_name":
                student.last_name,

            "student_code":
                student.student_code

        })

    trend_data = []

    for cycle in all_cycles:

        initial = cycle["initial"]
        retake = cycle["retake"]
        latest = cycle["latest"]

        trend_data.append({

            "assessment_id":
                latest.assessment_id,

            "student_id":
                latest.student_id,

            "student":
                f"{latest.student.first_name} "
                f"{latest.student.last_name}",

            "initial_percentage":
                float(initial.percentage),

            "retake_percentage":
                float(retake.percentage)
                if retake else None,

            "percentage":
                float(latest.percentage),

            "initial_risk":
                initial.risk_level,

            "retake_risk":
                retake.risk_level
                if retake
                else None,

            "risk_level":
                latest.risk_level,

            "initial_date":
                initial.submitted_at.strftime(
                    "%Y-%m-%d"
                ),

            "retake_date":
                retake.submitted_at.strftime(
                    "%Y-%m-%d"
                )
                if retake
                else None,

            "date":
                latest.submitted_at.strftime(
                    "%Y-%m-%d"
                ),

            "assessment_type":
                latest.assessment_type,

            "attempt_number":
                sum(
                    1
                    for previous in all_cycles
                    if (
                        previous["student"].student_id
                        == latest.student_id
                        and previous["latest"].submitted_at
                        <= latest.submitted_at
                    )
                )

        })

    analytics = {

        "risk_counts":
            risk_counts,

        "challenge_percentages":
            challenge_percentages,

        "score_distribution":
            score_distribution,

        "wellness_score":
            wellness_score,

        "completion_rate":
            completion_rate,

        "top_challenge":
            top_challenge,

        "priority_students":
            priority_students,

        "trend_data":
            trend_data,

        "latest_categories_by_student":
            latest_categories_by_student

    }

    return render_template(

        "teacher/reports.html",

        teacher=teacher,

        students=students,

        student_data=student_data,

        assessments=latest_assessments,

        analytics=analytics,

        trend_data=trend_data

    )


@app.route("/teacher/profile")
def teacher_profile():
    if session.get("role") != "teacher":
        return redirect("/")

    teacher = Teacher.query.get(session["user_id"])

    if not teacher:
        return redirect("/")

    students = Student.query.filter_by(
        teacher_id=teacher.teacher_id
    ).all()

    return render_template(
        "teacher/teacher_profile.html",
        teacher=teacher,
        students=students
    )


@app.route("/teacher/profile/change-password", methods=["POST"])
def change_teacher_password():
    if session.get("role") != "teacher":
        return redirect("/")

    teacher = Teacher.query.get(session["user_id"])

    if not teacher:
        return redirect("/")

    current_password = request.form.get("current_password", "")
    new_password = request.form.get("new_password", "")
    confirm_password = request.form.get("confirm_password", "")

    password_valid = False

    try:
        password_valid = check_password_hash(
            teacher.password,
            current_password
        )
    except ValueError:
        password_valid = teacher.password == current_password

    if not password_valid:
        flash("Your current password is incorrect.", "error")
        return redirect("/teacher/profile")

    if len(new_password) < 6:
        flash("Your new password must be at least 6 characters long.", "error")
        return redirect("/teacher/profile")

    if new_password != confirm_password:
        flash("The new passwords do not match.", "error")
        return redirect("/teacher/profile")

    if current_password == new_password:
        flash("Your new password must be different from your current password.", "error")
        return redirect("/teacher/profile")

    teacher.password = generate_password_hash(new_password)
    db.session.commit()

    flash("Your password has been changed successfully.", "success")
    return redirect("/teacher/profile")







@app.route("/admin")
def admin_dashboard():
    if session.get("role") != "admin":
        return redirect("/")

    students = Student.query.all()
    total_attempts = Assessment.query.count()

    students_assessed = 0
    high_risk = 0
    moderate_risk = 0
    low_risk = 0
    at_risk_students = []

    for student in students:
        latest = Assessment.query.filter_by(
            student_id=student.student_id
        ).order_by(
            Assessment.assessment_id.desc()
        ).first()

        if not latest:
            continue

        students_assessed += 1

        if latest.risk_level == "High":
            high_risk += 1
            at_risk_students.append({
                "student": student,
                "assessment": latest
            })

        elif latest.risk_level == "Moderate":
            moderate_risk += 1
            at_risk_students.append({
                "student": student,
                "assessment": latest
            })

        elif latest.risk_level == "Low":
            low_risk += 1

    at_risk_students.sort(
        key=lambda item: (
            0 if item["assessment"].risk_level == "High" else 1,
            -item["assessment"].assessment_id
        )
    )

    if students_assessed:
        high_risk_percent = round(
            (high_risk / students_assessed) * 100
        )
        moderate_risk_percent = round(
            (moderate_risk / students_assessed) * 100
        )
        low_risk_percent = round(
            (low_risk / students_assessed) * 100
        )
    else:
        high_risk_percent = 0
        moderate_risk_percent = 0
        low_risk_percent = 0

    teachers = Teacher.query.filter_by(
        is_admin=False
    ).order_by(
        Teacher.grade_level,
        Teacher.section
    ).all()

    teacher_cards = []

    for teacher in teachers:
        teacher_students = Student.query.filter_by(
            teacher_id=teacher.teacher_id
        ).all()

        completed_students = 0
        student_attempts = 0

        for student in teacher_students:
            attempts = Assessment.query.filter_by(
                student_id=student.student_id
            ).all()

            if attempts:
                completed_students += 1

            student_attempts += len(attempts)

        teacher_cards.append({
            "teacher": teacher,
            "student_count": len(teacher_students),
            "completed_count": completed_students,
            "assessment_count": student_attempts
        })

    appointments = Appointment.query.order_by(
        Appointment.appointment_id.desc()
    ).all()

    pending_appointments = [
        appointment
        for appointment in appointments
        if appointment.status == "Pending"
    ]

    upcoming_appointments = [
        appointment
        for appointment in appointments
        if appointment.status in ["Pending", "Confirmed"]
        and appointment.scheduled_date
        and appointment.scheduled_time
    ]

    completed_appointments = [
        appointment
        for appointment in appointments
        if appointment.status == "Completed"
    ]

    recent_appointments = [
        appointment
        for appointment in appointments
        if appointment.scheduled_date
    ][:5]

    return render_template(
        "admin/admin_dashboard.html",
        teachers=teacher_cards,
        total_teachers=len(teachers),
        total_students=len(students),
        total_assessments=students_assessed,
        total_attempts=total_attempts,
        students_assessed=students_assessed,
        high_risk=high_risk,
        moderate_risk=moderate_risk,
        low_risk=low_risk,
        high_risk_percent=high_risk_percent,
        moderate_risk_percent=moderate_risk_percent,
        low_risk_percent=low_risk_percent,
        at_risk_students=at_risk_students,
        appointments=appointments,
        pending_appointments=len(pending_appointments),
        upcoming_appointments=len(upcoming_appointments),
        completed_appointments=len(completed_appointments),
        recent_appointments=recent_appointments
    )

@app.route("/admin/teachers")
def admin_teachers():
    if session.get("role") != "admin":
        return redirect("/")

    teachers = Teacher.query.filter_by(
        is_admin=False
    ).order_by(
        Teacher.grade_level,
        Teacher.section
    ).all()

    teacher_cards = []

    for teacher in teachers:
        students = Student.query.filter_by(
            teacher_id=teacher.teacher_id
        ).all()

        completed_students = 0
        assessment_count = 0

        for student in students:
            attempts = Assessment.query.filter_by(
                student_id=student.student_id
            ).all()

            if attempts:
                completed_students += 1

            assessment_count += len(attempts)

        teacher_cards.append({
            "teacher": teacher,
            "student_count": len(students),
            "completed_count": completed_students,
            "assessment_count": assessment_count
        })

    return render_template(
        "admin/admin_teachers.html",
        teachers=teacher_cards,
        total_teachers=len(teachers)
    )


@app.route("/admin/add-teacher", methods=["POST"])
def add_teacher():
    if session.get("role") != "admin":
        return jsonify({
            "success": False,
            "message": "Unauthorized."
        }), 403

    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "message": "No data received."
            })

        first_name = data.get("first_name", "").strip()
        last_name = data.get("last_name", "").strip()
        section = data.get("section", "").strip()
        grade_level = data.get("grade_level")

        if not first_name or not last_name or not section or not grade_level:
            return jsonify({
                "success": False,
                "message": "Please complete all required fields."
            })

        grade_level = int(grade_level)

        existing = Teacher.query.filter_by(
            grade_level=grade_level,
            section=section,
            is_admin=False
        ).first()

        if existing:
            return jsonify({
                "success": False,
                "message": f"Grade {grade_level} - {section} already has an assigned teacher."
            })

        section_exists = GradeSection.query.filter_by(
            grade_level=grade_level,
            section=section
        ).first()

        if not section_exists:
            new_section = GradeSection(
                grade_level=grade_level,
                section=section
            )
            db.session.add(new_section)
            db.session.flush()

        last_teacher = Teacher.query.order_by(
            Teacher.teacher_id.desc()
        ).first()

        next_code = 1

        if last_teacher and last_teacher.teacher_code:
            try:
                next_code = int(
                    last_teacher.teacher_code.replace("TCH", "")
                ) + 1
            except:
                next_code = Teacher.query.count() + 1

        teacher_code = f"TCH{next_code:03d}"

        base_email = (
            first_name[0].lower() +
            last_name.lower()
        )

        email = f"{base_email}@sparkcheck.edu"
        counter = 2

        while Teacher.query.filter_by(email=email).first():
            email = f"{base_email}{counter}@sparkcheck.edu"
            counter += 1

        default_password = "123456"

        teacher = Teacher(
            teacher_code=teacher_code,
            first_name=first_name,
            last_name=last_name,
            email=email,
            password=generate_password_hash(default_password),
            grade_level=grade_level,
            section=section,
            is_admin=False
        )

        db.session.add(teacher)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Teacher added successfully.",
            "teacher": {
                "teacher_id": teacher.teacher_id,
                "teacher_name": f"{teacher.first_name} {teacher.last_name}",
                "teacher_code": teacher.teacher_code,
                "grade": teacher.grade_level,
                "section": teacher.section,
                "email": teacher.email,
                "password": default_password
            }
        })

    except Exception as e:
        db.session.rollback()

        print("ADD TEACHER ERROR:", e)

        return jsonify({
            "success": False,
            "message": "Database error: " + str(e)
        }), 500


@app.route("/admin/delete-teacher/<int:teacher_id>", methods=["POST"])
def delete_teacher(teacher_id):
    if session.get("role") != "admin":
        return jsonify({
            "success": False,
            "message": "Unauthorized."
        }), 403

    try:
        teacher = Teacher.query.get_or_404(teacher_id)

        students = Student.query.filter_by(
            teacher_id=teacher.teacher_id
        ).all()

        for student in students:
            assessments = Assessment.query.filter_by(
                student_id=student.student_id
            ).all()

            for assessment in assessments:
                AssessmentAnswer.query.filter_by(
                    assessment_id=assessment.assessment_id
                ).delete()

                db.session.delete(assessment)

            db.session.delete(student)

        db.session.delete(teacher)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Teacher deleted successfully."
        })

    except Exception as e:
        db.session.rollback()

        print("DELETE TEACHER ERROR:", e)

        return jsonify({
            "success": False,
            "message": "Database error: " + str(e)
        }), 500




@app.route("/admin/teacher/<int:teacher_id>")
def admin_teacher_details(teacher_id):
    if session.get("role") != "admin":
        return jsonify({
            "success": False,
            "message": "Unauthorized."
        }), 403

    teacher = Teacher.query.get_or_404(teacher_id)

    students = Student.query.filter_by(
        teacher_id=teacher.teacher_id
    ).all()

    student_list = []
    completed = 0
    total_attempts = 0

    for student in students:
        attempts = Assessment.query.filter_by(
            student_id=student.student_id
        ).order_by(
            Assessment.assessment_id.desc()
        ).all()

        latest = attempts[0] if attempts else None

        if latest:
            completed += 1

        total_attempts += len(attempts)

        student_list.append({
            "name": f"{student.first_name} {student.last_name}",
            "risk": latest.risk_level if latest else "Not yet answered",
            "completed": latest is not None,
            "latest_assessment_id": latest.assessment_id if latest else None
        })

    student_list.sort(
        key=lambda student: (
            0 if student["risk"] == "High" else
            1 if student["risk"] == "Moderate" else
            2 if student["risk"] == "Low" else 3
        )
    )

    return jsonify({
        "teacher": f"{teacher.first_name} {teacher.last_name}",
        "email": teacher.email,
        "password": "123456",
        "teacher_code": teacher.teacher_code,
        "grade": teacher.grade_level,
        "section": teacher.section,
        "students": len(students),
        "completed": completed,
        "attempts": total_attempts,
        "student_list": student_list
    })


@app.route("/admin/at-risk")
def admin_at_risk():
    if session.get("role") != "admin":
        return redirect("/")

    students = Student.query.order_by(
        Student.last_name.asc(),
        Student.first_name.asc()
    ).all()

    student_data = []

    for student in students:
        assessment = Assessment.query.filter_by(
            student_id=student.student_id
        ).order_by(
            Assessment.submitted_at.desc(),
            Assessment.assessment_id.desc()
        ).first()

        if not assessment:
            continue

        if assessment.risk_level not in ["High", "Moderate"]:
            continue

        answers = AssessmentAnswer.query.filter_by(
            assessment_id=assessment.assessment_id
        ).all()

        category_scores = {}

        for answer in answers:
            question = AssessmentQuestion.query.get(answer.question_id)

            if not question:
                continue

            category = question.category

            if category not in category_scores:
                category_scores[category] = {
                    "total": 0,
                    "max": 0,
                    "count": 0
                }

            category_scores[category]["total"] += answer.weighted_score
            category_scores[category]["max"] += 3
            category_scores[category]["count"] += 1

        categories = {}

        for category, values in category_scores.items():
            percentage = 0

            if values["max"] > 0:
                percentage = round(
                    (values["total"] / values["max"]) * 100,
                    1
                )

            categories[category] = {
                "score": values["total"],
                "max": values["max"],
                "percentage": percentage
            }

        lowest_category = None
        lowest_percentage = None

        for category, values in categories.items():
            if lowest_percentage is None or values["percentage"] < lowest_percentage:
                lowest_category = category
                lowest_percentage = values["percentage"]

        if assessment.risk_level == "High":
            explanation = (
                f"The overall assessment score is {assessment.percentage}%, "
                "which falls within the high-risk range. The category with "
                f"the lowest result is {lowest_category or 'not available'}"
                + (
                    f" at {lowest_percentage}%."
                    if lowest_percentage is not None
                    else "."
                )
            )
        else:
            explanation = (
                f"The overall assessment score is {assessment.percentage}%, "
                "which falls within the moderate-risk range."
            )

            if lowest_category and lowest_percentage is not None:
                explanation += (
                    f" The lowest category is {lowest_category} "
                    f"at {lowest_percentage}%."
                )

        student_data.append({
            "student": student,
            "assessment": assessment,
            "categories": categories,
            "lowest_category": lowest_category,
            "lowest_percentage": lowest_percentage
        })

    high_risk = [
        item for item in student_data
        if item["assessment"].risk_level == "High"
    ]

    moderate_risk = [
        item for item in student_data
        if item["assessment"].risk_level == "Moderate"
    ]

    grades = sorted(
        {str(item["student"].grade_level) for item in student_data},
        key=lambda x: int(x) if x.isdigit() else x
    )

    sections = sorted(
        {item["student"].section for item in student_data if item["student"].section}
    )

    return render_template(
        "admin/at_risk.html",
        students=student_data,
        at_risk_students=student_data,
        high_risk_count=len(high_risk),
        moderate_risk_count=len(moderate_risk),
        total_at_risk=len(student_data),
        grades=grades,
        sections=sections
    )


@app.route("/admin/at-risk/student/<int:student_id>")
def admin_at_risk_student(student_id):
    if session.get("role") != "admin":
        return jsonify({
            "success": False,
            "message": "Unauthorized."
        }), 403

    student = Student.query.get(student_id)

    if not student:
        return jsonify({
            "success": False,
            "message": "Student not found."
        }), 404

    assessment = Assessment.query.filter_by(
        student_id=student.student_id
    ).order_by(
        Assessment.submitted_at.desc(),
        Assessment.assessment_id.desc()
    ).first()

    if not assessment:
        return jsonify({
            "success": False,
            "message": "This student has no completed assessment."
        }), 404

    answers = AssessmentAnswer.query.filter_by(
        assessment_id=assessment.assessment_id
    ).all()

    category_scores = {}
    question_results = []

    for answer in answers:
        question = AssessmentQuestion.query.get(answer.question_id)

        if not question:
            continue

        category = question.category

        if category not in category_scores:
            category_scores[category] = {
                "total": 0,
                "max": 0,
                "count": 0
            }

        category_scores[category]["total"] += answer.weighted_score
        category_scores[category]["max"] += 3
        category_scores[category]["count"] += 1

        question_results.append({
            "question_id": question.question_id,
            "question": question.question,
            "category": category,
            "score": answer.weighted_score,
            "max_score": 3
        })

    categories = {}

    for category, values in category_scores.items():
        percentage = 0

        if values["max"] > 0:
            percentage = round(
                (values["total"] / values["max"]) * 100,
                1
            )

        categories[category] = {
            "score": values["total"],
            "max": values["max"],
            "percentage": percentage
        }

    lowest_category = None
    lowest_percentage = None

    for category, values in categories.items():
        if lowest_percentage is None or values["percentage"] < lowest_percentage:
            lowest_category = category
            lowest_percentage = values["percentage"]

    lowest_questions = sorted(
        question_results,
        key=lambda x: x["score"]
    )[:5]

    if assessment.risk_level == "High":
        support_title = "Timely follow-up may be helpful"
        support_message = (
            "The latest result indicates a higher level of concern. "
            "A supportive conversation can help identify what the student "
            "may currently need."
        )
        support_actions = [
            "Consider a supportive counselor check-in.",
            "Discuss the lower-scoring areas without judgment.",
            "Identify trusted adults or support people available to the student.",
            "Monitor future assessment results for changes."
        ]
    elif assessment.risk_level == "Moderate":
        support_title = "Monitor and provide support"
        support_message = (
            "The latest result indicates some areas may benefit from "
            "additional attention and regular check-ins."
        )
        support_actions = [
            "Consider a regular counselor check-in.",
            "Discuss the student's lower-scoring area in a supportive way.",
            "Identify practical school, home, or social supports.",
            "Monitor future assessment results for changes."
        ]
    else:
        support_title = "Continue positive support"
        support_message = (
            "The latest assessment does not indicate moderate or high risk."
        )
        support_actions = [
            "Continue regular positive check-ins.",
            "Encourage healthy school, home, and social routines.",
            "Continue monitoring future assessment results."
        ]

    if assessment.risk_level == "High":
        explanation = (
            f"The overall assessment score is {assessment.percentage}%, "
            "placing the result in the high-risk range."
        )
    elif assessment.risk_level == "Moderate":
        explanation = (
            f"The overall assessment score is {assessment.percentage}%, "
            "placing the result in the moderate-risk range."
        )
    else:
        explanation = (
            f"The overall assessment score is {assessment.percentage}%, "
            "which does not currently fall within the moderate or high-risk range."
        )

    if lowest_category and lowest_percentage is not None:
        explanation += (
            f" The lowest category result was {lowest_category} "
            f"at {lowest_percentage}%."
        )

    return jsonify({
        "success": True,
        "student": {
            "student_id": student.student_id,
            "student_code": student.student_code,
            "name": (
                f"{student.first_name} "
                f"{student.middle_initial + '. ' if student.middle_initial else ''}"
                f"{student.last_name}"
                f"{' ' + student.suffix if student.suffix else ''}"
            ),
            "grade": student.grade_level,
            "section": student.section,
            "age": student.age
        },
        "assessment": {
            "assessment_id": assessment.assessment_id,
            "percentage": float(assessment.percentage),
            "risk_level": assessment.risk_level,
            "total_score": assessment.total_score,
            "max_score": assessment.max_score,
            "remarks": assessment.remarks,
            "explanation": explanation,
            "submitted_at": (
                assessment.submitted_at.strftime("%B %d, %Y at %I:%M %p")
                if assessment.submitted_at
                else "Unknown"
            )
        },
        "categories": categories,
        "lowest_category": lowest_category,
        "lowest_percentage": lowest_percentage,
        "lowest_questions": lowest_questions,
        "support": {
            "title": support_title,
            "message": support_message,
            "actions": support_actions
        }
    })


@app.route("/admin/reports")
def admin_reports():
    if session.get("role") != "admin":
        return redirect("/")

    students = Student.query.order_by(
        Student.last_name.asc(),
        Student.first_name.asc()
    ).all()

    assessments = Assessment.query.order_by(
        Assessment.submitted_at.asc(),
        Assessment.assessment_id.asc()
    ).all()

    questions = {
        question.question_id: question
        for question in AssessmentQuestion.query.all()
    }

    answers = AssessmentAnswer.query.all()

    latest_by_student = {}

    for assessment in assessments:
        latest_by_student[assessment.student_id] = assessment

    latest_assessments = []

    for student in students:
        latest = latest_by_student.get(student.student_id)

        if latest:
            latest_assessments.append({
                "student": student,
                "assessment": latest
            })

    total_students = len(students)
    students_assessed = len(latest_assessments)
    students_not_assessed = total_students - students_assessed
    total_attempts = len(assessments)

    high_risk = 0
    moderate_risk = 0
    low_risk = 0

    total_score = 0
    score_count = 0

    for item in latest_assessments:
        assessment = item["assessment"]

        if assessment.risk_level == "High":
            high_risk += 1
        elif assessment.risk_level == "Moderate":
            moderate_risk += 1
        elif assessment.risk_level == "Low":
            low_risk += 1

        if assessment.percentage is not None:
            total_score += float(assessment.percentage)
            score_count += 1

    average_score = (
        round(total_score / score_count, 1)
        if score_count
        else 0
    )

    category_totals = {}

    for answer in answers:
        question = questions.get(answer.question_id)

        if not question:
            continue

        category = question.category

        if category not in category_totals:
            category_totals[category] = {
                "total": 0,
                "max": 0,
                "answers": 0
            }

        category_totals[category]["total"] += float(
            answer.weighted_score or 0
        )
        category_totals[category]["max"] += 3
        category_totals[category]["answers"] += 1

    category_data = []

    for category, values in category_totals.items():
        percentage = 0

        if values["max"] > 0:
            percentage = round(
                (values["total"] / values["max"]) * 100,
                1
            )

        category_data.append({
            "category": category,
            "percentage": percentage,
            "score": round(values["total"], 1),
            "max": values["max"],
            "answers": values["answers"]
        })

    category_data.sort(
        key=lambda item: item["percentage"]
    )

    grade_data = {}

    for item in latest_assessments:
        student = item["student"]
        assessment = item["assessment"]

        grade = str(student.grade_level)

        if grade not in grade_data:
            grade_data[grade] = {
                "students": 0,
                "high": 0,
                "moderate": 0,
                "low": 0,
                "score_total": 0,
                "score_count": 0
            }

        grade_data[grade]["students"] += 1

        if assessment.risk_level == "High":
            grade_data[grade]["high"] += 1
        elif assessment.risk_level == "Moderate":
            grade_data[grade]["moderate"] += 1
        elif assessment.risk_level == "Low":
            grade_data[grade]["low"] += 1

        if assessment.percentage is not None:
            grade_data[grade]["score_total"] += float(
                assessment.percentage
            )
            grade_data[grade]["score_count"] += 1

    grade_reports = []

    for grade, values in grade_data.items():
        average = 0

        if values["score_count"]:
            average = round(
                values["score_total"] / values["score_count"],
                1
            )

        grade_reports.append({
            "grade": grade,
            "students": values["students"],
            "high": values["high"],
            "moderate": values["moderate"],
            "low": values["low"],
            "average": average
        })

    grade_reports.sort(
        key=lambda item: (
            int(item["grade"])
            if item["grade"].isdigit()
            else item["grade"]
        )
    )

    trend_data = []

    for assessment in assessments:
        if not assessment.submitted_at:
            continue

        trend_data.append({
            "date": assessment.submitted_at.strftime("%Y-%m-%d"),
            "assessment_id": assessment.assessment_id,
            "percentage": (
                float(assessment.percentage)
                if assessment.percentage is not None
                else 0
            ),
            "risk": assessment.risk_level
        })

    student_reports = []

    for item in latest_assessments:
        student = item["student"]
        assessment = item["assessment"]

        full_name = (
            f"{student.first_name} "
            f"{student.middle_initial + '. ' if student.middle_initial else ''}"
            f"{student.last_name}"
            f"{' ' + student.suffix if student.suffix else ''}"
        )

        student_reports.append({
            "student_id": student.student_id,
            "name": full_name,
            "student_code": student.student_code,
            "grade": student.grade_level,
            "section": student.section,
            "risk": assessment.risk_level,
            "percentage": (
                float(assessment.percentage)
                if assessment.percentage is not None
                else 0
            ),
            "assessment_id": assessment.assessment_id,
            "submitted_at": (
                assessment.submitted_at.strftime("%b %d, %Y")
                if assessment.submitted_at
                else "N/A"
            )
        })

    student_reports.sort(
        key=lambda item: (
            0 if item["risk"] == "High" else
            1 if item["risk"] == "Moderate" else
            2 if item["risk"] == "Low" else 3,
            -item["percentage"]
        )
    )

    grades = sorted(
        {
            str(student.grade_level)
            for student in students
            if student.grade_level is not None
        },
        key=lambda value: (
            int(value)
            if value.isdigit()
            else value
        )
    )

    sections = sorted(
        {
            student.section
            for student in students
            if student.section
        }
    )

    return render_template(
        "admin/admin_reports.html",
        total_students=total_students,
        students_assessed=students_assessed,
        students_not_assessed=students_not_assessed,
        total_attempts=total_attempts,
        high_risk=high_risk,
        moderate_risk=moderate_risk,
        low_risk=low_risk,
        average_score=average_score,
        category_data=category_data,
        grade_reports=grade_reports,
        trend_data=trend_data,
        student_reports=student_reports,
        grades=grades,
        sections=sections
    )



@app.route("/admin/wellness")
def admin_wellness():
    if session.get("role") not in ["admin","counselor"]:
        return redirect("/")

    students=Student.query.all()
    assessments=Assessment.query.order_by(
        Assessment.submitted_at.desc(),
        Assessment.assessment_id.desc()
    ).all()

    total_students=len(students)
    latest_assessments=[]
    seen_students=set()

    for assessment in assessments:
        if not assessment.student_id or assessment.student_id in seen_students:
            continue
        seen_students.add(assessment.student_id)
        latest_assessments.append(assessment)

    students_assessed=len(latest_assessments)
    high_risk=sum(1 for assessment in latest_assessments if assessment.risk_level=="High")
    moderate_risk=sum(1 for assessment in latest_assessments if assessment.risk_level=="Moderate")
    low_risk=sum(1 for assessment in latest_assessments if assessment.risk_level=="Low")

    all_anonymous_screenings=AnonymousScreening.query.order_by(
        AnonymousScreening.created_at.desc()
    ).all()

    anonymous_screenings=[]
    seen_anonymous_keys=set()

    for screening in all_anonymous_screenings:
        if screening.anonymous_key in seen_anonymous_keys:
            continue
        seen_anonymous_keys.add(screening.anonymous_key)
        anonymous_screenings.append(screening)

    total_anonymous=len(anonymous_screenings)
    overwhelmed_yes=sum(1 for screening in anonymous_screenings if screening.overwhelmed=="yes")
    motivation_yes=sum(1 for screening in anonymous_screenings if screening.motivation=="yes")
    support_yes=sum(1 for screening in anonymous_screenings if screening.support=="yes")

    anonymous_concern_high=0
    anonymous_concern_moderate=0
    anonymous_concern_low=0

    for screening in anonymous_screenings:
        concern_count=0

        if screening.overwhelmed=="yes":
            concern_count+=1
        if screening.motivation=="yes":
            concern_count+=1
        if screening.support=="yes":
            concern_count+=1

        if concern_count>=2:
            anonymous_concern_high+=1
        elif concern_count==1:
            anonymous_concern_moderate+=1
        else:
            anonymous_concern_low+=1

    recent_assessments=[]

    for assessment in latest_assessments[:10]:
        student=Student.query.get(assessment.student_id)

        if not student:
            continue

        current_assessment=assessment

        if current_assessment.assessment_type=="retake":
            baseline_assessment=Assessment.query.filter_by(
                assessment_id=current_assessment.previous_assessment_id,
                student_id=student.student_id
            ).first()

            if not baseline_assessment:
                baseline_assessment=current_assessment
        else:
            baseline_assessment=current_assessment

        follow_up=Appointment.query.filter_by(
            student_id=student.student_id,
            baseline_assessment_id=baseline_assessment.assessment_id
        ).order_by(
            Appointment.appointment_id.desc()
        ).first()

        scheduled=bool(
            follow_up and
            follow_up.scheduled_date and
            follow_up.scheduled_time
        )

        status=follow_up.status if follow_up else None

        child_assessment=Assessment.query.filter_by(
            student_id=student.student_id,
            previous_assessment_id=baseline_assessment.assessment_id,
            assessment_type="retake"
        ).order_by(
            Assessment.assessment_id.desc()
        ).first()

        latest_result=child_assessment or baseline_assessment

        recent_assessments.append({
            "student":student,
            "assessment":latest_result,
            "initial_assessment":baseline_assessment,
            "latest_retake":child_assessment,
            "follow_up":{
                "appointment":follow_up,
                "scheduled":scheduled,
                "status":status
            } if follow_up else None,
            "post_assessment":child_assessment
        })

    def percent(value,total):
        if not total:
            return 0
        return round((value/total)*100)

    return render_template(
        "admin/admin_wellness.html",
        total_students=total_students,
        students_assessed=students_assessed,
        total_attempts=len(assessments),
        high_risk=high_risk,
        moderate_risk=moderate_risk,
        low_risk=low_risk,
        recent_assessments=recent_assessments,
        total_anonymous=total_anonymous,
        overwhelmed_yes=overwhelmed_yes,
        motivation_yes=motivation_yes,
        support_yes=support_yes,
        anonymous_concern_high=anonymous_concern_high,
        anonymous_concern_moderate=anonymous_concern_moderate,
        anonymous_concern_low=anonymous_concern_low,
        overwhelmed_percent=percent(overwhelmed_yes,total_anonymous),
        motivation_percent=percent(motivation_yes,total_anonymous),
        support_percent=percent(support_yes,total_anonymous),
        anonymous_high_percent=percent(anonymous_concern_high,total_anonymous),
        anonymous_moderate_percent=percent(anonymous_concern_moderate,total_anonymous),
        anonymous_low_percent=percent(anonymous_concern_low,total_anonymous)
    )


@app.route("/admin/wellness/student/<int:student_id>")
def admin_wellness_student(student_id):
    if session.get("role") not in ["admin","counselor"]:
        return jsonify({
            "success":False,
            "message":"Unauthorized access."
        }),403

    student=Student.query.get(student_id)

    if not student:
        return jsonify({
            "success":False,
            "message":"Student not found."
        }),404

    assessments=Assessment.query.filter_by(
        student_id=student.student_id
    ).order_by(
        Assessment.assessment_id.asc()
    ).all()

    if not assessments:
        return jsonify({
            "success":False,
            "message":"This student has no assessments yet."
        }),404

    latest_assessment=assessments[-1]

    if latest_assessment.assessment_type=="retake":
        baseline_assessment=Assessment.query.filter_by(
            assessment_id=latest_assessment.previous_assessment_id,
            student_id=student.student_id
        ).first()

        if not baseline_assessment:
            baseline_assessment=latest_assessment

        post_assessment=latest_assessment
    else:
        baseline_assessment=latest_assessment

        post_assessment=Assessment.query.filter_by(
            student_id=student.student_id,
            previous_assessment_id=baseline_assessment.assessment_id,
            assessment_type="retake"
        ).order_by(
            Assessment.assessment_id.desc()
        ).first()

    follow_up=Appointment.query.filter_by(
        student_id=student.student_id,
        baseline_assessment_id=baseline_assessment.assessment_id
    ).order_by(
        Appointment.appointment_id.desc()
    ).first()

    if not post_assessment and baseline_assessment.assessment_id!=latest_assessment.assessment_id:
        post_assessment=latest_assessment

    scheduled=bool(
        follow_up and
        follow_up.scheduled_date and
        follow_up.scheduled_time
    )

    def format_date(value):
        if not value:
            return ""

        try:
            return value.strftime("%b %d, %Y")
        except Exception:
            return str(value)

    def format_time(value):
        if not value:
            return ""

        try:
            return value.strftime("%I:%M %p").lstrip("0")
        except Exception:
            return str(value)

    def assessment_data(assessment):
        if not assessment:
            return None

        return {
            "assessment_id":assessment.assessment_id,
            "percentage":float(assessment.percentage or 0),
            "risk_level":assessment.risk_level or "N/A",
            "submitted_at":format_date(assessment.submitted_at),
            "assessment_type":assessment.assessment_type or "initial"
        }

    appointment_data=None

    if follow_up:
        appointment_data={
            "appointment_id":follow_up.appointment_id,
            "status":follow_up.status or "Pending",
            "scheduled":scheduled,
            "date_display":format_date(follow_up.scheduled_date),
            "time_display":format_time(follow_up.scheduled_time)
        }

    return jsonify({
        "success":True,
        "student":{
            "student_id":student.student_id,
            "first_name":student.first_name,
            "last_name":student.last_name,
            "student_code":student.student_code,
            "grade_level":student.grade_level,
            "section":student.section
        },
        "baseline_assessment":assessment_data(baseline_assessment),
        "post_assessment":assessment_data(post_assessment),
        "current_assessment":assessment_data(latest_assessment),
        "follow_up":appointment_data
    })


@app.route("/admin/appointments")
def admin_appointments():
    if session.get("role") != "admin":
        return redirect("/")

    appointments = Appointment.query.order_by(
        Appointment.scheduled_date.asc(),
        Appointment.scheduled_time.asc()
    ).all()

    students = Student.query.order_by(
        Student.last_name,
        Student.first_name
    ).all()

    counselors = Teacher.query.filter_by(
        is_admin=False
    ).order_by(
        Teacher.last_name,
        Teacher.first_name
    ).all()

    admin_counselor = Admin.query.first()

    selected_student_id = request.args.get(
        "student_id",
        type=int
    )

    selected_assessment_id = request.args.get(
        "assessment_id",
        type=int
    )

    selected_student = None
    selected_assessment = None

    if selected_student_id:
        selected_student = Student.query.get(
            selected_student_id
        )

    if selected_assessment_id:
        selected_assessment = Assessment.query.filter_by(
            assessment_id=selected_assessment_id,
            student_id=selected_student.student_id
            if selected_student
            else None
        ).first()

        if not selected_assessment and selected_student:

            selected_assessment = Assessment.query.filter_by(
                student_id=selected_student.student_id
            ).order_by(
                Assessment.assessment_id.desc()
            ).first()

    return render_template(
        "admin/appointments.html",
        appointments=appointments,
        students=students,
        counselors=counselors,
        admin_counselor=admin_counselor,
        selected_student=selected_student,
        selected_assessment=selected_assessment
    )


@app.route(
    "/admin/appointments/create",
    methods=["POST"]
)
def create_appointment():
    if session.get("role") != "admin":
        return jsonify({
            "success": False,
            "message": "Unauthorized."
        }), 403

    try:
        student_id = request.form.get(
            "student_id",
            type=int
        )

        counselor_value = request.form.get(
            "counselor_id",
            ""
        ).strip()

        assessment_id = request.form.get(
            "assessment_id",
            type=int
        )

        scheduled_date = request.form.get(
            "scheduled_date"
        )

        scheduled_time = request.form.get(
            "scheduled_time"
        )

        reason = request.form.get(
            "reason",
            ""
        ).strip()

        notes = request.form.get(
            "notes",
            ""
        ).strip()

        if not student_id:
            return jsonify({
                "success": False,
                "message": "Please select a student."
            }), 400

        if not counselor_value:
            return jsonify({
                "success": False,
                "message": "Please select a counselor."
            }), 400

        if not scheduled_date or not scheduled_time:
            return jsonify({
                "success": False,
                "message": "Please select a date and time."
            }), 400

        student = Student.query.get(student_id)

        if not student:
            return jsonify({
                "success": False,
                "message": "Student not found."
            }), 404

        active_appointment = Appointment.query.filter(
            Appointment.student_id == student.student_id,
            Appointment.status.in_([
                "Pending",
                "Confirmed"
            ])
        ).first()

        if active_appointment:
            return jsonify({
                "success": False,
                "message": (
                    "This student already has an ongoing "
                    "appointment. Complete or cancel that "
                    "appointment before scheduling another one."
                )
            }), 400

        counselor = None
        counselor_admin = None

        if counselor_value.startswith("teacher:"):

            try:
                teacher_id = int(
                    counselor_value.split(":", 1)[1]
                )
            except (ValueError, IndexError):
                return jsonify({
                    "success": False,
                    "message": "Invalid counselor."
                }), 400

            counselor = Teacher.query.filter_by(
                teacher_id=teacher_id,
                is_admin=False
            ).first()

            if not counselor:
                return jsonify({
                    "success": False,
                    "message": "Counselor not found."
                }), 404

        elif counselor_value.startswith("admin:"):

            try:
                admin_id = int(
                    counselor_value.split(":", 1)[1]
                )
            except (ValueError, IndexError):
                return jsonify({
                    "success": False,
                    "message": "Invalid counselor."
                }), 400

            counselor_admin = Admin.query.filter_by(
                admin_id=admin_id
            ).first()

            if not counselor_admin:
                return jsonify({
                    "success": False,
                    "message": "Admin counselor not found."
                }), 404

        else:
            return jsonify({
                "success": False,
                "message": "Invalid counselor."
            }), 400

        baseline_assessment = None

        if assessment_id:

            baseline_assessment = Assessment.query.filter_by(
                assessment_id=assessment_id,
                student_id=student.student_id
            ).first()

        # If no assessment was explicitly selected,
        # attach the appointment to the student's latest
        # assessment instead of always using the initial one.
        if not baseline_assessment:

            baseline_assessment = Assessment.query.filter_by(
                student_id=student.student_id
            ).order_by(
                Assessment.assessment_id.desc()
            ).first()

        if not baseline_assessment:

            return jsonify({
                "success": False,
                "message": "No assessment was found for this student."
            }), 400

        appointment = Appointment(
            student_id=student.student_id,
            counselor_id=(
                counselor.teacher_id
                if counselor
                else None
            ),
            counselor_admin_id=(
                counselor_admin.admin_id
                if counselor_admin
                else None
            ),
            baseline_assessment_id=baseline_assessment.assessment_id,
            scheduled_date=datetime.strptime(
                scheduled_date,
                "%Y-%m-%d"
            ).date(),
            scheduled_time=datetime.strptime(
                scheduled_time,
                "%H:%M"
            ).time(),
            status="Pending",
            request_source="Counselor",
            reason=reason or "Student follow-up",
            notes=notes or None
        )

        db.session.add(appointment)
        db.session.commit()

        if counselor:
            counselor_name = (
                f"{counselor.first_name} "
                f"{counselor.last_name}"
            )
        else:
            counselor_name = (
                f"{counselor_admin.first_name} "
                f"{counselor_admin.last_name}"
            )

        return jsonify({
            "success": True,
            "message": "Follow-up appointment scheduled successfully.",
            "appointment": {
                "appointment_id": appointment.appointment_id,
                "student_id": appointment.student_id,
                "student_name": (
                    f"{student.first_name} "
                    f"{student.last_name}"
                ),
                "counselor": counselor_name,
                "date": appointment.scheduled_date.strftime(
                    "%b %d, %Y"
                ),
                "time": appointment.scheduled_time.strftime(
                    "%I:%M %p"
                ),
                "status": appointment.status
            }
        })

    except Exception as e:
        db.session.rollback()

        print(
            "CREATE APPOINTMENT ERROR:",
            e
        )

        return jsonify({
            "success": False,
            "message": "Unable to schedule appointment."
        }), 500


@app.route(
    "/admin/appointments/<int:appointment_id>/status",
    methods=["POST"]
)
def update_appointment_status(appointment_id):
    if session.get("role") != "admin":
        return jsonify({
            "success": False,
            "message": "Unauthorized."
        }), 403

    appointment = Appointment.query.get(
        appointment_id
    )

    if not appointment:
        return jsonify({
            "success": False,
            "message": "Appointment not found."
        }), 404

    data = request.get_json(
        silent=True
    ) or {}

    status = data.get(
        "status",
        ""
    ).strip()

    if status not in {
        "Cancelled",
        "Completed"
    }:
        return jsonify({
            "success": False,
            "message": "Invalid appointment action."
        }), 400

    if appointment.status not in {
        "Pending",
        "Confirmed"
    }:
        return jsonify({
            "success": False,
            "message": "This appointment has already ended."
        }), 400

    appointment.status = status

    if status == "Completed":
        appointment.completed_at = datetime.utcnow()
    else:
        appointment.completed_at = None

    db.session.commit()

    return jsonify({
        "success": True,
        "message": (
            "Appointment completed successfully."
            if status == "Completed"
            else "Appointment cancelled successfully."
        )
    })


@app.route("/admin/appointments/list")
def admin_appointments_list():
    if session.get("role") != "admin":
        return jsonify({
            "success": False,
            "message": "Unauthorized."
        }), 403

    appointments = Appointment.query.order_by(
        Appointment.scheduled_date.asc(),
        Appointment.scheduled_time.asc(),
        Appointment.appointment_id.asc()
    ).all()

    results = []

    for appointment in appointments:

        student = appointment.student

        if appointment.counselor_admin:
            counselor_name = (
                f"{appointment.counselor_admin.first_name} "
                f"{appointment.counselor_admin.last_name}"
            )
        elif appointment.counselor:
            counselor_name = (
                f"{appointment.counselor.first_name} "
                f"{appointment.counselor.last_name}"
            )
        else:
            counselor_name = "Not assigned"

        baseline_assessment = None

        if appointment.baseline_assessment:
            baseline_assessment = {
                "assessment_id": appointment.baseline_assessment.assessment_id,
                "risk_level": appointment.baseline_assessment.risk_level,
                "percentage": appointment.baseline_assessment.percentage
            }

        results.append({
            "appointment_id": appointment.appointment_id,
            "student_id": appointment.student_id,
            "student_name": (
                f"{student.first_name} "
                f"{student.last_name}"
            ) if student else "Unknown Student",
            "student_first_name": (
                student.first_name
                if student
                else ""
            ),
            "student_last_name": (
                student.last_name
                if student
                else ""
            ),
            "student_code": (
                student.student_code
                if student
                else ""
            ),
            "grade_level": (
                student.grade_level
                if student
                else ""
            ),
            "section": (
                student.section
                if student
                else ""
            ),
            "counselor_name": counselor_name,
            "counselor_id": (
                appointment.counselor.teacher_id
                if appointment.counselor
                else None
            ),
            "counselor_admin_id": (
                appointment.counselor_admin.admin_id
                if appointment.counselor_admin
                else None
            ),
            "scheduled_date": (
                appointment.scheduled_date.strftime("%Y-%m-%d")
                if appointment.scheduled_date
                else ""
            ),
            "scheduled_time": (
                appointment.scheduled_time.strftime("%H:%M")
                if appointment.scheduled_time
                else ""
            ),
            "status": appointment.status or "Pending",
            "request_source": appointment.request_source or "",
            "reason": appointment.reason or "",
            "notes": appointment.notes or "",
            "baseline_assessment": baseline_assessment
        })

    return jsonify({
        "success": True,
        "appointments": results
    })


@app.route("/admin/appointments/notifications")
def admin_appointment_notifications():
    if session.get("role") != "admin":
        return jsonify({
            "success": False,
            "message": "Unauthorized."
        }), 403

    requests = Appointment.query.filter(
        Appointment.request_source == "Student",
        Appointment.status == "Pending",
        Appointment.scheduled_date.is_(None),
        Appointment.scheduled_time.is_(None)
    ).order_by(
        Appointment.appointment_id.desc()
    ).all()

    results = []

    for appointment in requests:

        student = appointment.student

        if not student:
            continue

        results.append({
            "appointment_id": appointment.appointment_id,
            "student_name": (
                f"{student.first_name} "
                f"{student.last_name}"
            ),
            "student_code": student.student_code,
            "reason": (
                appointment.reason
                or "Student support"
            )
        })

    return jsonify({
        "success": True,
        "count": len(results),
        "requests": results
    })


@app.route(
    "/admin/appointments/<int:appointment_id>/schedule",
    methods=["POST"]
)
def schedule_student_appointment(appointment_id):
    if session.get("role") != "admin":
        return jsonify({
            "success": False,
            "message": "Unauthorized."
        }), 403

    appointment = Appointment.query.get(
        appointment_id
    )

    if not appointment:
        return jsonify({
            "success": False,
            "message": "Appointment not found."
        }), 404

    if appointment.status not in {
        "Pending",
        "Confirmed"
    }:
        return jsonify({
            "success": False,
            "message": "This appointment has already ended."
        }), 400

    try:

        counselor_value = request.form.get(
            "counselor_id",
            ""
        ).strip()

        scheduled_date = request.form.get(
            "scheduled_date",
            ""
        ).strip()

        scheduled_time = request.form.get(
            "scheduled_time",
            ""
        ).strip()

        reason = request.form.get(
            "reason",
            ""
        ).strip()

        notes = request.form.get(
            "notes",
            ""
        ).strip()

        if not counselor_value:
            return jsonify({
                "success": False,
                "message": "Please select a counselor."
            }), 400

        if not scheduled_date or not scheduled_time:
            return jsonify({
                "success": False,
                "message": "Please select a date and time."
            }), 400

        try:

            parsed_date = datetime.strptime(
                scheduled_date,
                "%Y-%m-%d"
            ).date()

            parsed_time = datetime.strptime(
                scheduled_time,
                "%H:%M"
            ).time()

        except ValueError:

            return jsonify({
                "success": False,
                "message": "Invalid date or time."
            }), 400

        counselor = None
        counselor_admin = None

        if counselor_value.startswith("teacher:"):

            try:
                teacher_id = int(
                    counselor_value.split(
                        ":",
                        1
                    )[1]
                )
            except (ValueError, IndexError):

                return jsonify({
                    "success": False,
                    "message": "Invalid counselor."
                }), 400

            counselor = Teacher.query.filter_by(
                teacher_id=teacher_id,
                is_admin=False
            ).first()

            if not counselor:
                return jsonify({
                    "success": False,
                    "message": "Counselor not found."
                }), 404

        elif counselor_value.startswith("admin:"):

            try:
                admin_id = int(
                    counselor_value.split(
                        ":",
                        1
                    )[1]
                )
            except (ValueError, IndexError):

                return jsonify({
                    "success": False,
                    "message": "Invalid counselor."
                }), 400

            counselor_admin = Admin.query.filter_by(
                admin_id=admin_id
            ).first()

            if not counselor_admin:
                return jsonify({
                    "success": False,
                    "message": "School counselor not found."
                }), 404

        else:

            return jsonify({
                "success": False,
                "message": "Invalid counselor."
            }), 400

        conflicting_appointment = Appointment.query.filter(
            Appointment.appointment_id != appointment.appointment_id,
            Appointment.status.in_([
                "Pending",
                "Confirmed"
            ]),
            Appointment.scheduled_date == parsed_date,
            Appointment.scheduled_time == parsed_time,
            (
                Appointment.counselor_id ==
                counselor.teacher_id
            ) if counselor else (
                Appointment.counselor_admin_id ==
                counselor_admin.admin_id
            )
        ).first()

        if conflicting_appointment:
            return jsonify({
                "success": False,
                "message": (
                    "This counselor already has an appointment "
                    "at the selected date and time."
                )
            }), 400

        appointment.counselor_id = (
            counselor.teacher_id
            if counselor
            else None
        )

        appointment.counselor_admin_id = (
            counselor_admin.admin_id
            if counselor_admin
            else None
        )

        appointment.scheduled_date = parsed_date
        appointment.scheduled_time = parsed_time

        if reason:
            appointment.reason = reason

        if notes:
            appointment.notes = notes

        appointment.status = "Confirmed"

        if not appointment.baseline_assessment_id:

            latest_assessment = Assessment.query.filter_by(
                student_id=appointment.student_id
            ).order_by(
                Assessment.assessment_id.desc()
            ).first()

            if latest_assessment:

                appointment.baseline_assessment_id = (
                    latest_assessment.assessment_id
                )

        db.session.commit()

        if counselor:

            counselor_name = (
                f"{counselor.first_name} "
                f"{counselor.last_name}"
            )

        else:

            counselor_name = (
                f"{counselor_admin.first_name} "
                f"{counselor_admin.last_name}"
            )

        return jsonify({
            "success": True,
            "message": (
                "Student support request scheduled successfully."
            ),
            "appointment": {
                "appointment_id": appointment.appointment_id,
                "counselor": counselor_name,
                "date": appointment.scheduled_date.strftime(
                    "%b %d, %Y"
                ),
                "time": appointment.scheduled_time.strftime(
                    "%I:%M %p"
                ),
                "status": appointment.status
            }
        })

    except Exception as e:

        db.session.rollback()

        print(
            "SCHEDULE APPOINTMENT ERROR:",
            e
        )

        return jsonify({
            "success": False,
            "message": "Unable to schedule appointment."
        }), 500


    
@app.route("/api/grade-sections")
def get_grade_sections():
    sections = GradeSection.query.order_by(
        GradeSection.grade_level,
        GradeSection.section
    ).all()

    data = {}

    for item in sections:
        grade = str(item.grade_level)

        if grade not in data:
            data[grade] = []

        data[grade].append(item.section)

    return jsonify(data)


if __name__ == "__main__":
    app.run(debug=True)