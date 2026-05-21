package com.srms.service;

import com.srms.model.AdminUser;
import com.srms.model.Exam;
import com.srms.model.Mark;
import com.srms.model.Student;
import com.srms.model.Subject;
import com.srms.repo.AdminUserRepository;
import com.srms.repo.ExamRepository;
import com.srms.repo.MarkRepository;
import com.srms.repo.StudentRepository;
import com.srms.repo.SubjectRepository;
import com.srms.util.Ids;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Seeds the demo data set, mirroring the original front-end seedIfEmpty().
 */
@Service
public class SeedService {

    private final StudentRepository students;
    private final SubjectRepository subjects;
    private final ExamRepository exams;
    private final MarkRepository marks;
    private final AdminUserRepository admins;

    public SeedService(StudentRepository students, SubjectRepository subjects, ExamRepository exams,
                       MarkRepository marks, AdminUserRepository admins) {
        this.students = students;
        this.subjects = subjects;
        this.exams = exams;
        this.marks = marks;
        this.admins = admins;
    }

    /** Seed only when the database has not been populated yet. */
    @Transactional
    public void seedIfEmpty() {
        if (admins.count() > 0 || students.count() > 0) {
            return;
        }
        seed();
    }

    /** Wipe everything and re-seed the demo data. */
    @Transactional
    public void resetAll() {
        marks.deleteAll();
        students.deleteAll();
        subjects.deleteAll();
        exams.deleteAll();
        admins.deleteAll();
        seed();
    }

    private void seed() {
        admins.save(new AdminUser("admin", "admin123"));

        List<Subject> subjectList = new ArrayList<>();
        subjectList.add(subject("ENG", "English", 100));
        subjectList.add(subject("MAT", "Mathematics", 100));
        subjectList.add(subject("SCI", "Science", 100));
        subjectList.add(subject("SOC", "Social Studies", 100));
        subjectList.add(subject("CMP", "Computer", 100));
        subjects.saveAll(subjectList);

        List<Exam> examList = new ArrayList<>();
        examList.add(exam("Mid-Term", 2026));
        examList.add(exam("Final", 2026));
        exams.saveAll(examList);

        List<Student> studentList = new ArrayList<>();
        studentList.add(student("S1001", "Aarav Sharma", "10", "A", "2010-06-12", "aarav@example.com"));
        studentList.add(student("S1002", "Priya Singh", "10", "A", "2010-03-22", "priya@example.com"));
        studentList.add(student("S1003", "Rohan Verma", "10", "A", "2010-09-05", "rohan@example.com"));
        studentList.add(student("S1004", "Isha Patel", "10", "B", "2010-11-18", "isha@example.com"));
        studentList.add(student("S1005", "Karan Mehta", "10", "B", "2010-01-30", "karan@example.com"));
        studentList.add(student("S1006", "Neha Gupta", "10", "B", "2010-07-14", "neha@example.com"));
        students.saveAll(studentList);

        // deterministic-ish marks for the demo
        int[][] seedMarks = {
                {88, 92, 84, 79, 95},
                {76, 84, 90, 82, 88},
                {65, 58, 72, 68, 74},
                {92, 88, 95, 90, 86},
                {45, 52, 48, 55, 60},
                {80, 75, 78, 82, 84}
        };

        List<Mark> markList = new ArrayList<>();
        for (int i = 0; i < studentList.size(); i++) {
            Student stu = studentList.get(i);
            for (int j = 0; j < subjectList.size(); j++) {
                Subject sub = subjectList.get(j);
                for (int k = 0; k < examList.size(); k++) {
                    Exam exm = examList.get(k);
                    int base = seedMarks[i][j];
                    int delta = k == 0 ? 0 : (int) Math.round(Math.sin((i + j) * 1.7) * 6);
                    int m = Math.max(0, Math.min(sub.getMaxMarks(), base + delta));
                    Mark mark = new Mark();
                    mark.setId(Ids.of("mrk"));
                    mark.setStudentId(stu.getId());
                    mark.setSubjectId(sub.getId());
                    mark.setExamId(exm.getId());
                    mark.setMarks(m);
                    markList.add(mark);
                }
            }
        }
        marks.saveAll(markList);
    }

    private Subject subject(String code, String name, int maxMarks) {
        Subject s = new Subject();
        s.setId(Ids.of("sub"));
        s.setCode(code);
        s.setName(name);
        s.setMaxMarks(maxMarks);
        return s;
    }

    private Exam exam(String name, int year) {
        Exam e = new Exam();
        e.setId(Ids.of("exm"));
        e.setName(name);
        e.setYear(year);
        return e;
    }

    private Student student(String rollNo, String name, String klass, String section, String dob, String email) {
        Student s = new Student();
        s.setId(Ids.of("stu"));
        s.setRollNo(rollNo);
        s.setName(name);
        s.setKlass(klass);
        s.setSection(section);
        s.setDob(dob);
        s.setEmail(email);
        s.setPassword("student123");
        return s;
    }
}
