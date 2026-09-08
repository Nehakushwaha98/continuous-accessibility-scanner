package com.accessibility.scanner;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface IssueRepository extends JpaRepository<Issue, Long> {
    List<Issue> findByScanResultId(Long scanResultId);
}