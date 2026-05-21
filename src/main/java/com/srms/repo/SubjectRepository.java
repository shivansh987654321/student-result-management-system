package com.srms.repo;

import com.srms.model.Subject;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SubjectRepository extends JpaRepository<Subject, String> {
    Optional<Subject> findByCodeIgnoreCase(String code);
}
