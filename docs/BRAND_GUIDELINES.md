# Soladia Brand Guidelines & Design System

## 🎨 Brand Identity

### Brand Overview
**Soladia** is a premium Solana-powered marketplace that combines cutting-edge blockchain technology with exceptional user experience. Our brand represents innovation, trust, and the future of digital commerce.

### Brand Values
- **Innovation**: Leading the future of blockchain commerce
- **Trust**: Secure, transparent, and reliable transactions
- **Accessibility**: Making blockchain technology accessible to everyone
- **Community**: Building a vibrant ecosystem of creators and collectors

---

## 🎨 Color System

### Primary Color Palette

#### Core Brand Colors
```css
/* Primary Colors */
--soladia-primary: #E60012;        /* Soladia Red - Energy, Action, Premium */
--soladia-secondary: #0066CC;      /* Soladia Blue - Trust, Technology, Stability */
--soladia-accent: #FFD700;         /* Soladia Gold - Success, Value, Luxury */

/* Semantic Colors */
--soladia-success: #00A650;        /* Success Green - Growth, Achievement */
--soladia-warning: #FF8C00;        /* Warning Orange - Attention, Caution */
--soladia-error: #DC2626;         /* Error Red - Critical, Stop */
--soladia-info: #0EA5E9;           /* Info Blue - Information, Help */
```

#### Neutral Colors
```css
/* Light Theme Neutrals */
--soladia-light: #F8F9FA;          /* Background Light */
--soladia-white: #FFFFFF;          /* Pure White */
--soladia-gray-50: #F9FAFB;        /* Lightest Gray */
--soladia-gray-100: #F3F4F6;       /* Very Light Gray */
--soladia-gray-200: #E5E7EB;       /* Light Gray */
--soladia-gray-300: #D1D5DB;       /* Medium Light Gray */
--soladia-gray-400: #9CA3AF;       /* Medium Gray */
--soladia-gray-500: #6B7280;       /* Base Gray */
--soladia-gray-600: #4B5563;       /* Dark Gray */
--soladia-gray-700: #374151;       /* Darker Gray */
--soladia-gray-800: #1F2937;       /* Very Dark Gray */
--soladia-gray-900: #111827;       /* Darkest Gray */
--soladia-dark: #1A1A1A;           /* Brand Dark */

/* Dark Theme Neutrals */
--soladia-dark-bg: #0F0F0F;        /* Dark Background */
--soladia-dark-surface: #1A1A1A;  /* Dark Surface */
--soladia-dark-text: #FFFFFF;      /* Dark Text */
--soladia-dark-border: #333333;    /* Dark Border */
--soladia-dark-muted: #666666;     /* Dark Muted */
```

#### Extended Color Palette
```css
/* Blockchain & Crypto Colors */
--soladia-solana: #14F195;         /* Solana Green */
--soladia-ethereum: #627EEA;       /* Ethereum Blue */
--soladia-bitcoin: #F7931A;        /* Bitcoin Orange */
--soladia-polygon: #8247E5;        /* Polygon Purple */

/* Status Colors */
--soladia-online: #10B981;         /* Online Status */
--soladia-offline: #6B7280;        /* Offline Status */
--soladia-pending: #F59E0B;        /* Pending Status */
--soladia-completed: #059669;      /* Completed Status */

/* Special Effects */
--soladia-glow: rgba(230, 0, 18, 0.3);     /* Primary Glow */
--soladia-glow-blue: rgba(0, 102, 204, 0.3); /* Secondary Glow */
--soladia-glow-gold: rgba(255, 215, 0, 0.3); /* Accent Glow */
```

### Color Usage Guidelines

