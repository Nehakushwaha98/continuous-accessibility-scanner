package com.accessibility.scanner;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class EvidenceService {

    private static final long MAX_FILE_SIZE = 10L * 1024L * 1024L;

    @Autowired
    private EvidenceRepository evidenceRepository;

    @Autowired
    private IssueRepository issueRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    public List<Evidence> getForIssue(Long issueId) {
        ensureIssueExists(issueId);
        return evidenceRepository.findByIssueIdOrderByUploadedAtAsc(issueId);
    }

    @Transactional
    public Evidence upload(Long issueId, String type, MultipartFile file) throws IOException {
        Issue issue = ensureIssueExists(issueId);
        String normalizedType = normalizeType(type);

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Evidence file is required");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Evidence file must be 10 MB or smaller");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
            throw new IllegalArgumentException("Only image evidence files are allowed");
        }

        // One current Before and one current After screenshot per issue.
        evidenceRepository.findByIssueIdAndType(issueId, normalizedType)
                .ifPresent(evidenceRepository::delete);

        Evidence evidence = new Evidence();
        evidence.setIssue(issue);
        evidence.setType(normalizedType);
        evidence.setFileName(safeFileName(file.getOriginalFilename()));
        evidence.setContentType(contentType);
        evidence.setFileSize(file.getSize());
        evidence.setFileData(file.getBytes());
        evidence.setUploadedAt(LocalDateTime.now());

        Evidence saved = evidenceRepository.save(evidence);

        auditLogRepository.save(new AuditLog(
                "issue",
                issueId,
                "EVIDENCE_UPLOADED",
                "user",
                "type=" + normalizedType + ", fileName=" + saved.getFileName() + ", size=" + saved.getFileSize()
        ));

        return saved;
    }

    public Evidence getFile(Long evidenceId) {
        return evidenceRepository.findById(evidenceId)
                .orElseThrow(() -> new IllegalArgumentException("Evidence not found"));
    }

    @Transactional
    public void delete(Long evidenceId) {
        Evidence evidence = getFile(evidenceId);
        Long issueId = evidence.getIssue().getId();
        String type = evidence.getType();
        evidenceRepository.delete(evidence);

        auditLogRepository.save(new AuditLog(
                "issue",
                issueId,
                "EVIDENCE_DELETED",
                "user",
                "type=" + type + ", evidenceId=" + evidenceId
        ));
    }

    private Issue ensureIssueExists(Long issueId) {
        return issueRepository.findById(issueId)
                .orElseThrow(() -> new IllegalArgumentException("Issue not found: " + issueId));
    }

    private String normalizeType(String type) {
        if (type == null) throw new IllegalArgumentException("Evidence type is required");
        String normalized = type.trim().toLowerCase();
        if (!normalized.equals("before") && !normalized.equals("after")) {
            throw new IllegalArgumentException("Evidence type must be 'before' or 'after'");
        }
        return normalized;
    }

    private String safeFileName(String originalName) {
        String cleaned = StringUtils.cleanPath(originalName == null ? "evidence" : originalName);
        if (cleaned.contains("..")) return "evidence";
        return cleaned.length() > 255 ? cleaned.substring(cleaned.length() - 255) : cleaned;
    }
}