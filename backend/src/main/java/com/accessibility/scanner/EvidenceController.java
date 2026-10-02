package com.accessibility.scanner;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/scans/issues")
@CrossOrigin(origins = "*")
public class EvidenceController {

    @Autowired
    private EvidenceService evidenceService;

    @GetMapping("/{issueId}/evidence")
    public List<Evidence> getEvidence(@PathVariable Long issueId) {
        return evidenceService.getForIssue(issueId);
    }

    @PostMapping(value = "/{issueId}/evidence", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Evidence uploadEvidence(
            @PathVariable Long issueId,
            @RequestParam("type") String type,
            @RequestPart("file") MultipartFile file) throws Exception {
        return evidenceService.upload(issueId, type, file);
    }

    @GetMapping("/evidence/{evidenceId}/file")
    public ResponseEntity<ByteArrayResource> getEvidenceFile(@PathVariable Long evidenceId) {
        Evidence evidence = evidenceService.getFile(evidenceId);
        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(evidence.getContentType());
        } catch (Exception ignored) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        ByteArrayResource resource = new ByteArrayResource(evidence.getFileData());
        return ResponseEntity.ok()
                .contentType(mediaType)
                .contentLength(evidence.getFileSize())
                .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic())
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(evidence.getFileName()).build().toString())
                .body(resource);
    }

    @DeleteMapping("/evidence/{evidenceId}")
    public Map<String, Object> deleteEvidence(@PathVariable Long evidenceId) {
        evidenceService.delete(evidenceId);
        return Map.of("success", true, "deletedId", evidenceId);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
    }
}