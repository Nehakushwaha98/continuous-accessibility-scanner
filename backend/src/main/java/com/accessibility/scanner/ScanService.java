package com.accessibility.scanner;

import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import io.github.bonigarcia.wdm.WebDriverManager;

import java.util.ArrayList;
import java.util.List;

@Service
public class ScanService {

    @Autowired
    private ScanResultRepository repository;

    @Autowired
    private IssueRepository issueRepository;

    public ScanResult performScan(String url) {
        ScanResult result = new ScanResult(url);
        List<Issue> detectedIssues = new ArrayList<>();

        WebDriverManager.chromedriver().setup();
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless=new");
        options.addArguments("--no-sandbox");
        options.addArguments("--disable-dev-shm-usage");

        ChromeDriver driver = new ChromeDriver(options);

        try {
            driver.get(url);

            List<WebElement> images = driver.findElements(By.tagName("img"));
            for (WebElement img : images) {
                String alt = img.getAttribute("alt");
                if (alt == null || alt.trim().isEmpty()) {
                    detectedIssues.add(new Issue("missing-alt-text", "critical", "img"));
                }
            }

            List<WebElement> inputs = driver.findElements(By.tagName("input"));
            for (WebElement input : inputs) {
                String ariaLabel = input.getAttribute("aria-label");
                String id = input.getAttribute("id");
                boolean hasLabel = false;
                if (id != null && !id.isEmpty()) {
                    List<WebElement> labels = driver.findElements(By.cssSelector("label[for='" + id + "']"));
                    hasLabel = !labels.isEmpty();
                }
                if ((ariaLabel == null || ariaLabel.trim().isEmpty()) && !hasLabel) {
                    detectedIssues.add(new Issue("missing-form-label", "serious", "input"));
                }
            }

            List<WebElement> links = driver.findElements(By.tagName("a"));
            for (WebElement link : links) {
                String text = link.getText();
                String ariaLabel = link.getAttribute("aria-label");
                if ((text == null || text.trim().isEmpty()) && (ariaLabel == null || ariaLabel.trim().isEmpty())) {
                    detectedIssues.add(new Issue("empty-link", "moderate", "a"));
                }
            }

            String title = driver.getTitle();
            if (title == null || title.trim().isEmpty()) {
                detectedIssues.add(new Issue("missing-page-title", "minor", "title"));
            }

        } finally {
            driver.quit();
        }

        int critical = 0, serious = 0, moderate = 0, minor = 0;
        for (Issue issue : detectedIssues) {
            switch (issue.getSeverity()) {
                case "critical": critical++; break;
                case "serious": serious++; break;
                case "moderate": moderate++; break;
                case "minor": minor++; break;
            }
        }

        result.setTotalIssues(detectedIssues.size());
        result.setCriticalCount(critical);
        result.setSeriousCount(serious);
        result.setModerateCount(moderate);
        result.setMinorCount(minor);
        result.setRawResultJson("{\"note\":\"see issues table for details\"}");

        ScanResult savedResult = repository.save(result);

        for (Issue issue : detectedIssues) {
            issue.setScanResult(savedResult);
            issueRepository.save(issue);
        }

        return savedResult;
    }

    public List<ScanResult> getAllScans() {
        return repository.findAll();
    }

    public List<Issue> getIssuesForScan(Long scanId) {
        return issueRepository.findByScanResultId(scanId);
    }

    public Issue updateIssue(Long issueId, String status, String assignedTo, String evidenceNote) {
        Issue issue = issueRepository.findById(issueId).orElseThrow();
        if (status != null) issue.setStatus(status);
        if (assignedTo != null) issue.setAssignedTo(assignedTo);
        if (evidenceNote != null) issue.setEvidenceNote(evidenceNote);
        return issueRepository.save(issue);
    }
}