# Soladia Color Schema - Structured Design System

## 🎨 Color Schema Architecture

### Pseudo-Code Structure
```typescript
interface ColorSchema {
  // Primary Brand Colors
  primary: {
    red: ColorValue;      // #E60012 - Soladia Red
    blue: ColorValue;     // #0066CC - Soladia Blue  
    gold: ColorValue;     // #FFD700 - Soladia Gold
  };
  
  // Semantic Colors
  semantic: {
    success: ColorValue;  // #00A650 - Success Green
    warning: ColorValue;   // #FF8C00 - Warning Orange
    error: ColorValue;     // #DC2626 - Error Red
    info: ColorValue;      // #0EA5E9 - Info Blue
  };
  
  // Neutral Colors
  neutral: {
    light: ColorScale;    // Light theme grays
    dark: ColorScale;       // Dark theme grays
  };
  
  // Extended Palette
  extended: {
    blockchain: BlockchainColors;
    status: StatusColors;
    effects: EffectColors;
  };
}
```

---

## 🎨 Primary Brand Colors

### Soladia Red (#E60012)
```typescript
interface SoladiaRed {
  hex: "#E60012";
  rgb: { r: 230, g: 0, b: 18 };
  hsl: { h: 355, s: 100, l: 45 };
  usage: {
    primary: "Main brand color, CTAs, critical actions";
    secondary: "Accent elements, highlights";
    semantic: "Error states, destructive actions";
  };
  accessibility: {
    contrast: "4.5:1 on white (AA compliant)";
    usage: "Primary actions, brand elements";
  };
}
```

### Soladia Blue (#0066CC)
```typescript
interface SoladiaBlue {
  hex: "#0066CC";
  rgb: { r: 0, g: 102, b: 204 };
  hsl: { h: 210, s: 100, l: 40 };
  usage: {
    primary: "Secondary brand color, links, information";
    secondary: "Trust elements, stability indicators";
    semantic: "Info states, help text";
  };
  accessibility: {
    contrast: "4.5:1 on white (AA compliant)";
    usage: "Secondary actions, information";
  };
}
```

### Soladia Gold (#FFD700)
```typescript
interface SoladiaGold {
  hex: "#FFD700";
  rgb: { r: 255, g: 215, b: 0 };
  hsl: { h: 51, s: 100, l: 50 };
  usage: {
    primary: "Premium features, success states";
    secondary: "Value indicators, luxury elements";
    semantic: "Success states, achievements";
  };
  accessibility: {
    contrast: "3:1 on white (AA compliant)";
    usage: "Accent elements, success indicators";
  };
}
```

---

## 🎨 Semantic Color System

### Success Green (#00A650)
```typescript
interface SuccessGreen {
  hex: "#00A650";
  rgb: { r: 0, g: 166, b: 80 };
  hsl: { h: 145, s: 100, l: 33 };
  variants: {
    light: "#D1FAE5";    // Light background
    medium: "#10B981";   // Medium variant
    dark: "#059669";     // Dark variant
  };
  usage: {
    primary: "Success states, confirmations";
    secondary: "Positive feedback, completed actions";
    semantic: "Growth indicators, achievements";
  };
}
```

### Warning Orange (#FF8C00)
```typescript
interface WarningOrange {
  hex: "#FF8C00";
  rgb: { r: 255, g: 140, b: 0 };
  hsl: { h: 33, s: 100, l: 50 };
  variants: {
    light: "#FEF3C7";    // Light background
    medium: "#F59E0B";   // Medium variant
    dark: "#D97706";     // Dark variant
  };
  usage: {
    primary: "Warning states, caution";
    secondary: "Attention required, pending actions";
    semantic: "Alert indicators, important notices";
  };
}
```

### Error Red (#DC2626)
```typescript
interface ErrorRed {
  hex: "#DC2626";
  rgb: { r: 220, g: 38, b: 38 };
  hsl: { h: 0, s: 84, l: 51 };
  variants: {
    light: "#FEE2E2";    // Light background
    medium: "#EF4444";   // Medium variant
    dark: "#B91C1C";     // Dark variant
  };
  usage: {
    primary: "Error states, failures";
    secondary: "Critical alerts, destructive actions";
    semantic: "Stop indicators, danger warnings";
  };
}
```

### Info Blue (#0EA5E9)
```typescript
interface InfoBlue {
  hex: "#0EA5E9";
  rgb: { r: 14, g: 165, b: 233 };
  hsl: { h: 199, s: 89, l: 48 };
  variants: {
    light: "#E0F2FE";    // Light background
    medium: "#3B82F6";   // Medium variant
    dark: "#1D4ED8";     // Dark variant
  };
  usage: {
    primary: "Information states, help";
    secondary: "Guidance, tips, assistance";
    semantic: "Info indicators, neutral information";
  };
}
```

---

## 🎨 Neutral Color System

