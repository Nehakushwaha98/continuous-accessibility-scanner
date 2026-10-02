package com.accessibility.scanner;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Entity
@Table(name = "evidence")
public class Evidence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "issue_id", nullable = false)
    @JsonIgnore
    private Issue issue;

    @Column(nullable = false, length = 10)
    private String type; // before | after

    @Column(nullable = false, length = 255)
    private String fileName;

    @Column(nullable = false, length = 100)
    private String contentType;

    @Column(nullable = false)
    private long fileSize;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "file_data", nullable = false, columnDefinition = "bytea")
    @JsonIgnore
    private byte[] fileData;

    @Column(nullable = false)
    private LocalDateTime uploadedAt = LocalDateTime.now();

    public Evidence() {}

    public Long getId() { return id; }
    public Issue getIssue() { return issue; }
    public void setIssue(Issue issue) { this.issue = issue; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }
    public long getFileSize() { return fileSize; }
    public void setFileSize(long fileSize) { this.fileSize = fileSize; }
    public byte[] getFileData() { return fileData; }
    public void setFileData(byte[] fileData) { this.fileData = fileData; }
    public LocalDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(LocalDateTime uploadedAt) { this.uploadedAt = uploadedAt; }
}


