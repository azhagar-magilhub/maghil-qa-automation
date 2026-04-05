import { Injectable, Logger } from '@nestjs/common';
import { FirebaseAdminService } from '../../config/firebase-admin.config';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

interface AccessibilityFinding {
  rule: string;
  severity: 'CRITICAL' | 'SERIOUS' | 'MODERATE' | 'MINOR';
  element?: string;
  message: string;
  wcagCriteria?: string;
  suggestion: string;
}

interface ScanResult {
  targetUrl: string;
  scannedAt: string;
  totalFindings: number;
  bySeverity: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
  findings: AccessibilityFinding[];
  score: number;
}

interface ContrastResult {
  foreground: string;
  background: string;
  contrastRatio: number;
  wcagAA: {
    normalText: boolean;
    largeText: boolean;
  };
  wcagAAA: {
    normalText: boolean;
    largeText: boolean;
  };
}

@Injectable()
export class AccessibilityService {
  private readonly logger = new Logger(AccessibilityService.name);

  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  private get db() {
    return this.firebaseAdmin.firestore();
  }

  async scan(userId: string, targetUrl: string): Promise<ScanResult> {
    this.logger.log(`Scanning accessibility for ${targetUrl}`);

    let html: string;
    try {
      html = await this.fetchPage(targetUrl);
    } catch (err) {
      throw new Error(`Failed to fetch page: ${err.message}`);
    }

    const findings: AccessibilityFinding[] = [];

    // Run all checks
    findings.push(...this.checkImgAltAttributes(html));
    findings.push(...this.checkFormLabels(html));
    findings.push(...this.checkHeadingHierarchy(html));
    findings.push(...this.checkAriaRoles(html));
    findings.push(...this.checkLangAttribute(html));
    findings.push(...this.checkLinkText(html));
    findings.push(...this.checkColorContrastStub(html));
    findings.push(...this.checkMetaViewport(html));
    findings.push(...this.checkTabIndex(html));

    const bySeverity = {
      critical: findings.filter((f) => f.severity === 'CRITICAL').length,
      serious: findings.filter((f) => f.severity === 'SERIOUS').length,
      moderate: findings.filter((f) => f.severity === 'MODERATE').length,
      minor: findings.filter((f) => f.severity === 'MINOR').length,
    };

    const deductions =
      bySeverity.critical * 20 +
      bySeverity.serious * 10 +
      bySeverity.moderate * 5 +
      bySeverity.minor * 2;
    const score = Math.max(0, 100 - deductions);

    const result: ScanResult = {
      targetUrl,
      scannedAt: new Date().toISOString(),
      totalFindings: findings.length,
      bySeverity,
      findings,
      score,
    };

    // Store scan result
    const docRef = this.db.collection(`users/${userId}/accessibilityScans`).doc();
    await docRef.set(result);

    return result;
  }

  checkContrast(foreground: string, background: string): ContrastResult {
    const fgLum = this.relativeLuminance(this.parseColor(foreground));
    const bgLum = this.relativeLuminance(this.parseColor(background));

    const lighter = Math.max(fgLum, bgLum);
    const darker = Math.min(fgLum, bgLum);
    const contrastRatio = Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;

    return {
      foreground,
      background,
      contrastRatio,
      wcagAA: {
        normalText: contrastRatio >= 4.5,
        largeText: contrastRatio >= 3,
      },
      wcagAAA: {
        normalText: contrastRatio >= 7,
        largeText: contrastRatio >= 4.5,
      },
    };
  }

  // ---------- Accessibility checks ----------

