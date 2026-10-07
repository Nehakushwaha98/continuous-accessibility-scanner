package com.accessibility.scanner;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class ScanServiceTest {

    @InjectMocks
    private ScanService scanService;

    @Mock
    private ScanResultRepository scanResultRepository;

    @Mock
    private IssueRepository issueRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    private Method hasAccessibleNameMethod;

    @BeforeEach
    void setUp() throws Exception {
        hasAccessibleNameMethod =
                ScanService.class.getDeclaredMethod(
                        "hasAccessibleName",
                        Element.class
                );

        hasAccessibleNameMethod.setAccessible(true);
    }

    @Test
    void linkWithVisibleTextShouldBeAccessible() throws Exception {
        Document document = Jsoup.parse(
                "<a href='https://example.com'>Visit Website</a>"
        );

        Element link = document.selectFirst("a");

        boolean result =
                (boolean) hasAccessibleNameMethod.invoke(scanService, link);

        assertTrue(result);
    }

    @Test
    void linkWithAriaLabelShouldBeAccessible() throws Exception {
        Document document = Jsoup.parse(
                "<a href='https://example.com' aria-label='Visit Website'></a>"
        );

        Element link = document.selectFirst("a");

        boolean result =
                (boolean) hasAccessibleNameMethod.invoke(scanService, link);

        assertTrue(result);
    }

    @Test
    void linkWithTitleShouldBeAccessible() throws Exception {
        Document document = Jsoup.parse(
                "<a href='https://example.com' title='Visit Website'></a>"
        );

        Element link = document.selectFirst("a");

        boolean result =
                (boolean) hasAccessibleNameMethod.invoke(scanService, link);

        assertTrue(result);
    }

    @Test
    void linkWithImageAltShouldBeAccessible() throws Exception {
        Document document = Jsoup.parse(
                "<a href='https://example.com'>" +
                        "<img src='image.jpg' alt='Website Logo'>" +
                        "</a>"
        );

        Element link = document.selectFirst("a");

        boolean result =
                (boolean) hasAccessibleNameMethod.invoke(scanService, link);

        assertTrue(result);
    }

    @Test
    void emptyLinkWithoutAccessibleNameShouldNotBeAccessible() throws Exception {
        Document document = Jsoup.parse(
                "<a href='https://example.com'></a>"
        );

        Element link = document.selectFirst("a");

        boolean result =
                (boolean) hasAccessibleNameMethod.invoke(scanService, link);

        assertFalse(result);
    }

    @Test
    void whitespaceOnlyLinkShouldNotBeAccessible() throws Exception {
        Document document = Jsoup.parse(
                "<a href='https://example.com'>   </a>"
        );

        Element link = document.selectFirst("a");

        boolean result =
                (boolean) hasAccessibleNameMethod.invoke(scanService, link);

        assertFalse(result);
    }
}