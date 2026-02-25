# Keith Troutt Portfolio Website - Development Plan

## Executive Summary
This plan outlines the development of a modern, responsive portfolio website to showcase data visualization and analytics work. The site will be designed for easy maintenance, optimal performance, and professional presentation of Tableau, Power BI, and Python projects.

---

## 1. HOSTING RECOMMENDATION

### Recommended Solution: **GitHub Pages + Custom Domain**
**Why this is better than Google Sites:**
- ✅ Free hosting with custom domain (keithtroutt.com)
- ✅ Full control over HTML/CSS/JS (Google Sites is too restrictive for custom designs)
- ✅ Version control with Git
- ✅ Easy updates via Git push
- ✅ Fast CDN delivery
- ✅ Free SSL certificate included

### Alternative: **Firebase Hosting** (Google's option)
- Professional-grade hosting
- Free tier: 10GB storage, 360MB/day bandwidth
- Custom domain support
- Fast global CDN
- Easy deployment via Firebase CLI
- **Cost:** Free for portfolio sites

### Why NOT Google Sites:
Google Sites doesn't support custom HTML/CSS/JavaScript, which means you can't implement the modern design, custom interactions, or filterable portfolio you need.

### **RECOMMENDATION:** GitHub Pages (simplest) or Firebase Hosting (if you want Google ecosystem)

---

## 2. TECHNOLOGY STACK

### Core Technologies
```
HTML5          - Semantic markup
CSS3           - Modern styling (Grid, Flexbox, Custom Properties)
JavaScript     - Vanilla JS (no frameworks needed for this scope)
JSON           - Portfolio data management
```

### Key Libraries (Minimal & Lightweight)
```
AOS (Animate On Scroll)  - ~3KB - Scroll animations
Vanilla JS Modal         - ~2KB - Project detail overlays
Font Awesome            - Icons
Google Fonts            - Typography
```

### Build Tools
```
None required initially - Keep it simple
Optional: Vite (if you want a dev server later)
```

---

## 3. COLOR PALETTE & TYPOGRAPHY

### Primary Color Palette
```css
/* Greens - Primary Brand */
--primary-green: #10B981     /* Emerald - Vibrant, modern */
--primary-green-dark: #059669 /* Darker emerald for hover states */
--primary-green-light: #D1FAE5 /* Light tint for backgrounds */

/* Blues - Secondary/Accent */
--primary-blue: #3B82F6      /* Modern blue - Professional */
--primary-blue-dark: #1E40AF  /* Navy blue - Trust & authority */
--primary-blue-light: #DBEAFE /* Light blue for accents */

/* Supporting Colors */
--gradient-start: #10B981    /* Green */
--gradient-end: #3B82F6      /* Blue */

/* Neutrals */
--gray-50: #F9FAFB
--gray-100: #F3F4F6
--gray-200: #E5E7EB
--gray-300: #D1D5DB
--gray-600: #4B5563
--gray-700: #374151
--gray-800: #1F2937
--gray-900: #111827

/* Semantic Colors */
--background: #FFFFFF
--background-alt: #F9FAFB
--text-primary: #111827
--text-secondary: #4B5563
--border: #E5E7EB
```

### Typography System
```css
/* Primary Font: Inter (Modern, excellent readability) */
Primary Typeface: Inter
Fallback: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif

/* Futura Alternative: */
If you prefer Futura-style:
  - "Futura PT" (requires license)
  - "Century Gothic" (free alternative)
  - "Outfit" (free Google Font - geometric like Futura)

/* Recommended: Outfit (Free, Modern, Geometric Sans-Serif) */
Headings: 'Outfit', sans-serif
Body: 'Inter', sans-serif

/* Type Scale */
--text-xs: 0.75rem    /* 12px */
--text-sm: 0.875rem   /* 14px */
--text-base: 1rem     /* 16px */
--text-lg: 1.125rem   /* 18px */
--text-xl: 1.25rem    /* 20px */
--text-2xl: 1.5rem    /* 24px */
--text-3xl: 1.875rem  /* 30px */
--text-4xl: 2.25rem   /* 36px */
--text-5xl: 3rem      /* 48px */
--text-6xl: 3.75rem   /* 60px */
```

---

## 4. SITE STRUCTURE

### Page Architecture
```
Single Page Application (SPA) with smooth scrolling sections
```

