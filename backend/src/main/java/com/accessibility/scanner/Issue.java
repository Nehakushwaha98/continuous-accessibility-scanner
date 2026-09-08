package com.accessibility.scanner;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "issues")
public class Issue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "scan_result_id")
    @JsonIgnore
    private ScanResult scanResult;

    private String type;
    private String severity;
    private String element;

    private String status = "Open";
    private String assignedTo;
    private String evidenceNote;

    public Issue() {}

    public Issue(String type, String severity, String element) {
        this.type = type;
        this.severity = severity;
        this.element = element;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public ScanResult getScanResult() { return scanResult; }
    public void setScanResult(ScanResult scanResult) { this.scanResult = scanResult; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public String getElement() { return element; }
    public void setElement(String element) { this.element = element; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getAssignedTo() { return assignedTo; }
    public void setAssignedTo(String assignedTo) { this.assignedTo = assignedTo; }

    public String getEvidenceNote() { return evidenceNote; }
    public void setEvidenceNote(String evidenceNote) { this.evidenceNote = evidenceNote; }
}