DROP DATABASE IF EXISTS sparkcheck;

CREATE DATABASE sparkcheck
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE sparkcheck;

CREATE TABLE grade_sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grade_level INT NOT NULL,
    section VARCHAR(50) NOT NULL,
    UNIQUE (grade_level, section)
);

CREATE TABLE admins (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE teachers (
    teacher_id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_code VARCHAR(20) NOT NULL UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    grade_level INT NOT NULL,
    section VARCHAR(50) NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE students (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    student_code VARCHAR(20) NOT NULL UNIQUE,
    teacher_id INT NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    middle_initial CHAR(1),
    last_name VARCHAR(50) NOT NULL,
    suffix VARCHAR(10),
    age INT,
    grade_level INT NOT NULL,
    section VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (teacher_id)
        REFERENCES teachers(teacher_id),

    FOREIGN KEY (grade_level, section)
        REFERENCES grade_sections(grade_level, section)
);

CREATE TABLE teacher_assignments (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL,
    grade_level INT NOT NULL,
    section VARCHAR(50) NOT NULL,

    UNIQUE (teacher_id, grade_level, section),

    FOREIGN KEY (teacher_id)
        REFERENCES teachers(teacher_id),

    FOREIGN KEY (grade_level, section)
        REFERENCES grade_sections(grade_level, section)
);

CREATE TABLE assessment_questions (
    question_id INT AUTO_INCREMENT PRIMARY KEY,
    page_number INT NOT NULL,
    display_order INT NOT NULL,
    category VARCHAR(50) NOT NULL,
    question TEXT NOT NULL,
    reverse_score BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assessment_choices (
    choice_id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    display_order INT NOT NULL,
    score TINYINT NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    label VARCHAR(50) NOT NULL,
    description VARCHAR(150),

    FOREIGN KEY (question_id)
        REFERENCES assessment_questions(question_id)
        ON DELETE CASCADE
);

CREATE TABLE assessments (
    assessment_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    total_score INT NOT NULL,
    max_score INT NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    risk_level ENUM('Low','Moderate','High') NOT NULL,
    remarks TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assessment_type VARCHAR(20) NOT NULL DEFAULT 'initial',
    previous_assessment_id INT NULL,

    FOREIGN KEY (student_id)
        REFERENCES students(student_id),

    FOREIGN KEY (previous_assessment_id)
        REFERENCES assessments(assessment_id)
        ON DELETE SET NULL
);

CREATE TABLE assessment_answers (
    answer_id INT AUTO_INCREMENT PRIMARY KEY,
    assessment_id INT NOT NULL,
    question_id INT NOT NULL,
    selected_score TINYINT NOT NULL,
    weighted_score TINYINT NOT NULL,

    FOREIGN KEY (assessment_id)
        REFERENCES assessments(assessment_id)
        ON DELETE CASCADE,

    FOREIGN KEY (question_id)
        REFERENCES assessment_questions(question_id)
);

CREATE TABLE wellness_check_ins (
    checkin_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    average_score DECIMAL(4,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON DELETE CASCADE
);

CREATE TABLE mood_entries (
    mood_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    mood ENUM('Great','Good','Okay','Not Great','Difficult') NOT NULL,
    note VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON DELETE CASCADE
);

CREATE TABLE anonymous_screenings (
    screening_id INT AUTO_INCREMENT PRIMARY KEY,
    anonymous_key VARCHAR(64) NOT NULL UNIQUE,
    overwhelmed VARCHAR(20),
    motivation VARCHAR(20),
    support VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reports (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL,
    report_type VARCHAR(100),
    generated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (teacher_id)
        REFERENCES teachers(teacher_id)
);

CREATE TABLE appointments (
    appointment_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    counselor_id INT NULL,
    counselor_admin_id INT NULL,
    baseline_assessment_id INT NULL,
    scheduled_date DATE NULL,
    scheduled_time TIME NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    request_source VARCHAR(20) NOT NULL DEFAULT 'Counselor',
    reason VARCHAR(255),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,

    FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON DELETE CASCADE,

    FOREIGN KEY (counselor_id)
        REFERENCES teachers(teacher_id)
        ON DELETE CASCADE,

    FOREIGN KEY (counselor_admin_id)
        REFERENCES admins(admin_id)
        ON DELETE CASCADE,

    FOREIGN KEY (baseline_assessment_id)
        REFERENCES assessments(assessment_id)
        ON DELETE SET NULL
);

INSERT INTO grade_sections
(grade_level, section)
VALUES
(5,'Lapu-Lapu'),
(6,'Rizal');

INSERT INTO admins
(
    first_name,
    last_name,
    email,
    password
)
VALUES
(
    'System',
    'Administrator',
    'admin@sparkcheck.edu',
    'admin123'
);

INSERT INTO teachers
(
    teacher_code,
    first_name,
    last_name,
    email,
    password,
    grade_level,
    section,
    is_admin
)
VALUES
(
    'TCH001',
    'Jennethe',
    'Santos',
    'jsantos@sparkcheck.edu',
    '123456',
    5,
    'Lapu-Lapu',
    FALSE
),
(
    'TCH002',
    'Michael',
    'Reyes',
    'mreyes@sparkcheck.edu',
    '123456',
    6,
    'Rizal',
    'FALSE'
);

INSERT INTO teacher_assignments
(
    teacher_id,
    grade_level,
    section
)
VALUES
(1,5,'Lapu-Lapu'),
(2,6,'Rizal');

INSERT INTO students
(
    student_code,
    teacher_id,
    first_name,
    middle_initial,
    last_name,
    suffix,
    age,
    grade_level,
    section,
    email,
    password
)
VALUES
(
    'G5LL001',
    1,
    'John',
    'B',
    'Cruz',
    '',
    10,
    5,
    'Lapu-Lapu',
    'jcruz001@sparkcheck.edu',
    '123456'
),
(
    'G5LL002',
    1,
    'Maria',
    'S',
    'Garcia',
    '',
    11,
    5,
    'Lapu-Lapu',
    'mgarcia002@sparkcheck.edu',
    '123456'
),
(
    'G6R001',
    2,
    'Kyle',
    'D',
    'Santos',
    '',
    12,
    6,
    'Rizal',
    'ksantos001@sparkcheck.edu',
    '123456'
),
(
    'G6R002',
    2,
    'Sarah',
    'L',
    'Lopez',
    '',
    11,
    6,
    'Rizal',
    'slopez002@sparkcheck.edu',
    '123456'
);

INSERT INTO assessment_questions
(
    page_number,
    display_order,
    category,
    question,
    reverse_score
)
VALUES
(1,1,'School','☀️ I feel happy when I wake up for school.',FALSE),
(1,2,'School','📚 I enjoy learning new lessons.',FALSE),
(1,3,'School','⚡ I have lots of energy during class.',FALSE),
(1,4,'School','✏️ I can manage my schoolwork well.',FALSE),
(1,5,'School','🎒 I feel excited to go to school.',FALSE),

(2,6,'Home','🏡 I feel safe and happy at home.',FALSE),
(2,7,'Home','❤️ I have someone I can talk to when I''m sad.',FALSE),
(2,8,'Home','🌙 I get enough rest and sleep at home.',FALSE),
(2,9,'Home','🍽️ My family spends time talking or eating together.',FALSE),
(2,10,'Home','❤️ I feel loved and cared for at home.',FALSE),

(3,11,'Social Lifestyle','👭 My classmates are kind to me.',FALSE),
(3,12,'Social Lifestyle','🌳 I enjoy playing or spending time outside.',FALSE),
(3,13,'Social Lifestyle','⚽ I get enough time to play after school.',FALSE),
(3,14,'Social Lifestyle','🤝 I have friends I enjoy spending time with.',FALSE),
(3,15,'Social Lifestyle','💙 I feel good about myself.',FALSE);

INSERT INTO assessment_choices
(question_id, display_order, score, emoji, label, description)
VALUES
(1,1,3,'😁','Most Days','I feel this most of the time.'),
(1,2,2,'🙂','Some Days','I feel this sometimes.'),
(1,3,1,'😢','Hardly Ever','I rarely feel this way.'),

(2,1,3,'🤩','I love it','Learning feels exciting.'),
(2,2,2,'🙂','It’s okay','Some lessons are fun.'),
(2,3,1,'😞','Not really','I don’t enjoy it much.'),

(3,1,3,'⚡','Full energy','I feel active in class.'),
(3,2,2,'🙂','Okay energy','I feel fine most of the time.'),
(3,3,1,'🥱','Very tired','I feel sleepy often.'),

(4,1,3,'😄','I can manage','Schoolwork is usually easy for me.'),
(4,2,2,'😐','It’s challenging','Some lessons are difficult.'),
(4,3,1,'😟','I struggle a lot','Schoolwork is very hard for me.'),

(5,1,3,'🥳','Super excited','I can’t wait for school.'),
(5,2,2,'🙂','Neutral','It’s just another day.'),
(5,3,1,'😔','Not excited','I don’t feel like going.'),

(6,1,3,'🏡','Always safe','Home feels very safe.'),
(6,2,2,'🙂','Mostly safe','Most days are okay.'),
(6,3,1,'😟','Not always safe','I sometimes feel unsafe.'),

(7,1,3,'🤗','Always supported','I can talk to someone.'),
(7,2,2,'🙂','Sometimes','I have someone to talk to.'),
(7,3,1,'😢','Rarely','I keep things inside.'),

(8,1,3,'😴','Great sleep','I wake up rested.'),
(8,2,2,'🙂','Okay sleep','I sleep fine sometimes.'),
(8,3,1,'😔','Poor sleep','I don’t sleep well.'),

(9,1,3,'🥰','Every day','We spend time together often.'),
(9,2,2,'🙂','Sometimes','We spend time occasionally.'),
(9,3,1,'😔','Rarely','We don’t spend much time.'),

(10,1,3,'❤️','Very loved','I feel cared for daily.'),
(10,2,2,'🙂','Sometimes loved','I usually feel okay.'),
(10,3,1,'😢','Rarely loved','I don’t always feel cared for.'),

(11,1,3,'😁','Very kind','My classmates are nice.'),
(11,2,2,'🙂','Sometimes kind','They are okay most times.'),
(11,3,1,'😞','Not kind','I often feel left out.'),

(12,1,3,'🤸','Love it','I enjoy outdoor time.'),
(12,2,2,'🙂','Sometimes','I go outside occasionally.'),
(12,3,1,'😔','Rarely','I stay inside most of the time.'),

(13,1,3,'⚽','Enough play','I get plenty of time to play.'),
(13,2,2,'🙂','Some play time','I play sometimes.'),
(13,3,1,'😔','Very little','I don’t get much play time.'),

(14,1,3,'😄','Lots of friends','I enjoy being with friends.'),
(14,2,2,'🙂','Some friends','I have a few friends.'),
(14,3,1,'😔','Often alone','I feel alone sometimes.'),

(15,1,3,'🥰','Very confident','I feel good about myself.'),
(15,2,2,'🙂','Okay confidence','I feel fine most days.'),
(15,3,1,'😢','Low confidence','I don’t feel great about myself.');