### Navigation Structure
```
Header (Sticky Navigation)
├── Logo/Name
├── About
├── Experience
├── Certifications
├── Portfolio
├── Skills
├── Contact
└── Resume Download (Optional)

Main Content Sections (Scroll-based)
├── 1. Hero/Landing
├── 2. About Me
├── 3. Work Experience
├── 4. Certifications
├── 5. Portfolio/Projects (Main Focus)
├── 6. Skills & Tools
└── 7. Contact/Footer

Modal Overlays
└── Project Detail View
```

---

## 5. DETAILED SECTION LAYOUTS

### 5.1 Hero/Landing Section
```
Layout: Full viewport height
Background: Gradient (green to blue) or animated gradient mesh
Content:
  - Large headline: "Data Storyteller & Analytics Expert"
  - Subheading: Brief role description
  - CTA buttons: "View Portfolio" | "Download Resume"
  - Animated scroll indicator
Design Elements:
  - Subtle animated background (particles or gradient shift)
  - Professional headshot (circular, with subtle border)
  - Quick stats counter (e.g., "50+ Visualizations Created")
```

### 5.2 About Me Section
```
Layout: Two-column (image + content)
Content:
  - Professional photo (left)
  - Bio paragraph (right)
  - Key highlights/quick facts
  - Professional links (LinkedIn, GitHub)
Design: Clean, white background with accent color highlights
```

### 5.3 Work Experience Section
```
Layout: Timeline or card-based
Content: Each position includes:
  - Company name & logo
  - Job title
  - Date range
  - 3-4 key achievements (bullet points)
  - Skills/tools used
Design: Alternating left-right timeline OR vertical cards with icons
```

### 5.4 Certifications Section
```
Layout: Grid of certification cards (3-4 per row, responsive)
Content: Each certification includes:
  - Certification name
  - Issuing organization
  - Date earned
  - Credential badge/icon
  - Verification link (optional)
Design: Card-based with hover effects showing details
```

### 5.5 Portfolio/Projects Section ⭐ (Primary Focus)
```
Layout: Filterable grid
Filter Options:
  - All Projects
  - Tableau
  - Power BI
  - Python
  - By Industry (if applicable)

Project Card (Grid View):
  - Thumbnail/preview image or GIF
  - Project title
  - Brief description (2 lines)
  - Tool badges (Tableau/Power BI/Python icons)
  - "View Details" button

Project Detail Modal:
  - Large hero image/embed
  - Full project title
  - Detailed description
  - Challenge/Solution/Impact sections
  - Tools & technologies used
  - Key insights (bullet points)
  - Embedded visualization (Tableau/Power BI) OR images/GIFs
  - Close button

Embed Support:
  - Tableau Public embeds (iframe)
  - Power BI embeds (iframe)
  - Image galleries
  - Animated GIF demos
```

### 5.6 Skills & Tools Section
```
Layout: Categorized skill groups
Categories:
  - Data Visualization (Tableau, Power BI)
  - Programming (Python, SQL)
  - Tools & Platforms
  - Analytical Skills

Design Options:
  Option A: Skill bars with proficiency levels
  Option B: Icon grid with hover descriptions
  Option C: Tag cloud with varying sizes

Recommended: Icon grid with clean cards
```

### 5.7 Contact/Footer Section
```
Layout: Centered content
Content:
  - Section heading: "Let's Connect"
  - LinkedIn profile link (primary CTA)
  - Email contact (professional)
  - Social media links (if applicable)
  - Copyright notice
  - "Back to top" button
Design: Clean, minimal, with gradient background accent
```

---

## 6. FILE STRUCTURE & ORGANIZATION

```
portfolio-website/
├── index.html                 # Main HTML file
├── README.md                  # Setup & maintenance guide
├── MAINTENANCE_GUIDE.md       # How to add projects, update content
│
├── assets/
│   ├── css/
│   │   ├── main.css          # Main stylesheet
│   │   ├── variables.css     # CSS custom properties (colors, fonts)
│   │   ├── sections.css      # Individual section styles
│   │   └── responsive.css    # Media queries
│   │
│   ├── js/
│   │   ├── main.js           # Core functionality
│   │   ├── portfolio.js      # Portfolio filtering & modal logic
│   │   ├── animations.js     # Scroll animations & effects
│   │   └── data/
│   │       └── projects.json # ⭐ Portfolio projects data
│   │
│   ├── images/
│   │   ├── profile/          # Headshot, about images
│   │   ├── portfolio/        # Project thumbnails & images
│   │   ├── logos/            # Company logos, certifications
│   │   └── icons/            # Skill icons, tool badges
│   │
│   └── docs/
│       └── resume.pdf        # Downloadable resume
│
├── .gitignore
└── firebase.json (if using Firebase)
```

