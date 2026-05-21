package com.srms.web;

import com.srms.model.Student;
import com.srms.repo.MarkRepository;
import com.srms.repo.StudentRepository;
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
@RequestMapping("/api/students")
public class StudentController {

    private final StudentRepository students;
    private final MarkRepository marks;

    public StudentController(StudentRepository students, MarkRepository marks) {
        this.students = students;
        this.marks = marks;
    }

    @GetMapping
    public List<Student> list() {
        return students.findAll();
    }

    @GetMapping("/{id}")
    public Student get(@PathVariable String id) {
        return students.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));
    }

    @PostMapping
    public Student create(@RequestBody Student body) {
        if (body.getRollNo() == null || body.getRollNo().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Roll No is required");
        }
        students.findByRollNoIgnoreCase(body.getRollNo()).ifPresent(s -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Roll No already exists");
        });
        if (body.getId() == null || body.getId().isBlank()) {
            body.setId(Ids.of("stu"));
        }
        if (body.getPassword() == null || body.getPassword().isBlank()) {
            body.setPassword("student123");
        }
        return students.save(body);
    }

    @PutMapping("/{id}")
    public Student update(@PathVariable String id, @RequestBody Student body) {
        Student existing = students.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));
        if (body.getRollNo() != null && !body.getRollNo().isBlank()) {
            Optional<Student> clash = students.findByRollNoIgnoreCase(body.getRollNo());
            if (clash.isPresent() && !clash.get().getId().equals(id)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Roll No already exists");
            }
            existing.setRollNo(body.getRollNo());
        }
        if (body.getName() != null) existing.setName(body.getName());
        if (body.getKlass() != null) existing.setKlass(body.getKlass());
        if (body.getSection() != null) existing.setSection(body.getSection());
        if (body.getDob() != null) existing.setDob(body.getDob());
        if (body.getEmail() != null) existing.setEmail(body.getEmail());
        if (body.getPassword() != null && !body.getPassword().isBlank()) existing.setPassword(body.getPassword());
        return students.save(existing);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable String id) {
        marks.deleteByStudentId(id);
        students.deleteById(id);
    }
}
