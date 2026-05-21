package com.srms.web;

import com.srms.model.AdminUser;
import com.srms.repo.AdminUserRepository;
import com.srms.service.SeedService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminUserRepository admins;
    private final SeedService seedService;

    public AdminController(AdminUserRepository admins, SeedService seedService) {
        this.admins = admins;
        this.seedService = seedService;
    }

    /** Public-safe admin info (no password). */
    @GetMapping
    public Map<String, String> get() {
        AdminUser admin = admins.findAll().stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No admin configured"));
        return Map.of("username", admin.getUsername());
    }

    @PutMapping("/password")
    public Map<String, String> updatePassword(@RequestBody Map<String, String> body) {
        String newPw = body.get("password");
        if (newPw == null || newPw.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required");
        }
        AdminUser admin = admins.findAll().stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No admin configured"));
        admin.setPassword(newPw);
        admins.save(admin);
        return Map.of("status", "ok");
    }

    /** Wipe all data and restore the demo seed. */
    @PostMapping("/reset")
    public Map<String, String> reset() {
        seedService.resetAll();
        return Map.of("status", "ok");
    }
}
