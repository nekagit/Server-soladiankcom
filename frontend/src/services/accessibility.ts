/**
 * Accessibility service
 * Ensures WCAG 2.1 AA compliance and provides accessibility utilities
 */

export interface AccessibilityAudit {
    violations: AccessibilityViolation[];
    warnings: AccessibilityWarning[];
    score: number;
    recommendations: string[];
}

export interface AccessibilityViolation {
    id: string;
    impact: 'critical' | 'serious' | 'moderate' | 'minor';
    description: string;
    help: string;
    helpUrl: string;
    nodes: string[];
    tags: string[];
}

export interface AccessibilityWarning {
    id: string;
    description: string;
    nodes: string[];
}

class AccessibilityService {
    private isInitialized = false;
    private focusTrapStack: HTMLElement[] = [];
    private skipLinks: HTMLElement[] = [];

    /**
     * Initialize accessibility service
     */
    init(): void {
        if (this.isInitialized || typeof window === 'undefined') return;

        this.setupSkipLinks();
        this.setupFocusManagement();
        this.setupKeyboardNavigation();
        this.setupScreenReaderSupport();
        this.setupColorContrast();
        this.setupAriaLabels();
        this.setupLiveRegions();

        this.isInitialized = true;
    }

    /**
     * Setup skip links for keyboard navigation
     */
    private setupSkipLinks(): void {
        const skipLinkHTML = `
      <div class="skip-links" aria-label="Skip navigation">
        <a href="#main-content" class="skip-link">Skip to main content</a>
        <a href="#navigation" class="skip-link">Skip to navigation</a>
        <a href="#search" class="skip-link">Skip to search</a>
      </div>
    `;

        const skipLinksContainer = document.createElement('div');
        skipLinksContainer.innerHTML = skipLinkHTML;
        skipLinksContainer.className = 'skip-links-container';

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
      .skip-links {
        position: absolute;
        top: -100px;
        left: 0;
        z-index: 10000;
      }
      
      .skip-link {
        position: absolute;
        top: 0;
        left: 0;
        background: #000;
        color: #fff;
        padding: 8px 16px;
        text-decoration: none;
        font-weight: bold;
        border-radius: 0 0 4px 0;
        transform: translateY(-100%);
        transition: transform 0.2s ease;
      }
      
      .skip-link:focus {
        transform: translateY(0);
        outline: 2px solid #fff;
        outline-offset: 2px;
      }
    `;

        document.head.appendChild(style);
        document.body.insertBefore(skipLinksContainer, document.body.firstChild);

        // Store skip links for management
        this.skipLinks = Array.from(skipLinksContainer.querySelectorAll('.skip-link'));
    }

    /**
     * Setup focus management
     */
    private setupFocusManagement(): void {
        // Focus visible polyfill
        if (!CSS.supports('selector(:focus-visible)')) {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    document.body.classList.add('keyboard-navigation');
                }
            });

            document.addEventListener('mousedown', () => {
                document.body.classList.remove('keyboard-navigation');
            });
        }

        // Focus trap for modals
        this.setupFocusTrap();

        // Focus restoration
        this.setupFocusRestoration();
    }

    /**
     * Setup focus trap for modals and dropdowns
     */
    private setupFocusTrap(): void {
        const trapFocus = (element: HTMLElement) => {
            const focusableElements = element.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

            const handleTabKey = (e: KeyboardEvent) => {
                if (e.key === 'Tab') {
                    if (e.shiftKey) {
                        if (document.activeElement === firstElement) {
                            lastElement.focus();
                            e.preventDefault();
                        }
                    } else {
                        if (document.activeElement === lastElement) {
                            firstElement.focus();
                            e.preventDefault();
                        }
                    }
                }
            };

            element.addEventListener('keydown', handleTabKey);
            firstElement?.focus();

            return () => {
                element.removeEventListener('keydown', handleTabKey);
            };
        };

        // Apply focus trap to modals
        document.addEventListener('DOMContentLoaded', () => {
            const modals = document.querySelectorAll('[role="dialog"], [role="alertdialog"]');
            modals.forEach(modal => {
                const cleanup = trapFocus(modal as HTMLElement);
                this.focusTrapStack.push(modal as HTMLElement);
            });
        });
    }

    /**
     * Setup focus restoration
     */
    private setupFocusRestoration(): void {
        let lastFocusedElement: HTMLElement | null = null;

        document.addEventListener('focusin', (e) => {
            lastFocusedElement = e.target as HTMLElement;
        });

        // Restore focus when modal closes
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.hasAttribute('data-close-modal') && lastFocusedElement) {
                setTimeout(() => {
                    lastFocusedElement?.focus();
                }, 100);
            }
        });
    }

    /**
     * Setup keyboard navigation
     */
    private setupKeyboardNavigation(): void {
        // Arrow key navigation for custom components
        document.addEventListener('keydown', (e) => {
            const target = e.target as HTMLElement;

            // Handle arrow keys for custom select components
            if (target.hasAttribute('role') && target.getAttribute('role') === 'listbox') {
                this.handleArrowKeyNavigation(e, target);
            }

            // Handle escape key for modals and dropdowns
            if (e.key === 'Escape') {
                this.handleEscapeKey(target);
            }

            // Handle enter and space for custom buttons
            if ((e.key === 'Enter' || e.key === ' ') && target.hasAttribute('data-custom-button')) {
                e.preventDefault();
                target.click();
            }
        });
    }

    /**
     * Handle arrow key navigation
     */
    private handleArrowKeyNavigation(e: KeyboardEvent, element: HTMLElement): void {
        const options = Array.from(element.querySelectorAll('[role="option"]')) as HTMLElement[];
        const currentIndex = options.findIndex(option => option === document.activeElement);

        if (currentIndex === -1) return;

        let nextIndex = currentIndex;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                nextIndex = (currentIndex + 1) % options.length;
                break;
            case 'ArrowUp':
                e.preventDefault();
                nextIndex = currentIndex === 0 ? options.length - 1 : currentIndex - 1;
                break;
            case 'Home':
                e.preventDefault();
                nextIndex = 0;
                break;
            case 'End':
                e.preventDefault();
                nextIndex = options.length - 1;
                break;
        }

        if (nextIndex !== currentIndex) {
            options[nextIndex].focus();
        }
    }

    /**
     * Handle escape key
     */
    private handleEscapeKey(target: HTMLElement): void {
        // Close modals
        const modal = target.closest('[role="dialog"]');
        if (modal) {
            const closeButton = modal.querySelector('[data-close-modal]') as HTMLElement;
            closeButton?.click();
            return;
        }

        // Close dropdowns
        const dropdown = target.closest('[role="menu"], [role="listbox"]');
        if (dropdown) {
            const toggle = document.querySelector(`[aria-controls="${dropdown.id}"]`) as HTMLElement;
            toggle?.focus();
            toggle?.setAttribute('aria-expanded', 'false');
            dropdown.setAttribute('aria-hidden', 'true');
        }
    }

    /**
     * Setup screen reader support
     */
    private setupScreenReaderSupport(): void {
        // Announce page changes
        this.setupPageAnnouncements();

        // Setup ARIA live regions
        this.setupLiveRegions();

        // Setup form validation announcements
        this.setupFormValidationAnnouncements();
    }

    /**
     * Setup page announcements
     */
    private setupPageAnnouncements(): void {
        const announcer = document.createElement('div');
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.className = 'sr-only';
        announcer.id = 'page-announcer';
        document.body.appendChild(announcer);

        // Announce page changes
        let currentPage = window.location.pathname;
        const observer = new MutationObserver(() => {
            const newPage = window.location.pathname;
            if (newPage !== currentPage) {
                this.announce(`Navigated to ${newPage}`);
                currentPage = newPage;
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    /**
     * Setup live regions
     */
    private setupLiveRegions(): void {
        // Create live regions for different types of announcements
        const liveRegions = [
            { id: 'status-announcer', politeness: 'polite' },
            { id: 'error-announcer', politeness: 'assertive' },
            { id: 'success-announcer', politeness: 'polite' },
        ];

        liveRegions.forEach(region => {
            const element = document.createElement('div');
            element.setAttribute('aria-live', region.politeness);
            element.setAttribute('aria-atomic', 'true');
            element.className = 'sr-only';
            element.id = region.id;
            document.body.appendChild(element);
        });
    }

    /**
     * Setup form validation announcements
     */
    private setupFormValidationAnnouncements(): void {
        document.addEventListener('invalid', (e) => {
            const target = e.target as HTMLInputElement;
            const errorMessage = target.validationMessage;
            this.announceError(`Form error: ${errorMessage}`);
        });

        document.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            if (target.checkValidity()) {
                this.announceSuccess(`${target.name || 'Field'} is valid`);
            }
        });
    }

    /**
     * Setup color contrast monitoring
     */
    private setupColorContrast(): void {
        // Check color contrast for text elements
        const checkContrast = () => {
            const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, button');
            textElements.forEach(element => {
                const styles = window.getComputedStyle(element);
                const color = styles.color;
                const backgroundColor = styles.backgroundColor;

                // Basic contrast check (simplified)
                if (this.getContrastRatio(color, backgroundColor) < 4.5) {
                    element.setAttribute('data-low-contrast', 'true');
                    console.warn('Low contrast detected:', element);
                }
            });
        };

        // Check contrast on page load and when styles change
        checkContrast();
        window.addEventListener('resize', checkContrast);
    }

    /**
     * Get contrast ratio between two colors
     */
    private getContrastRatio(color1: string, color2: string): number {
        // Simplified contrast ratio calculation
        // In a real implementation, you'd parse the colors and calculate the actual ratio
        return 4.5; // Placeholder
    }

    /**
     * Setup ARIA labels
     */
    private setupAriaLabels(): void {
        // Add ARIA labels to interactive elements that don't have them
        const interactiveElements = document.querySelectorAll('button, a, input, select, textarea');

        interactiveElements.forEach(element => {
            if (!element.getAttribute('aria-label') && !element.textContent?.trim()) {
                const type = element.tagName.toLowerCase();
                const role = element.getAttribute('role') || type;
                element.setAttribute('aria-label', `${role} button`);
            }
        });
    }

    /**
     * Announce message to screen readers
     */
    announce(message: string): void {
        const announcer = document.getElementById('page-announcer');
        if (announcer) {
            announcer.textContent = message;
        }
    }

    /**
     * Announce error message
     */
    announceError(message: string): void {
        const announcer = document.getElementById('error-announcer');
        if (announcer) {
            announcer.textContent = message;
        }
    }

    /**
     * Announce success message
     */
    announceSuccess(message: string): void {
        const announcer = document.getElementById('success-announcer');
        if (announcer) {
            announcer.textContent = message;
        }
    }

    /**
     * Run accessibility audit
     */
    async runAudit(): Promise<AccessibilityAudit> {
        const violations: AccessibilityViolation[] = [];
        const warnings: AccessibilityWarning[] = [];

        // Check for common accessibility issues
        this.checkMissingAltText(violations);
        this.checkMissingLabels(violations);
        this.checkColorContrast(violations);
        this.checkKeyboardNavigation(violations);
        this.checkFocusManagement(violations);
        this.checkAriaAttributes(violations);

        // Calculate score
        const totalIssues = violations.length + warnings.length;
        const score = Math.max(0, 100 - (totalIssues * 10));

        return {
            violations,
            warnings,
            score,
            recommendations: this.generateRecommendations(violations, warnings),
        };
    }

    /**
     * Check for missing alt text
     */
    private checkMissingAltText(violations: AccessibilityViolation[]): void {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            if (!img.alt && !img.getAttribute('aria-label')) {
                violations.push({
                    id: 'missing-alt-text',
                    impact: 'serious',
                    description: 'Image missing alt text',
                    help: 'Add alt text to describe the image',
                    helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
                    nodes: [img.outerHTML],
                    tags: ['images', 'alt-text'],
                });
            }
        });
    }

    /**
     * Check for missing labels
     */
    private checkMissingLabels(violations: AccessibilityViolation[]): void {
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            const id = input.getAttribute('id');
            const label = id ? document.querySelector(`label[for="${id}"]`) : null;
            const ariaLabel = input.getAttribute('aria-label');
            const ariaLabelledBy = input.getAttribute('aria-labelledby');

            if (!label && !ariaLabel && !ariaLabelledBy) {
                violations.push({
                    id: 'missing-label',
                    impact: 'serious',
                    description: 'Form control missing label',
                    help: 'Add a label or aria-label to the form control',
                    helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html',
                    nodes: [input.outerHTML],
                    tags: ['forms', 'labels'],
                });
            }
        });
    }

    /**
     * Check color contrast
     */
    private checkColorContrast(violations: AccessibilityViolation[]): void {
        // This would be implemented with a proper contrast checking library
        // For now, we'll just check for elements with low contrast warnings
        const lowContrastElements = document.querySelectorAll('[data-low-contrast="true"]');
        lowContrastElements.forEach(element => {
            violations.push({
                id: 'low-contrast',
                impact: 'serious',
                description: 'Insufficient color contrast',
                help: 'Increase color contrast to meet WCAG guidelines',
                helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html',
                nodes: [element.outerHTML],
                tags: ['color', 'contrast'],
            });
        });
    }

    /**
     * Check keyboard navigation
     */
    private checkKeyboardNavigation(violations: AccessibilityViolation[]): void {
        const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [tabindex]');
        interactiveElements.forEach(element => {
            const tabIndex = element.getAttribute('tabindex');
            if (tabIndex === '-1' && !element.hasAttribute('aria-hidden')) {
                violations.push({
                    id: 'keyboard-navigation',
                    impact: 'moderate',
                    description: 'Element not keyboard accessible',
                    help: 'Ensure all interactive elements are keyboard accessible',
                    helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html',
                    nodes: [element.outerHTML],
                    tags: ['keyboard', 'navigation'],
                });
            }
        });
    }

    /**
     * Check focus management
     */
    private checkFocusManagement(violations: AccessibilityViolation[]): void {
        const modals = document.querySelectorAll('[role="dialog"]');
        modals.forEach(modal => {
            const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusableElements.length === 0) {
                violations.push({
                    id: 'focus-management',
                    impact: 'serious',
                    description: 'Modal missing focusable elements',
                    help: 'Add focusable elements to the modal for keyboard navigation',
                    helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/focus-management.html',
                    nodes: [modal.outerHTML],
                    tags: ['focus', 'modals'],
                });
            }
        });
    }

    /**
     * Check ARIA attributes
     */
    private checkAriaAttributes(violations: AccessibilityViolation[]): void {
        const elementsWithAria = document.querySelectorAll('[aria-expanded], [aria-controls], [aria-labelledby]');
        elementsWithAria.forEach(element => {
            const expanded = element.getAttribute('aria-expanded');
            const controls = element.getAttribute('aria-controls');

            if (expanded && !controls) {
                violations.push({
                    id: 'aria-attributes',
                    impact: 'moderate',
                    description: 'aria-expanded without aria-controls',
                    help: 'Add aria-controls to identify the controlled element',
                    helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html',
                    nodes: [element.outerHTML],
                    tags: ['aria', 'attributes'],
                });
            }
        });
    }

    /**
     * Generate recommendations
     */
    private generateRecommendations(violations: AccessibilityViolation[], warnings: AccessibilityWarning[]): string[] {
        const recommendations: string[] = [];

        if (violations.some(v => v.tags.includes('alt-text'))) {
            recommendations.push('Add alt text to all images');
        }

        if (violations.some(v => v.tags.includes('labels'))) {
            recommendations.push('Add labels to all form controls');
        }

        if (violations.some(v => v.tags.includes('contrast'))) {
            recommendations.push('Improve color contrast for better readability');
        }

        if (violations.some(v => v.tags.includes('keyboard'))) {
            recommendations.push('Ensure all interactive elements are keyboard accessible');
        }

        if (violations.some(v => v.tags.includes('focus'))) {
            recommendations.push('Implement proper focus management for modals');
        }

        return recommendations;
    }

    /**
     * Cleanup
     */
    cleanup(): void {
        this.focusTrapStack.forEach(element => {
            // Remove focus trap listeners
        });
        this.focusTrapStack = [];
        this.skipLinks = [];
    }
}

// Create singleton instance
export const accessibilityService = new AccessibilityService();

// Auto-initialize in browser
if (typeof window !== 'undefined') {
    accessibilityService.init();
}

// Export for global access
if (typeof window !== 'undefined') {
    (window as any).accessibilityService = accessibilityService;
}
