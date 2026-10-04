from database.db import db
from datetime import datetime


class Admin(db.Model):
    __tablename__="admins"

    admin_id=db.Column(db.Integer,primary_key=True)
    first_name=db.Column(db.String(50),nullable=False)
    last_name=db.Column(db.String(50),nullable=False)
    email=db.Column(db.String(100),unique=True,nullable=False)
    password=db.Column(db.String(255),nullable=False)


class Teacher(db.Model):
    __tablename__="teachers"

    teacher_id=db.Column(db.Integer,primary_key=True)

    teacher_code=db.Column(
        db.String(20),
        unique=True,
        nullable=False
    )

    first_name=db.Column(
        db.String(50),
        nullable=False
    )

    last_name=db.Column(
        db.String(50),
        nullable=False
    )

    email=db.Column(
        db.String(100),
        unique=True,
        nullable=False
    )

    password=db.Column(
        db.String(255),
        nullable=False
    )

    grade_level=db.Column(
        db.Integer,
        nullable=False
    )

    section=db.Column(
        db.String(50),
        nullable=False
    )

    is_admin=db.Column(
        db.Boolean,
        default=False
    )


    students=db.relationship(
        "Student",
        back_populates="teacher",
        lazy=True,
        cascade="all, delete"
    )


class Student(db.Model):
    __tablename__="students"

    student_id=db.Column(
        db.Integer,
        primary_key=True
    )

    student_code=db.Column(
        db.String(20),
        unique=True,
        nullable=False
    )


    teacher_id=db.Column(
        db.Integer,
        db.ForeignKey("teachers.teacher_id"),
        nullable=False
    )


    first_name=db.Column(
        db.String(50),
        nullable=False
    )

    middle_initial=db.Column(
        db.String(1)
    )

    last_name=db.Column(
        db.String(50),
        nullable=False
    )

    suffix=db.Column(
        db.String(10)
    )

    age=db.Column(
        db.Integer
    )

    grade_level=db.Column(
        db.Integer,
        nullable=False
    )

    section=db.Column(
        db.String(50),
        nullable=False
    )

    email=db.Column(
        db.String(100),
        unique=True
    )

    password=db.Column(
        db.String(255)
    )


    teacher=db.relationship(
        "Teacher",
        back_populates="students"
    )


    assessments=db.relationship(
        "Assessment",
        back_populates="student",
        lazy=True
    )

class GradeSection(db.Model):
    __tablename__ = "grade_sections"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    grade_level = db.Column(
        db.Integer,
        nullable=False
    )

    section = db.Column(
        db.String(50),
        nullable=False
    )
    
class AssessmentQuestion(db.Model):
    __tablename__="assessment_questions"

    question_id=db.Column(
        db.Integer,
        primary_key=True
    )

    page_number=db.Column(
        db.Integer,
        nullable=False
    )

    display_order=db.Column(
        db.Integer,
        nullable=False
    )

    category=db.Column(
        db.String(50),
        nullable=False
    )

    question=db.Column(
        db.Text,
        nullable=False
    )

    reverse_score=db.Column(
        db.Boolean,
        default=False
    )

    active=db.Column(
        db.Boolean,
        default=True
    )


    choices=db.relationship(
        "AssessmentChoice",
        back_populates="question",
        order_by="AssessmentChoice.display_order",
        cascade="all, delete-orphan"
    )


class AssessmentChoice(db.Model):
    __tablename__="assessment_choices"

    choice_id=db.Column(
        db.Integer,
        primary_key=True
    )

    question_id=db.Column(
        db.Integer,
        db.ForeignKey(
            "assessment_questions.question_id"
        ),
        nullable=False
    )

    display_order=db.Column(
        db.Integer,
        nullable=False
    )

    score=db.Column(
        db.Integer,
        nullable=False
    )

    emoji=db.Column(
        db.String(10),
        nullable=False
    )

    label=db.Column(
        db.String(50),
        nullable=False
    )

    description=db.Column(
        db.String(150)
    )


    question=db.relationship(
        "AssessmentQuestion",
        back_populates="choices"
    )


