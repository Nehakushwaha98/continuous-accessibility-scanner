package com.accessibility.scanner;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EvidenceRepository extends JpaRepository<Evidence, Long> {
    List<Evidence> findByIssueIdOrderByUploadedAtAsc(Long issueId);
    Optional<Evidence> findByIssueIdAndType(Long issueId, String type);
}
