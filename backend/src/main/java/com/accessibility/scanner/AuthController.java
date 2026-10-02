package com.accessibility.scanner;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    @PostMapping("/signup")
    public Map<String, Object> signup(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        String email = body.get("email");
        String password = body.get("password");
        String role = body.getOrDefault("role", "auditor");

        if (email == null || email.trim().isEmpty() || password == null || password.length() < 6) {
            throw new RuntimeException("Email is required and password must be at least 6 characters");
        }
        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("An account with this email already exists");
        }

        User user = new User(name, email, encoder.encode(password), role);
        User saved = userRepository.save(user);
        String token = jwtUtil.generateToken(saved.getId(), saved.getEmail(), saved.getRole());

        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("id", saved.getId());
        userInfo.put("name", saved.getName());
        userInfo.put("role", saved.getRole());
        result.put("user", userInfo);
        return result;
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!encoder.matches(password, user.getPasswordHash())) {
            throw new RuntimeException("Invalid email or password");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole());

        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("id", user.getId());
        userInfo.put("name", user.getName());
        userInfo.put("role", user.getRole());
        result.put("user", userInfo);
        return result;
    }
}