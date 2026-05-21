package com.srms.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

@Entity
@Table(name = "marks", indexes = {
        @Index(name = "idx_marks_triple", columnList = "student_id,subject_id,exam_id")
})
public class Mark {

    @Id
    private String id;

    @Column(name = "student_id")
    private String studentId;

    @Column(name = "subject_id")
    private String subjectId;

    @Column(name = "exam_id")
    private String examId;

    private int marks;

    public Mark() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public String getSubjectId() {
        return subjectId;
    }

    public void setSubjectId(String subjectId) {
        this.subjectId = subjectId;
    }

    public String getExamId() {
        return examId;
    }

    public void setExamId(String examId) {
        this.examId = examId;
    }

    public int getMarks() {
        return marks;
    }

    public void setMarks(int marks) {
        this.marks = marks;
    }
}
