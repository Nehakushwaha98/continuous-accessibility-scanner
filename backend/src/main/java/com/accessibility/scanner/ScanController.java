package com.accessibility.scanner;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/scans")
@CrossOrigin(origins = "*")
public class ScanController {

    @Autowired
    private ScanService scanService;

    @PostMapping
    public ScanResult createScan(@RequestBody Map<String, String> request) {
        String url = request.get("url");
        return scanService.performScan(url);
    }

    @GetMapping
    public List<ScanResult> getAllScans() {
        return scanService.getAllScans();
    }

    @GetMapping("/{id}/issues")
    public List<Issue> getIssuesForScan(@PathVariable Long id) {
        return scanService.getIssuesForScan(id);
    }

    @PutMapping("/issues/{issueId}")
    public Issue updateIssue(@PathVariable Long issueId, @RequestBody Map<String, String> request) {
        return scanService.updateIssue(
                issueId,
                request.get("status"),
                request.get("assignedTo"),
                request.get("evidenceNote")
        );
    }
}