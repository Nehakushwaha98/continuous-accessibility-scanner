package com.accessibility.scanner;

import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import io.github.bonigarcia.wdm.WebDriverManager;

import java.util.List;

@Service
public class ScanService {

    @Autowired
    private ScanResultRepository repository;

    public ScanResult performScan(String url) {
        ScanResult result = new ScanResult(url);

        int critical = 0, serious = 0, moderate = 0, minor = 0;
        StringBuilder issuesLog = new StringBuilder("{\"issues\":[");

        WebDriverManager.chromedriver().setup();
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless=new");
        options.addArguments("--no-sandbox");
        options.addArguments("--disable-dev-shm-usage");

        ChromeDriver driver = new ChromeDriver(options);

        try {
            driver.get(url);

            // Check 1: Images without alt text (CRITICAL)
            List<WebElement> images = driver.findElements(By.tagName("img"));
            for (WebElement img : images) {
                String alt = img.getAttribute("alt");
                if (alt == null || alt.trim().isEmpty()) {
                    critical++;
                    issuesLog.append("{\"type\":\"missing-alt-text\",\"severity\":\"critical\",\"element\":\"img\"},");
                }
            }

            // Check 2: Form inputs without labels (SERIOUS)
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
                    serious++;
                    issuesLog.append("{\"type\":\"missing-form-label\",\"severity\":\"serious\",\"element\":\"input\"},");
                }
            }

            // Check 3: Empty links (MODERATE)
            List<WebElement> links = driver.findElements(By.tagName("a"));
            for (WebElement link : links) {
                String text = link.getText();
                String ariaLabel = link.getAttribute("aria-label");
                if ((text == null || text.trim().isEmpty()) && (ariaLabel == null || ariaLabel.trim().isEmpty())) {
                    moderate++;
                    issuesLog.append("{\"type\":\"empty-link\",\"severity\":\"moderate\",\"element\":\"a\"},");
                }
            }

            // Check 4: Missing page title (MINOR)
            String title = driver.getTitle();
            if (title == null || title.trim().isEmpty()) {
                minor++;
                issuesLog.append("{\"type\":\"missing-page-title\",\"severity\":\"minor\",\"element\":\"title\"},");
            }

        } finally {
            driver.quit();
        }

        if (issuesLog.charAt(issuesLog.length() - 1) == ',') {
            issuesLog.deleteCharAt(issuesLog.length() - 1);
        }
        issuesLog.append("]}");

        int total = critical + serious + moderate + minor;
        result.setTotalIssues(total);
        result.setCriticalCount(critical);
        result.setSeriousCount(serious);
        result.setModerateCount(moderate);
        result.setMinorCount(minor);
        result.setRawResultJson(issuesLog.toString());

        return repository.save(result);
    }

    public List<ScanResult> getAllScans() {
        return repository.findAll();
    }
}