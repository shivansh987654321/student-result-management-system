package com.srms.web;

import com.srms.model.Exam;
import com.srms.repo.ExamRepository;
import com.srms.repo.MarkRepository;
import com.srms.util.Ids;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Year;
import java.util.List;

@RestController
@RequestMapping("/api/exams")
public class ExamController {

    private final ExamRepository exams;
    private final MarkRepository marks;

    public ExamController(ExamRepository exams, MarkRepository marks) {
        this.exams = exams;
        this.marks = marks;
    }

    @GetMapping
    public List<Exam> list() {
        return exams.findAll();
    }

    @PostMapping
    public Exam create(@RequestBody Exam body) {
        if (body.getName() == null || body.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Exam name is required");
        }
        if (body.getId() == null || body.getId().isBlank()) {
            body.setId(Ids.of("exm"));
        }
        if (body.getYear() <= 0) {
            body.setYear(Year.now().getValue());
        }
        return exams.save(body);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable String id) {
        marks.deleteByExamId(id);
        exams.deleteById(id);
    }
}
