package com.srms.web;

import com.srms.model.Mark;
import com.srms.repo.MarkRepository;
import com.srms.util.Ids;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/marks")
public class MarkController {

    private final MarkRepository marks;

    public MarkController(MarkRepository marks) {
        this.marks = marks;
    }

    /** List all marks, or only one student's marks when studentId is supplied. */
    @GetMapping
    public List<Mark> list(@RequestParam(required = false) String studentId) {
        if (studentId != null && !studentId.isBlank()) {
            return marks.findByStudentId(studentId);
        }
        return marks.findAll();
    }

    /** Upsert a mark, keyed by (studentId, subjectId, examId). */
    @PostMapping
    public Mark upsert(@RequestBody Mark body) {
        if (body.getStudentId() == null || body.getSubjectId() == null || body.getExamId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "studentId, subjectId and examId are required");
        }
        Mark mark = marks
                .findByStudentIdAndSubjectIdAndExamId(body.getStudentId(), body.getSubjectId(), body.getExamId())
                .orElseGet(() -> {
                    Mark m = new Mark();
                    m.setId(Ids.of("mrk"));
                    m.setStudentId(body.getStudentId());
                    m.setSubjectId(body.getSubjectId());
                    m.setExamId(body.getExamId());
                    return m;
                });
        mark.setMarks(body.getMarks());
        return marks.save(mark);
    }

    @DeleteMapping
    public void delete(@RequestParam String studentId,
                       @RequestParam String subjectId,
                       @RequestParam String examId) {
        marks.deleteByStudentIdAndSubjectIdAndExamId(studentId, subjectId, examId);
    }
}
