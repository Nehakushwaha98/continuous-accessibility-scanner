package com.accessibility.scanner;

import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ScanService {

    @Autowired
    private ScanResultRepository repository;

    @Autowired
    private IssueRepository issueRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    private static final String USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    + "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

    /**
     * Fetches the page HTML.
     * No browser required — HTTP GET + HTML parsing using Jsoup.
     */
    private Document fetchDocument(String url) throws Exception {

        Connection.Response response = Jsoup.connect(url)
                .userAgent(USER_AGENT)
                .header("Accept-Language", "en-US,en;q=0.9")
                .timeout(15000)
                .maxBodySize(5 * 1024 * 1024)
                .followRedirects(true)
                .ignoreHttpErrors(true)
                .execute();

        if (response.statusCode() >= 400) {
            throw new ScanFailedException(
                    "Website responded with HTTP " + response.statusCode()
                            + " — it may be blocking automated requests or the page does not exist.",
                    null
            );
        }

        return response.parse();
    }

    /**
     * Main accessibility scan.
     */
    public ScanResult performScan(String url) {

        ScanResult result = new ScanResult(url);
        List<Issue> detectedIssues = new ArrayList<>();

        Document doc;

        try {
            doc = fetchDocument(url);

        } catch (ScanFailedException sfe) {
            throw sfe;

        } catch (Exception e) {

            throw new ScanFailedException(
                    "Scan failed for " + url + ": "
                            + e.getClass().getSimpleName()
                            + (e.getMessage() != null
                            ? " - " + e.getMessage()
                            : ""),
                    e
            );
        }

        /*
         * =========================================================
         * 1. MISSING ALT TEXT
         * WCAG 1.1.1
         * =========================================================
         */

        Elements images = doc.select("img");

        for (Element img : images) {

            String alt = img.attr("alt");

            if (alt == null || alt.trim().isEmpty()) {

                detectedIssues.add(
                        new Issue(
                                "missing-alt-text",
                                "critical",
                                "img"
                        )
                );
            }
        }

        /*
         * =========================================================
         * 2. MISSING FORM LABEL
         * WCAG 3.3.2
         * =========================================================
         */

        Elements inputs = doc.select("input");

        for (Element input : inputs) {

            String ariaLabel = input.attr("aria-label");
            String ariaLabelledBy = input.attr("aria-labelledby");
            String id = input.attr("id");

            boolean hasLabel = false;

            // Normal <label for="...">
            if (id != null && !id.isEmpty()) {

                hasLabel = !doc
                        .select("label[for=" + id + "]")
                        .isEmpty();
            }

            // aria-label
            boolean hasAriaLabel =
                    ariaLabel != null &&
                            !ariaLabel.trim().isEmpty();

            // aria-labelledby
            boolean hasAriaLabelledBy =
                    ariaLabelledBy != null &&
                            !ariaLabelledBy.trim().isEmpty();

            if (!hasLabel
                    && !hasAriaLabel
                    && !hasAriaLabelledBy) {

                detectedIssues.add(
                        new Issue(
                                "missing-form-label",
                                "serious",
                                "input"
                        )
                );
            }
        }

        /*
         * =========================================================
         * 3. EMPTY / INACCESSIBLE LINKS
         * WCAG 2.4.4
         * =========================================================
         */

        Elements links = doc.select("a");

        for (Element link : links) {

            if (!hasAccessibleName(link)) {

                detectedIssues.add(
                        new Issue(
                                "empty-link",
                                "moderate",
                                "a"
                        )
                );
            }
        }

        /*
         * =========================================================
         * 4. MISSING PAGE TITLE
         * =========================================================
         */

        String title = doc.title();

        if (title == null || title.trim().isEmpty()) {

            detectedIssues.add(
                    new Issue(
                            "missing-page-title",
                            "minor",
                            "title"
                    )
            );
        }

        /*
         * =========================================================
         * COUNT SEVERITIES
         * =========================================================
         */

        int critical = 0;
        int serious = 0;
        int moderate = 0;
        int minor = 0;

        for (Issue issue : detectedIssues) {

            switch (issue.getSeverity()) {

                case "critical":
                    critical++;
                    break;

                case "serious":
                    serious++;
                    break;

                case "moderate":
                    moderate++;
                    break;

                case "minor":
                    minor++;
                    break;

                default:
                    break;
            }
        }

        /*
         * =========================================================
         * SAVE SCAN RESULT
         * =========================================================
         */

        result.setTotalIssues(detectedIssues.size());

        result.setCriticalCount(critical);

        result.setSeriousCount(serious);

        result.setModerateCount(moderate);

        result.setMinorCount(minor);

        result.setRawResultJson(
                "{\"note\":\"see issues table for details\"}"
        );

        ScanResult savedResult = repository.save(result);

        /*
         * =========================================================
         * SAVE ISSUES
         * =========================================================
         */

        for (Issue issue : detectedIssues) {

            issue.setScanResult(savedResult);

            issueRepository.save(issue);
        }

        /*
         * =========================================================
         * AUDIT LOG
         * =========================================================
         */

        auditLogRepository.save(
                new AuditLog(
                        "scan",
                        savedResult.getId(),
                        "SCAN_COMPLETED",
                        "system",
                        "url=" + url
                                + ", issuesFound="
                                + detectedIssues.size()
                )
        );

        return savedResult;
    }

    /**
     * Checks whether a link has an accessible name.
     *
     * A link can get its accessible name from:
     * 1. Visible text
     * 2. aria-label
     * 3. aria-labelledby
     * 4. title
     * 5. Image alt text
     */
    private boolean hasAccessibleName(Element link) {

        /*
         * 1. Visible/text content
         */
        if (!link.text().trim().isEmpty()) {
            return true;
        }

        /*
         * 2. aria-label
         */
        if (!link.attr("aria-label").trim().isEmpty()) {
            return true;
        }

        /*
         * 3. aria-labelledby
         */
        String labelledBy =
                link.attr("aria-labelledby").trim();

        if (!labelledBy.isEmpty()) {

            for (String id : labelledBy.split("\\s+")) {

                Element labelElement =
                        link.ownerDocument().getElementById(id);

                if (labelElement != null
                        && !labelElement.text().trim().isEmpty()) {

                    return true;
                }
            }
        }

        /*
         * 4. title
         */
        if (!link.attr("title").trim().isEmpty()) {
            return true;
        }

        /*
         * 5. Image alt text inside the link
         *
         * Example:
         *
         * <a href="/home">
         *     <img src="home.png" alt="Home">
         * </a>
         *
         * This is NOT an empty link.
         */
        for (Element img : link.select("img")) {

            if (!img.attr("alt").trim().isEmpty()) {
                return true;
            }
        }

        /*
         * No accessible name found.
         */
        return false;
    }

    /**
     * Get all scans.
     */
    public List<ScanResult> getAllScans() {

        return repository.findAll();
    }

    /**
     * Get issues for a particular scan.
     */
    public List<Issue> getIssuesForScan(Long scanId) {

        return issueRepository.findByScanResultId(scanId);
    }

    /**
     * Update an issue.
     */
    public Issue updateIssue(
            Long issueId,
            String status,
            String assignedTo,
            String evidenceNote
    ) {

        Issue issue =
                issueRepository.findById(issueId)
                        .orElseThrow();

        if (status != null) {
            issue.setStatus(status);
        }

        if (assignedTo != null) {
            issue.setAssignedTo(assignedTo);
        }

        if (evidenceNote != null) {
            issue.setEvidenceNote(evidenceNote);
        }

        Issue saved =
                issueRepository.save(issue);

        auditLogRepository.save(
                new AuditLog(
                        "issue",
                        issueId,
                        "MANUAL_UPDATE",
                        "user",
                        "status=" + status
                                + ", assignedTo=" + assignedTo
                )
        );

        return saved;
    }

    /**
     * Re-scan a previously detected issue.
     */
    public Issue rescanIssue(Long issueId) {

        Issue issue =
                issueRepository.findById(issueId)
                        .orElseThrow();

        String url =
                issue.getScanResult().getUrl();

        boolean stillPresent;

        try {

            Document doc =
                    fetchDocument(url);

            switch (issue.getType()) {

                /*
                 * =================================================
                 * MISSING ALT TEXT
                 * =================================================
                 */

                case "missing-alt-text":

                    stillPresent =
                            doc.select("img")
                                    .stream()
                                    .anyMatch(img ->
                                            img.attr("alt") == null
                                                    || img.attr("alt")
                                                    .trim()
                                                    .isEmpty()
                                    );

                    break;

                /*
                 * =================================================
                 * MISSING FORM LABEL
                 * =================================================
                 */

                case "missing-form-label":

                    stillPresent =
                            doc.select("input")
                                    .stream()
                                    .anyMatch(input -> {

                                        String ariaLabel =
                                                input.attr("aria-label");

                                        String ariaLabelledBy =
                                                input.attr(
                                                        "aria-labelledby"
                                                );

                                        String id =
                                                input.attr("id");

                                        boolean hasLabel =
                                                id != null
                                                        && !id.isEmpty()
                                                        && !doc.select(
                                                        "label[for="
                                                                + id
                                                                + "]"
                                                ).isEmpty();

                                        boolean hasAriaLabel =
                                                ariaLabel != null
                                                        && !ariaLabel
                                                        .trim()
                                                        .isEmpty();

                                        boolean hasAriaLabelledBy =
                                                ariaLabelledBy != null
                                                        && !ariaLabelledBy
                                                        .trim()
                                                        .isEmpty();

                                        return !hasLabel
                                                && !hasAriaLabel
                                                && !hasAriaLabelledBy;
                                    });

                    break;

                /*
                 * =================================================
                 * EMPTY LINK
                 * =================================================
                 */

                case "empty-link":

                    stillPresent =
                            doc.select("a")
                                    .stream()
                                    .anyMatch(
                                            link ->
                                                    !hasAccessibleName(link)
                                    );

                    break;

                /*
                 * =================================================
                 * MISSING PAGE TITLE
                 * =================================================
                 */

                case "missing-page-title":

                    String title =
                            doc.title();

                    stillPresent =
                            title == null
                                    || title.trim().isEmpty();

                    break;

                default:

                    stillPresent = false;
            }

        } catch (Exception e) {

            throw new ScanFailedException(
                    "Re-scan failed for " + url + ": "
                            + e.getClass().getSimpleName()
                            + (e.getMessage() != null
                            ? " - " + e.getMessage()
                            : ""),
                    e
            );
        }

        /*
         * =========================================================
         * UPDATE ISSUE STATUS
         * =========================================================
         */

        issue.setStatus(
                stillPresent
                        ? "Open"
                        : "Resolved"
        );

        issue.setEvidenceNote(
                (
                        stillPresent
                                ? "Re-scanned: issue still present"
                                : "Re-scanned: issue no longer detected"
                )
                        + " at "
                        + java.time.LocalDateTime.now()
        );

        Issue saved =
                issueRepository.save(issue);

        /*
         * =========================================================
         * AUDIT LOG
         * =========================================================
         */

        auditLogRepository.save(
                new AuditLog(
                        "issue",
                        issue.getId(),
                        "RESCANNED",
                        "system",
                        "result="
                                + (
                                stillPresent
                                        ? "STILL_OPEN"
                                        : "VERIFIED_FIXED"
                        )
                )
        );

        return saved;
    }

    /**
     * Get audit logs.
     */
    public List<AuditLog> getAuditLog() {

        return auditLogRepository
                .findAllByOrderByTimestampDesc();
    }

    /**
     * Scanner failure exception.
     */
    public static class ScanFailedException
            extends RuntimeException {

        public ScanFailedException(
                String message,
                Throwable cause
        ) {

            super(message, cause);
        }
    }
}