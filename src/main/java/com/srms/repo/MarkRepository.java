package com.srms.repo;

import com.srms.model.Mark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface MarkRepository extends JpaRepository<Mark, String> {

    List<Mark> findByStudentId(String studentId);

    Optional<Mark> findByStudentIdAndSubjectIdAndExamId(String studentId, String subjectId, String examId);

    @Transactional
    void deleteByStudentIdAndSubjectIdAndExamId(String studentId, String subjectId, String examId);

    @Transactional
    void deleteByStudentId(String studentId);

    @Transactional
    void deleteBySubjectId(String subjectId);

    @Transactional
    void deleteByExamId(String examId);
}