---

## 7. PORTFOLIO DATA STRUCTURE (projects.json)

This is the KEY to easy maintenance. You'll only edit this file to add projects.

```json
{
  "projects": [
    {
      "id": 1,
      "title": "Sales Performance Dashboard",
      "shortDescription": "Interactive dashboard analyzing quarterly sales trends across regions",
      "fullDescription": "Comprehensive analysis of sales performance...",
      "category": "tableau",
      "tools": ["Tableau", "SQL"],
      "thumbnail": "assets/images/portfolio/sales-dashboard-thumb.jpg",
      "images": [
        "assets/images/portfolio/sales-dashboard-1.jpg",
        "assets/images/portfolio/sales-dashboard-2.jpg"
      ],
      "embedType": "tableau",
      "embedUrl": "https://public.tableau.com/views/...",
      "challenge": "Business needed real-time visibility into sales performance",
      "solution": "Built interactive Tableau dashboard with drill-down capabilities",
      "impact": "Reduced reporting time by 75%, identified $2M revenue opportunity",
      "featured": true,
      "date": "2024-03"
    },
    {
      "id": 2,
      "title": "Customer Segmentation Analysis",
      "shortDescription": "Power BI dashboard for customer behavior analysis",
      "fullDescription": "...",
      "category": "powerbi",
      "tools": ["Power BI", "Python", "DAX"],
      "thumbnail": "assets/images/portfolio/customer-seg-thumb.gif",
      "embedType": "powerbi",
      "embedUrl": "https://app.powerbi.com/view?r=...",
      "featured": false,
      "date": "2024-01"
    }
  ]
}
```

---

## 8. INTERACTIVITY FEATURES

### Navigation
- ✅ Sticky header with smooth scroll to sections
- ✅ Active section highlighting in nav
- ✅ Mobile hamburger menu

### Portfolio
- ✅ Filter buttons (All, Tableau, Power BI, Python)
- ✅ Animated filter transitions
- ✅ Click to open modal with full project details
- ✅ Modal with next/previous navigation
- ✅ Close modal (X button or background click)

### Animations
- ✅ Scroll-triggered fade-in animations (AOS library)
- ✅ Hover effects on cards (lift, shadow, scale)
- ✅ Smooth transitions between states
- ✅ Loading animations for embedded visualizations

### Micro-interactions
- ✅ Button hover states with color transitions
- ✅ Card hover effects (subtle lift + shadow)
- ✅ Skill bars animate on scroll into view
- ✅ Counter animations for stats
- ✅ Smooth color transitions (300ms standard)

---

## 9. RESPONSIVE DESIGN BREAKPOINTS

```css
/* Mobile First Approach */
Base: 320px+ (Mobile)
Small: 640px+ (Large mobile)
Medium: 768px+ (Tablet)
Large: 1024px+ (Desktop)
XLarge: 1280px+ (Wide desktop)
```

### Key Responsive Changes
- **Mobile (< 768px):** Single column, hamburger menu, stacked portfolio cards
- **Tablet (768px - 1024px):** Two-column portfolio grid, simplified timeline
- **Desktop (1024px+):** Three-column portfolio grid, full features

---

## 10. PERFORMANCE OPTIMIZATION

### Image Optimization
- Compress all images (TinyPNG, ImageOptim)
- Use WebP format with JPG fallback
- Implement lazy loading for portfolio images
- Thumbnail sizes: 600x400px max
- Full images: 1200x800px max

### Code Optimization
- Minify CSS and JS for production
- Use CSS custom properties for consistency
- Minimize DOM manipulation
- Defer non-critical JavaScript
- Inline critical CSS

### Loading Strategy
- Hero section: Priority load
- Below fold: Lazy load
- Embeds: Load on modal open (not on page load)

### Target Performance
- Lighthouse Score: 90+ (all categories)
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s

---

## 11. SEO & ACCESSIBILITY