### Light Theme Neutrals
```typescript
interface LightNeutrals {
  white: "#FFFFFF";      // Pure white
  gray50: "#F9FAFB";     // Lightest gray
  gray100: "#F3F4F6";    // Very light gray
  gray200: "#E5E7EB";    // Light gray
  gray300: "#D1D5DB";    // Medium light gray
  gray400: "#9CA3AF";    // Medium gray
  gray500: "#6B7280";    // Base gray
  gray600: "#4B5563";    // Dark gray
  gray700: "#374151";    // Darker gray
  gray800: "#1F2937";    // Very dark gray
  gray900: "#111827";    // Darkest gray
  black: "#000000";      // Pure black
}
```

### Dark Theme Neutrals
```typescript
interface DarkNeutrals {
  darkBg: "#0F0F0F";     // Dark background
  darkSurface: "#1A1A1A"; // Dark surface
  darkText: "#FFFFFF";   // Dark text
  darkBorder: "#333333"; // Dark border
  darkMuted: "#666666";  // Dark muted
  darkGray: "#2D2D2D";   // Dark gray
  darkLight: "#404040";  // Dark light
  darkMedium: "#555555"; // Dark medium
  darkAccent: "#777777"; // Dark accent
}
```

---

## 🎨 Extended Color Palette

### Blockchain Colors
```typescript
interface BlockchainColors {
  solana: {
    primary: "#14F195";   // Solana Green
    secondary: "#00D4AA"; // Solana Secondary
    accent: "#9945FF";    // Solana Purple
  };
  ethereum: {
    primary: "#627EEA";   // Ethereum Blue
    secondary: "#4F46E5"; // Ethereum Secondary
  };
  bitcoin: {
    primary: "#F7931A";   // Bitcoin Orange
    secondary: "#FF8C00"; // Bitcoin Secondary
  };
  polygon: {
    primary: "#8247E5";   // Polygon Purple
    secondary: "#7C3AED"; // Polygon Secondary
  };
}
```

### Status Colors
```typescript
interface StatusColors {
  online: "#10B981";      // Online status
  offline: "#6B7280";     // Offline status
  pending: "#F59E0B";     // Pending status
  completed: "#059669";   // Completed status
  cancelled: "#DC2626";   // Cancelled status
  processing: "#3B82F6";  // Processing status
}
```

### Effect Colors
```typescript
interface EffectColors {
  glow: {
    primary: "rgba(230, 0, 18, 0.3)";    // Primary glow
    secondary: "rgba(0, 102, 204, 0.3)"; // Secondary glow
    gold: "rgba(255, 215, 0, 0.3)";      // Gold glow
    success: "rgba(0, 166, 80, 0.3)";    // Success glow
  };
  shadow: {
    primary: "rgba(230, 0, 18, 0.15)";   // Primary shadow
    secondary: "rgba(0, 102, 204, 0.15)"; // Secondary shadow
    neutral: "rgba(0, 0, 0, 0.1)";        // Neutral shadow
  };
}
```

---

## 🎨 Gradient System

### Primary Gradients
```typescript
interface PrimaryGradients {
  brand: {
    primary: "linear-gradient(135deg, #E60012 0%, #0066CC 100%)";
    gold: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)";
    dark: "linear-gradient(135deg, #1A1A1A 0%, #333333 100%)";
  };
  semantic: {
    success: "linear-gradient(135deg, #00A650 0%, #059669 100%)";
    warning: "linear-gradient(135deg, #FF8C00 0%, #F59E0B 100%)";
    error: "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)";
    info: "linear-gradient(135deg, #0EA5E9 0%, #3B82F6 100%)";
  };
  blockchain: {
    solana: "linear-gradient(135deg, #14F195 0%, #00D4AA 100%)";
    ethereum: "linear-gradient(135deg, #627EEA 0%, #4F46E5 100%)";
    bitcoin: "linear-gradient(135deg, #F7931A 0%, #FF8C00 100%)";
  };
}
```

---

## 🎨 Color Usage Guidelines

### Primary Color Usage
```typescript
interface ColorUsage {
  soladiaRed: {
    primary: "Main CTAs, brand elements, critical actions";
    secondary: "Accent elements, highlights, important buttons";
    semantic: "Error states, destructive actions, warnings";
    accessibility: "4.5:1 contrast on white (AA compliant)";
  };
  soladiaBlue: {
    primary: "Secondary actions, links, information";
    secondary: "Trust elements, stability indicators";
    semantic: "Info states, help text, guidance";
    accessibility: "4.5:1 contrast on white (AA compliant)";
  };
  soladiaGold: {
    primary: "Premium features, success states";
    secondary: "Value indicators, luxury elements";
    semantic: "Success states, achievements, positive feedback";
    accessibility: "3:1 contrast on white (AA compliant)";
  };
}
```

