package com.srms.web;

import com.srms.model.Subject;
import com.srms.repo.MarkRepository;
import com.srms.repo.SubjectRepository;
import com.srms.util.Ids;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/subjects")
public class SubjectController {

    private final SubjectRepository subjects;
    private final MarkRepository marks;

    public SubjectController(SubjectRepository subjects, MarkRepository marks) {
        this.subjects = subjects;
        this.marks = marks;
    }

    @GetMapping
    public List<Subject> list() {
        return subjects.findAll();
    }

    @PostMapping
    public Subject create(@RequestBody Subject body) {
        if (body.getCode() == null || body.getCode().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Subject code is required");
        }
        subjects.findByCodeIgnoreCase(body.getCode()).ifPresent(s -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Subject code already exists");
        });
        if (body.getId() == null || body.getId().isBlank()) {
            body.setId(Ids.of("sub"));
        }
        if (body.getMaxMarks() <= 0) {
            body.setMaxMarks(100);
        }
        return subjects.save(body);
    }

    @PutMapping("/{id}")
    public Subject update(@PathVariable String id, @RequestBody Subject body) {
        Subject existing = subjects.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject not found"));
        if (body.getCode() != null && !body.getCode().isBlank()) {
            Optional<Subject> clash = subjects.findByCodeIgnoreCase(body.getCode());
            if (clash.isPresent() && !clash.get().getId().equals(id)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Subject code already exists");
            }
            existing.setCode(body.getCode());
        }
        if (body.getName() != null) existing.setName(body.getName());
        if (body.getMaxMarks() > 0) existing.setMaxMarks(body.getMaxMarks());
        return subjects.save(existing);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable String id) {
        marks.deleteBySubjectId(id);
        subjects.deleteById(id);
    }
}