### SEO Essentials
```html
<!-- Meta tags -->
<title>Keith Troutt | Data Visualization Expert | Tableau & Power BI</title>
<meta name="description" content="Portfolio of Keith Troutt...">
<meta name="keywords" content="data visualization, tableau, power bi, analytics">

<!-- Open Graph for social sharing -->
<meta property="og:title" content="Keith Troutt - Data Visualization Portfolio">
<meta property="og:image" content="preview-image.jpg">

<!-- Structured Data (JSON-LD) -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Keith Troutt",
  "jobTitle": "Data Visualization Expert"
}
</script>
```

### Accessibility (WCAG 2.1 AA)
- ✅ Semantic HTML5 elements
- ✅ ARIA labels for interactive elements
- ✅ Keyboard navigation support
- ✅ Color contrast ratio > 4.5:1
- ✅ Alt text for all images
- ✅ Focus indicators for interactive elements
- ✅ Skip to main content link

---

## 12. OPTIONAL ENHANCEMENTS (Post-MVP)

### Phase 2 Features
1. **Dark Mode Toggle**
   - CSS custom properties make this easy
   - Save preference in localStorage
   - Smooth transition between modes

2. **Blog/Case Studies Section**
   - Markdown-based blog posts
   - Detailed project breakdowns
   - Thought leadership content

3. **Testimonials Carousel**
   - Client/colleague testimonials
   - Auto-rotating or manual navigation

4. **Analytics Integration**
   - Google Analytics 4
   - Track portfolio interactions
   - Monitor popular projects

5. **Contact Form**
   - Formspree or EmailJS (free tiers)
   - Alternative to direct email exposure

6. **Download Resume**
   - PDF download button
   - Track download analytics

7. **Multi-language Support**
   - If needed for international audience

---

## 13. IMPLEMENTATION PHASES

### Phase 1: Foundation (Week 1)
- [ ] Set up file structure
- [ ] Create HTML skeleton with all sections
- [ ] Implement CSS variables and base styles
- [ ] Set up responsive grid system
- [ ] Deploy basic version to GitHub Pages/Firebase

### Phase 2: Core Sections (Week 2)
- [ ] Build Hero section with animations
- [ ] Build About Me section
- [ ] Build Work Experience section
- [ ] Build Certifications section
- [ ] Build Skills section
- [ ] Build Contact/Footer section

### Phase 3: Portfolio Features (Week 3)
- [ ] Create projects.json data structure
- [ ] Build portfolio grid layout
- [ ] Implement filtering functionality
- [ ] Build project detail modal
- [ ] Add Tableau/Power BI embed support
- [ ] Test all interactive features

### Phase 4: Polish & Optimization (Week 4)
- [ ] Add scroll animations
- [ ] Implement all hover effects
- [ ] Optimize images
- [ ] Test responsive design on all devices
- [ ] SEO optimization
- [ ] Accessibility audit
- [ ] Performance testing & optimization
- [ ] Cross-browser testing

### Phase 5: Deployment & Documentation
- [ ] Final deployment to production
- [ ] Connect custom domain (keithtroutt.com)
- [ ] Create maintenance documentation
- [ ] Write project addition guide
- [ ] Set up analytics (optional)

---

## 14. MAINTENANCE GUIDE PREVIEW

### Adding a New Portfolio Project (Simple 3-Step Process)

**Step 1:** Add project images to `assets/images/portfolio/`

**Step 2:** Edit `assets/js/data/projects.json` and add new entry:
```json
{
  "id": 3,
  "title": "Your New Project",
  "shortDescription": "Brief description",
  "category": "tableau",
  "tools": ["Tableau"],
  "thumbnail": "assets/images/portfolio/new-project-thumb.jpg"
}
```

**Step 3:** Save and refresh - the new project appears automatically!

No HTML or CSS editing required. The JavaScript reads the JSON and builds the portfolio dynamically.

---

## 15. MODERN WEB FEATURES TO SHOWCASE DATA WORK

### Suggested Features
1. **Interactive Data Previews**
   - Hover over project cards to see animated GIF previews
   - Show live data insights on hover

2. **Scroll-Triggered Stat Counters**
   - "500K+ rows analyzed"
   - "50+ dashboards created"
   - Animated count-up when section enters viewport

3. **Gradient Mesh Backgrounds**
   - Modern, organic gradient backgrounds
   - Subtle animation for visual interest

4. **Glassmorphism Cards**
   - Frosted glass effect on project cards
   - Modern iOS/Material Design aesthetic

5. **Skeleton Loading States**
   - Show loading skeletons while embeds load
   - Professional UX pattern

