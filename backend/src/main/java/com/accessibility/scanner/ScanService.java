package com.accessibility.scanner;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ScanService {

    @Autowired
    private ScanResultRepository repository;

    public ScanResult performScan(String url) {
        ScanResult result = new ScanResult(url);

        // TEMPORARY dummy logic — real scanning (axe-core) will replace this
        result.setTotalIssues(5);
        result.setCriticalCount(1);
        result.setSeriousCount(2);
        result.setModerateCount(1);
        result.setMinorCount(1);
        result.setRawResultJson("{\"note\":\"placeholder result, real scan logic coming next\"}");

        return repository.save(result);
    }

    public java.util.List<ScanResult> getAllScans() {
        return repository.findAll();
    }
}