package com.accessibility.scanner;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "scan_results")
public class ScanResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String url;

    private LocalDateTime scanDate;

    private int totalIssues;

    private int criticalCount;
    private int seriousCount;
    private int moderateCount;
    private int minorCount;

    @Column(columnDefinition = "TEXT")
    private String rawResultJson;

    @OneToMany(mappedBy = "scanResult", cascade = CascadeType.ALL)
    private java.util.List<Issue> issues;

    // Constructors
    public ScanResult() {
        this.scanDate = LocalDateTime.now();
    }

    public ScanResult(String url) {
        this.url = url;
        this.scanDate = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public LocalDateTime getScanDate() { return scanDate; }
    public void setScanDate(LocalDateTime scanDate) { this.scanDate = scanDate; }

    public int getTotalIssues() { return totalIssues; }
    public void setTotalIssues(int totalIssues) { this.totalIssues = totalIssues; }

    public int getCriticalCount() { return criticalCount; }
    public void setCriticalCount(int criticalCount) { this.criticalCount = criticalCount; }

    public int getSeriousCount() { return seriousCount; }
    public void setSeriousCount(int seriousCount) { this.seriousCount = seriousCount; }

    public int getModerateCount() { return moderateCount; }
    public void setModerateCount(int moderateCount) { this.moderateCount = moderateCount; }

    public int getMinorCount() { return minorCount; }
    public void setMinorCount(int minorCount) { this.minorCount = minorCount; }

    public String getRawResultJson() { return rawResultJson; }
    public void setRawResultJson(String rawResultJson) { this.rawResultJson = rawResultJson; }

    public java.util.List<Issue> getIssues() { return issues; }
    public void setIssues(java.util.List<Issue> issues) { this.issues = issues; }
}