6. **Intersection Observer Animations**
   - Elements fade/slide in as you scroll
   - Performance-friendly (no scroll listeners)

7. **Custom Cursor Effects** (Optional)
   - Subtle cursor trail or hover effects
   - Data visualization themed

---

## 16. COMPETITIVE ADVANTAGES

### What Will Make This Portfolio Stand Out

1. **Clean, Data-First Design**
   - Let your visualizations be the hero
   - Minimal distractions from your work

2. **Easy Portfolio Navigation**
   - Filter by tool/category instantly
   - Quick load times for embeds

3. **Professional Polish**
   - Smooth animations
   - Consistent design system
   - Attention to typography and spacing

4. **Embedded Live Dashboards**
   - Show interactive Tableau/Power BI work
   - Not just screenshots - real functionality

5. **Case Study Format**
   - Challenge/Solution/Impact structure
   - Show business value, not just technical skills

6. **Modern Tech Stack**
   - Current design trends
   - Fast, responsive, accessible

---

## 17. LEARNING OPPORTUNITIES

Since you're learning Python and web development, this project will help you:

1. **Understand JSON data structures** (portfolio data)
2. **Learn DOM manipulation** (JavaScript reading JSON and building HTML)
3. **Practice CSS Grid/Flexbox** (responsive layouts)
4. **Git version control** (managing your site updates)
5. **Web deployment** (GitHub Pages or Firebase)
6. **Developer tools** (debugging, performance testing)

The code will be heavily commented to explain concepts as you learn.

---

## 18. BUDGET ESTIMATE

### Free Tier (Recommended for Portfolio)
- ✅ Domain: $12-15/year (keithtroutt.com via Google Domains or Namecheap)
- ✅ Hosting: FREE (GitHub Pages or Firebase)
- ✅ SSL Certificate: FREE (included)
- ✅ Fonts: FREE (Google Fonts)
- ✅ Icons: FREE (Font Awesome free tier)
- ✅ Libraries: FREE (open source)

**Total Annual Cost: ~$15/year (domain only)**

### Optional Paid Upgrades
- Professional email: $6/month (Google Workspace)
- Premium analytics: Free tier sufficient
- Futura font license: ~$40 (one-time) OR use free alternative "Outfit"

---

## 19. DELIVERABLES CHECKLIST

Upon completion, you will receive:

- ✅ Complete website (all sections)
- ✅ Organized file structure (easy to navigate)
- ✅ projects.json template (easy to update)
- ✅ README.md (setup instructions)
- ✅ MAINTENANCE_GUIDE.md (how to add projects, update content)
- ✅ Commented code (learn as you maintain)
- ✅ Deployment guide (GitHub Pages or Firebase)
- ✅ Domain connection instructions
- ✅ Image optimization tips
- ✅ Sample projects.json entries

---

## 20. NEXT STEPS - AWAITING YOUR APPROVAL

### Questions for You:

1. **Hosting Preference:**
   - GitHub Pages (simpler, popular for portfolios)
   - Firebase Hosting (Google ecosystem, slightly more features)

2. **Typography:**
   - Outfit (free, geometric, Futura-like)
   - Inter (free, modern, excellent readability)
   - Pay for Futura PT license (~$40)

3. **Optional Features Priority:**
   Which Phase 2 features interest you most?
   - Dark mode
   - Blog/case studies
   - Testimonials
   - Analytics
   - Contact form

4. **Timeline:**
   - Target launch date?
   - Preferred implementation pace?

5. **Content Readiness:**
   - Do you have projects ready to showcase?
   - Professional headshot available?
   - Resume/work history prepared?

---

## APPROVAL CHECKLIST

Please review and approve/modify:

- [ ] Hosting solution (GitHub Pages or Firebase)
- [ ] Color palette (greens/blues as specified)
- [ ] Typography choices (Outfit + Inter recommended)
- [ ] Site structure (single page with sections)
- [ ] Portfolio filtering approach (by tool type)
- [ ] Modal design for project details
- [ ] File organization structure
- [ ] projects.json data management approach
- [ ] Implementation phases timeline
- [ ] Optional features priorities

---

**Once approved, I will proceed with implementation following the phases outlined above.**

**Estimated Development Time:** 3-4 weeks for full implementation with polish.

Please provide feedback on any aspect of this plan, and I'll adjust before we begin coding.
