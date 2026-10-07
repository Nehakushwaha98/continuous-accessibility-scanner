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
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain chain
    ) throws ServletException, IOException {

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

        System.out.println(
                "[AuthFilter] " + method + " " + path
                        + " | Authorization header present: " + (header != null)
        );

        if (header == null || !header.startsWith("Bearer ")) {

            System.out.println(
                    "[AuthFilter] REJECTED — missing or malformed Authorization header"
            );

            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");

            response.getWriter().write(
                    "{\"error\":\"Missing or invalid Authorization header\"}"
            );

            return;
        }

        /*
         * IMPORTANT:
         * Only JWT validation is inside this try-catch.
         * Scanner/controller errors must NOT be converted into 401.
         */

        try {

            jwtUtil.validateAndGetClaims(header.substring(7));

            System.out.println(
                    "[AuthFilter] Token OK for "
                            + method + " " + path
            );

        } catch (Exception e) {

            System.out.println(
                    "[AuthFilter] REJECTED — token validation failed for "
                            + method + " " + path
                            + " | Exception: "
                            + e.getClass().getSimpleName()
                            + " - "
                            + e.getMessage()
            );

            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");

            response.getWriter().write(
                    "{\"error\":\"Invalid or expired token\"}"
            );

            return;
        }

        /*
         * JWT is valid.
         * Continue normally to Controller/Service.
         *
         * Any scanner error will now remain a scanner/server error
         * instead of being incorrectly reported as a JWT error.
         */

        chain.doFilter(request, response);
    }
}