  private checkImgAltAttributes(html: string): AccessibilityFinding[] {
    const findings: AccessibilityFinding[] = [];
    const imgRegex = /<img\b[^>]*>/gi;
    let match: RegExpExecArray | null;

    while ((match = imgRegex.exec(html)) !== null) {
      const tag = match[0];
      const hasAlt = /\balt\s*=/i.test(tag);
      const hasEmptyAlt = /\balt\s*=\s*["']\s*["']/i.test(tag);
      const isDecorative = /\brole\s*=\s*["']presentation["']/i.test(tag);

      if (!hasAlt && !isDecorative) {
        const src = this.extractAttr(tag, 'src') || 'unknown';
        findings.push({
          rule: 'img-alt',
          severity: 'CRITICAL',
          element: tag.slice(0, 120),
          message: `Image missing alt attribute: ${src.slice(0, 80)}`,
          wcagCriteria: '1.1.1 Non-text Content',
          suggestion: 'Add an alt attribute describing the image content, or role="presentation" for decorative images.',
        });
      } else if (hasEmptyAlt && !isDecorative) {
        findings.push({
          rule: 'img-alt-empty',
          severity: 'MINOR',
          element: tag.slice(0, 120),
          message: 'Image has empty alt attribute but is not marked as decorative.',
          wcagCriteria: '1.1.1 Non-text Content',
          suggestion: 'If decorative, add role="presentation". Otherwise, provide meaningful alt text.',
        });
      }
    }

    return findings;
  }

  private checkFormLabels(html: string): AccessibilityFinding[] {
    const findings: AccessibilityFinding[] = [];
    const inputRegex = /<input\b[^>]*>/gi;
    let match: RegExpExecArray | null;

    while ((match = inputRegex.exec(html)) !== null) {
      const tag = match[0];
      const type = this.extractAttr(tag, 'type') || 'text';

      // Skip hidden, submit, button, reset, image types
      if (['hidden', 'submit', 'button', 'reset', 'image'].includes(type.toLowerCase())) {
        continue;
      }

      const hasAriaLabel = /\baria-label\s*=/i.test(tag);
      const hasAriaLabelledby = /\baria-labelledby\s*=/i.test(tag);
      const hasTitle = /\btitle\s*=/i.test(tag);
      const id = this.extractAttr(tag, 'id');

      // Check if there's a corresponding label
      const hasAssociatedLabel = id
        ? new RegExp(`<label[^>]*\\bfor\\s*=\\s*["']${this.escapeRegex(id)}["']`, 'i').test(html)
        : false;

      if (!hasAriaLabel && !hasAriaLabelledby && !hasAssociatedLabel && !hasTitle) {
        findings.push({
          rule: 'form-label',
          severity: 'SERIOUS',
          element: tag.slice(0, 120),
          message: `Form input (type="${type}") has no associated label.`,
          wcagCriteria: '1.3.1 Info and Relationships',
          suggestion: 'Add a <label for="..."> element, aria-label, or aria-labelledby attribute.',
        });
      }
    }

    // Check textareas and selects similarly
    const otherInputs = /<(textarea|select)\b[^>]*>/gi;
    while ((match = otherInputs.exec(html)) !== null) {
      const tag = match[0];
      const hasAriaLabel = /\baria-label\s*=/i.test(tag);
      const hasAriaLabelledby = /\baria-labelledby\s*=/i.test(tag);
      const id = this.extractAttr(tag, 'id');
      const hasAssociatedLabel = id
        ? new RegExp(`<label[^>]*\\bfor\\s*=\\s*["']${this.escapeRegex(id)}["']`, 'i').test(html)
        : false;

      if (!hasAriaLabel && !hasAriaLabelledby && !hasAssociatedLabel) {
        findings.push({
          rule: 'form-label',
          severity: 'SERIOUS',
          element: tag.slice(0, 120),
          message: `${match[1]} element has no associated label.`,
          wcagCriteria: '1.3.1 Info and Relationships',
          suggestion: 'Add a <label for="..."> element or aria-label attribute.',
        });
      }
    }

    return findings;
  }

  private checkHeadingHierarchy(html: string): AccessibilityFinding[] {
    const findings: AccessibilityFinding[] = [];
    const headingRegex = /<h([1-6])\b[^>]*>/gi;
    let match: RegExpExecArray | null;
    let lastLevel = 0;
    const headingLevels: number[] = [];

    while ((match = headingRegex.exec(html)) !== null) {
      const level = parseInt(match[1], 10);
      headingLevels.push(level);

      if (lastLevel > 0 && level > lastLevel + 1) {
        findings.push({
          rule: 'heading-order',
          severity: 'MODERATE',
          message: `Heading level skipped: h${lastLevel} followed by h${level}.`,
          wcagCriteria: '1.3.1 Info and Relationships',
          suggestion: `Use sequential heading levels. After h${lastLevel}, use h${lastLevel + 1}.`,
        });
      }

      lastLevel = level;
    }

    // Check if page starts with h1
    if (headingLevels.length > 0 && headingLevels[0] !== 1) {
      findings.push({
        rule: 'heading-first',
        severity: 'MODERATE',
        message: `Page does not start with an h1 heading (first heading is h${headingLevels[0]}).`,
        wcagCriteria: '1.3.1 Info and Relationships',
        suggestion: 'Ensure the page has an h1 as the first heading.',
      });
    }

    // Check for multiple h1s
    const h1Count = headingLevels.filter((l) => l === 1).length;
    if (h1Count > 1) {
      findings.push({
        rule: 'heading-multiple-h1',
        severity: 'MINOR',
        message: `Page has ${h1Count} h1 headings. Best practice is to have only one.`,
        wcagCriteria: '1.3.1 Info and Relationships',
        suggestion: 'Use only one h1 per page for the main title.',
      });
    }

    return findings;
  }

  private checkAriaRoles(html: string): AccessibilityFinding[] {
    const findings: AccessibilityFinding[] = [];

    // Check for landmark roles
    const hasMain = /<main\b/i.test(html) || /role\s*=\s*["']main["']/i.test(html);
    const hasNav = /<nav\b/i.test(html) || /role\s*=\s*["']navigation["']/i.test(html);
    const hasBanner = /<header\b/i.test(html) || /role\s*=\s*["']banner["']/i.test(html);

    if (!hasMain) {
      findings.push({
        rule: 'landmark-main',
        severity: 'MODERATE',
        message: 'Page is missing a main landmark region.',
        wcagCriteria: '1.3.1 Info and Relationships',
        suggestion: 'Add a <main> element or role="main" to identify the main content.',
      });
    }

    if (!hasNav) {
      findings.push({
        rule: 'landmark-nav',
        severity: 'MINOR',
        message: 'Page is missing a navigation landmark.',
        wcagCriteria: '1.3.1 Info and Relationships',
        suggestion: 'Add a <nav> element or role="navigation" to identify navigation sections.',
      });
    }

    // Check for invalid ARIA roles
    const validRoles = new Set([
      'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
      'cell', 'checkbox', 'columnheader', 'combobox', 'complementary',
      'contentinfo', 'definition', 'dialog', 'directory', 'document', 'feed',
      'figure', 'form', 'grid', 'gridcell', 'group', 'heading', 'img',
      'link', 'list', 'listbox', 'listitem', 'log', 'main', 'marquee',
      'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox',
      'menuitemradio', 'navigation', 'none', 'note', 'option', 'presentation',
      'progressbar', 'radio', 'radiogroup', 'region', 'row', 'rowgroup',
      'rowheader', 'scrollbar', 'search', 'searchbox', 'separator', 'slider',
      'spinbutton', 'status', 'switch', 'tab', 'table', 'tablist', 'tabpanel',
      'term', 'textbox', 'timer', 'toolbar', 'tooltip', 'tree', 'treegrid',
      'treeitem',
    ]);

    const roleRegex = /role\s*=\s*["']([^"']+)["']/gi;
    let match: RegExpExecArray | null;

    while ((match = roleRegex.exec(html)) !== null) {
      const role = match[1].trim().toLowerCase();
      if (!validRoles.has(role)) {
        findings.push({
          rule: 'aria-role-valid',
          severity: 'SERIOUS',
          message: `Invalid ARIA role: "${role}".`,
          wcagCriteria: '4.1.2 Name, Role, Value',
          suggestion: `Use a valid WAI-ARIA role. "${role}" is not a recognized role.`,
        });
      }
    }

    return findings;
  }

  private checkLangAttribute(html: string): AccessibilityFinding[] {
    const findings: AccessibilityFinding[] = [];

    const hasHtmlLang = /<html\b[^>]*\blang\s*=\s*["'][^"']+["']/i.test(html);

    if (!hasHtmlLang) {
      findings.push({
        rule: 'html-lang',
        severity: 'SERIOUS',
        message: 'Page is missing a lang attribute on the <html> element.',
        wcagCriteria: '3.1.1 Language of Page',
        suggestion: 'Add a lang attribute to the <html> element (e.g., <html lang="en">).',
      });
    }

    return findings;
  }

  private checkLinkText(html: string): AccessibilityFinding[] {
    const findings: AccessibilityFinding[] = [];
    const linkRegex = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(html)) !== null) {
      const tag = match[0];
      const content = match[1].replace(/<[^>]*>/g, '').trim();
      const hasAriaLabel = /\baria-label\s*=/i.test(tag);

      if (!content && !hasAriaLabel) {
        // Check if it contains an image with alt
        const hasImgAlt = /<img\b[^>]*\balt\s*=\s*["'][^"']+["']/i.test(match[1]);
        if (!hasImgAlt) {
          findings.push({
            rule: 'link-text',
            severity: 'SERIOUS',
            element: tag.slice(0, 120),
            message: 'Link has no discernible text.',
            wcagCriteria: '2.4.4 Link Purpose',
            suggestion: 'Add text content, aria-label, or an image with alt text inside the link.',
          });
        }
      }

      const genericTexts = ['click here', 'here', 'read more', 'more', 'link'];
      if (content && genericTexts.includes(content.toLowerCase())) {
        findings.push({
          rule: 'link-text-generic',
          severity: 'MINOR',
          element: tag.slice(0, 120),
          message: `Link has generic text: "${content}".`,
          wcagCriteria: '2.4.4 Link Purpose',
          suggestion: 'Use descriptive link text that explains where the link goes.',
        });
      }
    }

    return findings;
  }

  private checkColorContrastStub(html: string): AccessibilityFinding[] {
    // Stub: Real contrast checking requires rendering the page
    const findings: AccessibilityFinding[] = [];

    // Check for inline styles with potentially low contrast
    const styleRegex = /style\s*=\s*["'][^"']*color\s*:\s*([^;"']+)/gi;
    let match: RegExpExecArray | null;
    let inlineColorCount = 0;

    while ((match = styleRegex.exec(html)) !== null) {
      inlineColorCount++;
    }

    if (inlineColorCount > 0) {
      findings.push({
        rule: 'color-contrast-review',
        severity: 'MINOR',
        message: `Found ${inlineColorCount} inline color style(s). Manual contrast review recommended.`,
        wcagCriteria: '1.4.3 Contrast (Minimum)',
        suggestion: 'Use the /accessibility/contrast endpoint to verify color contrast ratios meet WCAG AA (4.5:1 for normal text).',
      });
    }

    return findings;
  }

  private checkMetaViewport(html: string): AccessibilityFinding[] {
    const findings: AccessibilityFinding[] = [];

    const viewportMatch = /<meta\b[^>]*name\s*=\s*["']viewport["'][^>]*>/i.exec(html);

    if (viewportMatch) {
      const content = this.extractAttr(viewportMatch[0], 'content') || '';
      if (/maximum-scale\s*=\s*1/i.test(content) || /user-scalable\s*=\s*no/i.test(content)) {
        findings.push({
          rule: 'meta-viewport-zoom',
          severity: 'SERIOUS',
          element: viewportMatch[0].slice(0, 120),
          message: 'Viewport meta tag disables user zooming.',
          wcagCriteria: '1.4.4 Resize text',
          suggestion: 'Remove maximum-scale=1 and user-scalable=no to allow zooming.',
        });
      }
    }

    return findings;
  }

  private checkTabIndex(html: string): AccessibilityFinding[] {
    const findings: AccessibilityFinding[] = [];
    const tabindexRegex = /tabindex\s*=\s*["'](-?\d+)["']/gi;
    let match: RegExpExecArray | null;
    let positiveTabindexCount = 0;

    while ((match = tabindexRegex.exec(html)) !== null) {
      const value = parseInt(match[1], 10);
      if (value > 0) {
        positiveTabindexCount++;
      }
    }

    if (positiveTabindexCount > 0) {
      findings.push({
        rule: 'tabindex-positive',
        severity: 'MODERATE',
        message: `Found ${positiveTabindexCount} element(s) with positive tabindex values.`,
        wcagCriteria: '2.4.3 Focus Order',
        suggestion: 'Avoid positive tabindex values. Use 0 or -1 instead, and rely on DOM order.',
      });
    }

    return findings;
  }

  // ---------- Color utilities ----------

  private parseColor(color: string): { r: number; g: number; b: number } {
    // Handle hex colors
    let hex = color.replace(/^#/, '');
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (/^[0-9a-fA-F]{6}$/.test(hex)) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }

    // Handle rgb/rgba
    const rgbMatch = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(color);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1], 10),
        g: parseInt(rgbMatch[2], 10),
        b: parseInt(rgbMatch[3], 10),
      };
    }

    // Named colors (common subset)
    const namedColors: Record<string, { r: number; g: number; b: number }> = {
      black: { r: 0, g: 0, b: 0 },
      white: { r: 255, g: 255, b: 255 },
      red: { r: 255, g: 0, b: 0 },
      green: { r: 0, g: 128, b: 0 },
      blue: { r: 0, g: 0, b: 255 },
      yellow: { r: 255, g: 255, b: 0 },
      gray: { r: 128, g: 128, b: 128 },
      grey: { r: 128, g: 128, b: 128 },
    };

    return namedColors[color.toLowerCase()] || { r: 0, g: 0, b: 0 };
  }

  private relativeLuminance(color: { r: number; g: number; b: number }): number {
    const sRGB = [color.r / 255, color.g / 255, color.b / 255];
    const linear = sRGB.map((c) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
    );
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  }

  // ---------- Utility helpers ----------

  private extractAttr(tag: string, attr: string): string | null {
    const regex = new RegExp(`\\b${attr}\\s*=\\s*["']([^"']*)["']`, 'i');
    const match = regex.exec(tag);
    return match ? match[1] : null;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ---------- HTTP helper ----------

  private fetchPage(targetUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = new URL(targetUrl);
      const isHttps = url.protocol === 'https:';
      const transport = isHttps ? https : http;

      const req = transport.get(
        {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname + url.search,
          headers: {
            'User-Agent': 'QA-Automation-Accessibility-Scanner/1.0',
            Accept: 'text/html',
          },
          timeout: 15000,
        },
        (res) => {
          // Follow redirects
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            this.fetchPage(res.headers.location).then(resolve).catch(reject);
            return;
          }

          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve(data));
        },
      );

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });
    });
  }
}
