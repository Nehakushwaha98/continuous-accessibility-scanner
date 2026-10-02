package com.accessibility.scanner;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class AuthFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        String method = request.getMethod();

        if (path.startsWith("/api/auth") || method.equals("OPTIONS")) {
            chain.doFilter(request, response);
            return;
        }

        if (!path.startsWith("/api/")) {
            chain.doFilter(request, response);
            return;
        }

        String header = request.getHeader("Authorization");

        // TEMP DEBUG LOGGING — remove once the 401 issue is found
        System.out.println("[AuthFilter] " + method + " " + path
                + " | Authorization header present: " + (header != null)
                + " | value starts with: " + (header != null && header.length() > 20 ? header.substring(0, 20) + "..." : header));

        if (header == null || !header.startsWith("Bearer ")) {
            System.out.println("[AuthFilter] REJECTED — missing or malformed Authorization header for " + method + " " + path);
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Missing or invalid Authorization header\"}");
            return;
        }

        try {
            jwtUtil.validateAndGetClaims(header.substring(7));
            System.out.println("[AuthFilter] Token OK for " + method + " " + path);
            chain.doFilter(request, response);
        } catch (Exception e) {
            // TEMP DEBUG LOGGING — this line tells us the EXACT reason (expired, bad signature, malformed, etc.)
            System.out.println("[AuthFilter] REJECTED — token validation failed for " + method + " " + path
                    + " | Exception: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Invalid or expired token\"}");
        }
    }
}