package com.srms.repo;

import com.srms.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StudentRepository extends JpaRepository<Student, String> {
    Optional<Student> findByRollNoIgnoreCase(String rollNo);
}
