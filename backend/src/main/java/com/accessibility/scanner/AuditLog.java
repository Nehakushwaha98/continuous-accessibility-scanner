package com.accessibility.scanner;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_log")
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String entityType;
    private Long entityId;
    private String action;
    private String actor;
    private LocalDateTime timestamp = LocalDateTime.now();

    @Column(columnDefinition = "TEXT")
    private String details;

    public AuditLog() {}
    public AuditLog(String entityType, Long entityId, String action, String actor, String details) {
        this.entityType = entityType;
        this.entityId = entityId;
        this.action = action;
        this.actor = actor;
        this.details = details;
    }

    public Long getId() { return id; }
    public String getEntityType() { return entityType; }
    public Long getEntityId() { return entityId; }
    public String getAction() { return action; }
    public String getActor() { return actor; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public String getDetails() { return details; }
}