#### Primary Color Usage
- **Soladia Red (#E60012)**: Primary actions, CTAs, brand elements, critical information
- **Soladia Blue (#0066CC)**: Secondary actions, links, information, trust elements
- **Soladia Gold (#FFD700)**: Premium features, success states, value indicators

#### Semantic Color Usage
- **Success Green**: Confirmations, completed transactions, positive feedback
- **Warning Orange**: Caution states, pending actions, attention required
- **Error Red**: Critical errors, failed transactions, destructive actions
- **Info Blue**: Help text, informational messages, guidance

---

## 🎨 Gradient System

### Primary Gradients
```css
/* Brand Gradients */
--soladia-gradient: linear-gradient(135deg, #E60012 0%, #0066CC 100%);
--soladia-gradient-gold: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
--soladia-gradient-dark: linear-gradient(135deg, #1A1A1A 0%, #333333 100%);

/* Extended Gradients */
--soladia-gradient-success: linear-gradient(135deg, #00A650 0%, #059669 100%);
--soladia-gradient-warning: linear-gradient(135deg, #FF8C00 0%, #F59E0B 100%);
--soladia-gradient-info: linear-gradient(135deg, #0EA5E9 0%, #3B82F6 100%);
--soladia-gradient-solana: linear-gradient(135deg, #14F195 0%, #00D4AA 100%);
```

### Gradient Usage
- **Primary Gradient**: Hero sections, main CTAs, brand highlights
- **Gold Gradient**: Premium features, success states, luxury elements
- **Dark Gradient**: Dark mode elements, sophisticated backgrounds
- **Semantic Gradients**: Status indicators, progress bars, notifications

---

## 🎨 Shadow System

### Shadow Hierarchy
```css
/* Shadow Scale */
--soladia-shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
--soladia-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
--soladia-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--soladia-shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
--soladia-shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1);
--soladia-shadow-2xl: 0 25px 50px rgba(0, 0, 0, 0.25);

/* Brand Shadows */
--soladia-shadow: 0 4px 20px rgba(230, 0, 18, 0.15);
--soladia-shadow-lg: 0 8px 40px rgba(230, 0, 18, 0.25);
--soladia-shadow-card: 0 2px 12px rgba(0, 0, 0, 0.08);

/* Colored Shadows */
--soladia-shadow-primary: 0 4px 20px rgba(230, 0, 18, 0.15);
--soladia-shadow-secondary: 0 4px 20px rgba(0, 102, 204, 0.15);
--soladia-shadow-success: 0 4px 20px rgba(0, 166, 80, 0.15);
--soladia-shadow-warning: 0 4px 20px rgba(255, 140, 0, 0.15);
```

### Shadow Usage
- **XS Shadow**: Subtle depth, borders, dividers
- **SM Shadow**: Cards, buttons, small elements
- **MD Shadow**: Modals, dropdowns, medium elements
- **LG Shadow**: Large cards, panels, prominent elements
- **XL Shadow**: Hero sections, major components
- **Brand Shadows**: Brand-specific elements, CTAs, highlights

---

## 🎨 Typography System

### Font Families
```css
/* Primary Fonts */
--soladia-font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--soladia-font-display: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--soladia-font-mono: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', monospace;
```

### Font Scale
```css
/* Font Sizes */
--soladia-text-xs: 0.75rem;       /* 12px */
--soladia-text-sm: 0.875rem;      /* 14px */
--soladia-text-base: 1rem;        /* 16px */
--soladia-text-lg: 1.125rem;      /* 18px */
--soladia-text-xl: 1.25rem;       /* 20px */
--soladia-text-2xl: 1.5rem;      /* 24px */
--soladia-text-3xl: 1.875rem;    /* 30px */
--soladia-text-4xl: 2.25rem;     /* 36px */
--soladia-text-5xl: 3rem;        /* 48px */
--soladia-text-6xl: 3.75rem;     /* 60px */

/* Font Weights */
--soladia-font-light: 300;
--soladia-font-normal: 400;
--soladia-font-medium: 500;
--soladia-font-semibold: 600;
--soladia-font-bold: 700;
--soladia-font-extrabold: 800;
--soladia-font-black: 900;
```

### Typography Usage
- **Inter**: Body text, UI elements, general content
- **Poppins**: Headings, display text, brand elements
- **JetBrains Mono**: Code, technical content, data display

---

## 🎨 Spacing System

### Spacing Scale
```css
/* Spacing Scale */
--soladia-space-xs: 0.25rem;      /* 4px */
--soladia-space-sm: 0.5rem;       /* 8px */
--soladia-space-md: 1rem;         /* 16px */
--soladia-space-lg: 1.5rem;       /* 24px */
--soladia-space-xl: 2rem;         /* 32px */
--soladia-space-2xl: 3rem;        /* 48px */
--soladia-space-3xl: 4rem;        /* 64px */
--soladia-space-4xl: 6rem;        /* 96px */
--soladia-space-5xl: 8rem;        /* 128px */
```

### Spacing Usage
- **XS**: Fine adjustments, borders, small gaps
- **SM**: Small elements, tight spacing
- **MD**: Standard spacing, comfortable reading
- **LG**: Section spacing, component separation
- **XL**: Major sections, page divisions
- **2XL+**: Hero sections, major layouts

---

## 🎨 Border Radius System

### Radius Scale
```css
/* Border Radius */
--soladia-radius-xs: 2px;
--soladia-radius-sm: 4px;
--soladia-radius-md: 8px;
--soladia-radius-lg: 12px;
--soladia-radius-xl: 16px;
--soladia-radius-2xl: 24px;
--soladia-radius-full: 9999px;
```

### Radius Usage
- **XS**: Small elements, tags, badges
- **SM**: Buttons, inputs, small cards
- **MD**: Standard cards, components
- **LG**: Large cards, panels
- **XL**: Hero sections, major components
- **Full**: Pills, avatars, circular elements

---

## 🎨 Component System

### Button System
```css
/* Primary Button */
.btn-primary {
  background: var(--soladia-gradient);
  color: white;
  border: none;
  border-radius: var(--soladia-radius-lg);
  padding: var(--soladia-space-md) var(--soladia-space-xl);
  font-weight: var(--soladia-font-semibold);
  transition: all 0.3s ease;
}

/* Secondary Button */
.btn-secondary {
  background: white;
  color: var(--soladia-primary);
  border: 2px solid var(--soladia-primary);
  border-radius: var(--soladia-radius-lg);
  padding: var(--soladia-space-md) var(--soladia-space-xl);
  font-weight: var(--soladia-font-semibold);
  transition: all 0.3s ease;
}
```

### Card System
```css
/* Standard Card */
.card {
  background: white;
  border-radius: var(--soladia-radius-xl);
  box-shadow: var(--soladia-shadow-card);
  border: 1px solid var(--soladia-border);
  padding: var(--soladia-space-lg);
  transition: all 0.3s ease;
}

/* Elevated Card */
.card-elevated {
  background: white;
  border-radius: var(--soladia-radius-xl);
  box-shadow: var(--soladia-shadow-lg);
  border: 1px solid var(--soladia-border);
  padding: var(--soladia-space-lg);
  transition: all 0.3s ease;
}
```

---

## 🎨 Dark Mode System

### Dark Mode Colors
```css
/* Dark Mode Color Mapping */
.dark {
  --soladia-bg: var(--soladia-dark-bg);
  --soladia-surface: var(--soladia-dark-surface);
  --soladia-text: var(--soladia-dark-text);
  --soladia-muted: var(--soladia-dark-muted);
  --soladia-border: var(--soladia-dark-border);
}
```

### Dark Mode Usage
- **Background**: Dark surfaces for reduced eye strain
- **Text**: High contrast white text for readability
- **Borders**: Subtle dark borders for definition
- **Accents**: Maintained brand colors for consistency

---

## 🎨 Animation System

### Transition System
```css
/* Standard Transitions */
--soladia-transition-fast: 0.15s ease;
--soladia-transition-normal: 0.3s ease;
--soladia-transition-slow: 0.5s ease;

/* Easing Functions */
--soladia-ease-in: cubic-bezier(0.4, 0, 1, 1);
--soladia-ease-out: cubic-bezier(0, 0, 0.2, 1);
--soladia-ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

### Animation Usage
- **Fast**: Hover states, quick interactions
- **Normal**: Standard transitions, component changes
- **Slow**: Page transitions, major state changes

---

## 🎨 Accessibility Guidelines

### Color Contrast
- **AA Standard**: Minimum 4.5:1 contrast ratio
- **AAA Standard**: Minimum 7:1 contrast ratio for critical text
- **Brand Colors**: Tested for accessibility compliance

### Focus States
```css
/* Focus Indicators */
.focus-visible {
  outline: 2px solid var(--soladia-primary);
  outline-offset: 2px;
}
```

### Screen Reader Support
- Semantic HTML structure
- ARIA labels and descriptions
- Keyboard navigation support
- Alternative text for images

---

## 🎨 Implementation Guidelines

### CSS Custom Properties
All design tokens are defined as CSS custom properties for easy theming and maintenance.

### Component Architecture
- Atomic design principles
- Reusable component patterns
- Consistent naming conventions
- Modular CSS architecture

### Performance Considerations
- Optimized gradients and shadows
- Efficient CSS selectors
- Minimal repaints and reflows
- Hardware-accelerated animations

---

## 🎨 Brand Applications

### Logo Usage
- Primary logo for main brand presence
- Monochrome versions for single-color applications
- Minimum size requirements for readability
- Clear space requirements around logo

### Color Applications
- Primary colors for brand recognition
- Semantic colors for functional communication
- Neutral colors for content hierarchy
- Accent colors for special features

### Typography Applications
- Display fonts for headlines and branding
- Body fonts for content and UI
- Monospace fonts for technical content
- Consistent hierarchy across all touchpoints

---

## 🎨 Quality Assurance

### Design Review Checklist
- [ ] Brand colors used correctly
- [ ] Typography hierarchy maintained
- [ ] Spacing system followed
- [ ] Shadow system applied
- [ ] Dark mode support included
- [ ] Accessibility standards met
- [ ] Performance optimized
- [ ] Cross-browser compatibility

### Testing Requirements
- Color contrast validation
- Screen reader testing
- Keyboard navigation testing
- Mobile device testing
- Cross-browser testing
- Performance testing

---

## 🎨 Future Considerations

### Scalability
- Design system can grow with product needs
- New components follow established patterns
- Color system supports additional themes
- Typography system supports new languages

### Maintenance
- Regular design system audits
- Component library updates
- Performance optimizations
- Accessibility improvements

---

*This brand guidelines document serves as the foundation for all Soladia design decisions and ensures consistency across all touchpoints.*
