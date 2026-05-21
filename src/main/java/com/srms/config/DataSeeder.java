package com.srms.config;

import com.srms.service.SeedService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/** Ensures demo data exists on first startup. */
@Component
public class DataSeeder implements CommandLineRunner {

    private final SeedService seedService;

    public DataSeeder(SeedService seedService) {
        this.seedService = seedService;
    }

    @Override
    public void run(String... args) {
        seedService.seedIfEmpty();
    }
}
