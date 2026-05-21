package com.srms.web;

import com.srms.model.AdminUser;
import com.srms.model.Student;
import com.srms.repo.AdminUserRepository;
import com.srms.repo.StudentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Optional;

/**
 * Simple plain-text credential check (no hashing / tokens yet, by design).
 * Returns the session descriptor the front-end stores client-side.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AdminUserRepository admins;
    private final StudentRepository students;

    public AuthController(AdminUserRepository admins, StudentRepository students) {
        this.admins = admins;
        this.students = students;
    }

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody LoginRequest req) {
        String role = req.role();
        String username = req.username() == null ? "" : req.username().trim();
        String password = req.password() == null ? "" : req.password();

        if ("admin".equals(role)) {
            Optional<AdminUser> admin = admins.findById(username);
            if (admin.isPresent() && admin.get().getPassword().equals(password)) {
                return Map.of("role", "admin", "identifier", username, "name", "Administrator");
            }
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid admin credentials.");
        }

        if ("student".equals(role)) {
            Optional<Student> student = students.findByRollNoIgnoreCase(username);
            if (student.isPresent() && password.equals(student.get().getPassword())) {
                return Map.of("role", "student", "identifier", student.get().getId(), "name", student.get().getName());
            }
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid roll number or password.");
        }

        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown role");
    }

    public record LoginRequest(String role, String username, String password) {
    }
}
