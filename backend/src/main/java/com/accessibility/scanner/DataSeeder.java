package com.accessibility.scanner;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) return;
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        userRepository.save(new User("Admin", "admin@scan.local", encoder.encode("admin123"), "admin"));
        userRepository.save(new User("Dev One", "dev1@scan.local", encoder.encode("dev123"), "developer"));
        System.out.println("Seeded default login: admin@scan.local / admin123");
    }
}