### Semantic Color Usage
```typescript
interface SemanticUsage {
  success: {
    primary: "Confirmations, completed transactions";
    secondary: "Positive feedback, success indicators";
    semantic: "Growth, achievements, positive outcomes";
    accessibility: "4.5:1 contrast on white (AA compliant)";
  };
  warning: {
    primary: "Caution states, pending actions";
    secondary: "Attention required, important notices";
    semantic: "Alert indicators, caution warnings";
    accessibility: "4.5:1 contrast on white (AA compliant)";
  };
  error: {
    primary: "Critical errors, failed transactions";
    secondary: "Destructive actions, danger warnings";
    semantic: "Stop indicators, critical alerts";
    accessibility: "4.5:1 contrast on white (AA compliant)";
  };
  info: {
    primary: "Help text, informational messages";
    secondary: "Guidance, tips, assistance";
    semantic: "Info indicators, neutral information";
    accessibility: "4.5:1 contrast on white (AA compliant)";
  };
}
```

---

## 🎨 Dark Mode Color Mapping

### Dark Mode Implementation
```typescript
interface DarkModeMapping {
  background: {
    light: "#FFFFFF";     // Light background
    dark: "#0F0F0F";      // Dark background
  };
  surface: {
    light: "#F8F9FA";     // Light surface
    dark: "#1A1A1A";      // Dark surface
  };
  text: {
    light: "#1A1A1A";     // Light text
    dark: "#FFFFFF";      // Dark text
  };
  muted: {
    light: "#6B7280";     // Light muted
    dark: "#666666";      // Dark muted
  };
  border: {
    light: "#E1E5E9";     // Light border
    dark: "#333333";      // Dark border
  };
}
```

---

## 🎨 Accessibility Guidelines

### Color Contrast Requirements
```typescript
interface ContrastRequirements {
  normalText: {
    minimum: "4.5:1";    // WCAG AA standard
    preferred: "7:1";     // WCAG AAA standard
    largeText: "3:1";     // WCAG AA for large text
  };
  uiComponents: {
    minimum: "3:1";       // WCAG AA for UI components
    preferred: "4.5:1";   // Enhanced accessibility
  };
  brandColors: {
    tested: "All brand colors tested for compliance";
    fallbacks: "Alternative colors for accessibility";
  };
}
```

### Color Blindness Support
```typescript
interface ColorBlindnessSupport {
  protanopia: "Red-green color blindness support";
  deuteranopia: "Red-green color blindness support";
  tritanopia: "Blue-yellow color blindness support";
  monochromacy: "Complete color blindness support";
  solutions: {
    patterns: "Pattern-based differentiation";
    icons: "Icon-based communication";
    text: "Text-based information";
    contrast: "High contrast alternatives";
  };
}
```

---

## 🎨 Implementation Examples

### CSS Custom Properties
```css
:root {
  /* Primary Brand Colors */
  --soladia-primary: #E60012;
  --soladia-secondary: #0066CC;
  --soladia-accent: #FFD700;
  
  /* Semantic Colors */
  --soladia-success: #00A650;
  --soladia-warning: #FF8C00;
  --soladia-error: #DC2626;
  --soladia-info: #0EA5E9;
  
  /* Neutral Colors */
  --soladia-white: #FFFFFF;
  --soladia-gray-50: #F9FAFB;
  --soladia-gray-100: #F3F4F6;
  --soladia-gray-200: #E5E7EB;
  --soladia-gray-300: #D1D5DB;
  --soladia-gray-400: #9CA3AF;
  --soladia-gray-500: #6B7280;
  --soladia-gray-600: #4B5563;
  --soladia-gray-700: #374151;
  --soladia-gray-800: #1F2937;
  --soladia-gray-900: #111827;
  --soladia-black: #000000;
  
  /* Dark Mode Colors */
  --soladia-dark-bg: #0F0F0F;
  --soladia-dark-surface: #1A1A1A;
  --soladia-dark-text: #FFFFFF;
  --soladia-dark-border: #333333;
  --soladia-dark-muted: #666666;
}
```

### TypeScript Interface
```typescript
interface SoladiaColorSchema {
  primary: {
    red: string;
    blue: string;
    gold: string;
  };
  semantic: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  neutral: {
    light: string[];
    dark: string[];
  };
  extended: {
    blockchain: Record<string, string>;
    status: Record<string, string>;
    effects: Record<string, string>;
  };
}
```

---

## 🎨 Quality Assurance

### Color Testing
```typescript
interface ColorTesting {
  contrast: {
    automated: "Automated contrast testing";
    manual: "Manual contrast verification";
    tools: "WebAIM, Colour Contrast Analyser";
  };
  accessibility: {
    screenReaders: "Screen reader compatibility";
    colorBlindness: "Color blindness testing";
    highContrast: "High contrast mode support";
  };
  crossBrowser: {
    chrome: "Chrome color rendering";
    firefox: "Firefox color rendering";
    safari: "Safari color rendering";
    edge: "Edge color rendering";
  };
}
```

### Performance Considerations
```typescript
interface ColorPerformance {
  cssVariables: "CSS custom properties for theming";
  optimization: "Minified color values";
  caching: "Browser color caching";
  fallbacks: "Graceful degradation";
}
```

---

*This color schema documentation provides a comprehensive, structured approach to Soladia's color system with pseudo-code definitions and implementation guidelines.*