class Assessment(db.Model):
    __tablename__ = "assessments"

    assessment_id = db.Column(
        db.Integer,
        primary_key=True
    )

    student_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "students.student_id"
        ),
        nullable=False
    )

    total_score = db.Column(
        db.Integer,
        nullable=False
    )

    max_score = db.Column(
        db.Integer,
        nullable=False
    )

    percentage = db.Column(
        db.Numeric(5, 2),
        nullable=False
    )

    risk_level = db.Column(
        db.Enum(
            "Low",
            "Moderate",
            "High"
        ),
        nullable=False
    )

    remarks = db.Column(
        db.Text
    )

    submitted_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    assessment_type = db.Column(
        db.String(20),
        nullable=False,
        default="initial"
    )

    previous_assessment_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "assessments.assessment_id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    student = db.relationship(
        "Student",
        back_populates="assessments"
    )

    answers = db.relationship(
        "AssessmentAnswer",
        back_populates="assessment",
        cascade="all, delete-orphan",
        lazy=True
    )

    previous_assessment = db.relationship(
        "Assessment",
        remote_side=[assessment_id],
        foreign_keys=[previous_assessment_id],
        backref=db.backref(
            "follow_up_assessments",
            lazy=True
        )
    )


class AssessmentAnswer(db.Model):
    __tablename__="assessment_answers"

    answer_id=db.Column(
        db.Integer,
        primary_key=True
    )

    assessment_id=db.Column(
        db.Integer,
        db.ForeignKey(
            "assessments.assessment_id"
        ),
        nullable=False
    )

    question_id=db.Column(
        db.Integer,
        db.ForeignKey(
            "assessment_questions.question_id"
        ),
        nullable=False
    )

    selected_score=db.Column(
        db.Integer
    )

    weighted_score=db.Column(
        db.Integer
    )


    assessment=db.relationship(
        "Assessment",
        back_populates="answers"
    )


    question=db.relationship(
        "AssessmentQuestion"
    )


class Appointment(db.Model):
    __tablename__ = "appointments"

    appointment_id = db.Column(
        db.Integer,
        primary_key=True
    )

    student_id = db.Column(
        db.Integer,
        db.ForeignKey("students.student_id", ondelete="CASCADE"),
        nullable=False
    )

    counselor_id = db.Column(
        db.Integer,
        db.ForeignKey("teachers.teacher_id", ondelete="CASCADE"),
        nullable=True
    )

    counselor_admin_id = db.Column(
        db.Integer,
        db.ForeignKey("admins.admin_id", ondelete="CASCADE"),
        nullable=True
    )

    baseline_assessment_id = db.Column(
        db.Integer,
        db.ForeignKey("assessments.assessment_id", ondelete="SET NULL"),
        nullable=True
    )

    scheduled_date = db.Column(
        db.Date,
        nullable=True
    )

    scheduled_time = db.Column(
        db.Time,
        nullable=True
    )

    status = db.Column(
        db.String(20),
        nullable=False,
        default="Pending"
    )

    request_source = db.Column(
        db.String(20),
        nullable=False,
        default="Counselor"
    )

    reason = db.Column(
        db.String(255),
        nullable=True
    )

    notes = db.Column(
        db.Text,
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    completed_at = db.Column(
        db.DateTime,
        nullable=True
    )

    student = db.relationship(
        "Student",
        foreign_keys=[student_id],
        backref=db.backref(
            "appointments",
            lazy=True
        )
    )

    counselor = db.relationship(
        "Teacher",
        foreign_keys=[counselor_id],
        backref=db.backref(
            "counselor_appointments",
            lazy=True
        )
    )

    counselor_admin = db.relationship(
        "Admin",
        foreign_keys=[counselor_admin_id],
        backref=db.backref(
            "admin_appointments",
            lazy=True
        )
    )

    baseline_assessment = db.relationship(
        "Assessment",
        foreign_keys=[baseline_assessment_id],
        backref=db.backref(
            "appointments",
            lazy=True
        )
    )


class Report(db.Model):
    __tablename__="reports"

    report_id=db.Column(
        db.Integer,
        primary_key=True
    )

    teacher_id=db.Column(
        db.Integer,
        db.ForeignKey("teachers.teacher_id")
    )

    report_type=db.Column(
        db.String(100)
    )

    generated_on=db.Column(
        db.DateTime
    )

class WellnessCheckIn(db.Model):
    __tablename__ = "wellness_check_ins"

    checkin_id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer,
        db.ForeignKey("students.student_id"),
        nullable=False
    )
    average_score = db.Column(db.Float, nullable=False)
    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )


class MoodEntry(db.Model):
    __tablename__ = "mood_entries"

    mood_id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer,
        db.ForeignKey("students.student_id"),
        nullable=False
    )
    mood = db.Column(db.String(30), nullable=False)
    note = db.Column(db.String(500))
    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )


class AnonymousScreening(db.Model):
    __tablename__ = "anonymous_screenings"

    screening_id = db.Column(db.Integer, primary_key=True)
    anonymous_key = db.Column(db.String(64), nullable=False, index=True)
    overwhelmed = db.Column(db.String(20))
    motivation = db.Column(db.String(20))
    support = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)