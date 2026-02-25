# Portfolio Website - Maintenance Guide

This guide shows you exactly how to update your portfolio website without touching complex code. Follow these step-by-step instructions for common tasks.

---

## Table of Contents

1. [Adding a New Portfolio Project](#adding-a-new-portfolio-project)
2. [Updating Work Experience](#updating-work-experience)
3. [Adding a Certification](#adding-a-certification)
4. [Updating Your Bio](#updating-your-bio)
5. [Changing Colors or Fonts](#changing-colors-or-fonts)
6. [Adding Images](#adding-images)
7. [Updating Contact Information](#updating-contact-information)

---

## Adding a New Portfolio Project

**This is the most common task** - and it's designed to be super easy!

### Step 1: Prepare Your Project Images

1. Create/export images of your project (screenshots, GIFs, etc.)
2. Resize images for web:
   - Thumbnail: 400x250px
   - Full images: 1000x600px (or similar aspect ratio)
3. Save with descriptive names: `sales-dashboard.jpg`, `customer-analytics.png`, etc.
4. Add images to: `assets/images/portfolio/`

### Step 2: Edit projects.json

1. Open `assets/js/data/projects.json` in a text editor
2. Find the closing `]` at the end of the projects array
3. **Before that `]`**, add a comma after the last project, then add your new project:

```json
    {
      "id": 7,
      "title": "Your Project Title",
      "shortDescription": "Brief one-line description for the card (2 lines max)",
      "fullDescription": "Longer description that appears in the modal. Explain what the project is and its purpose.",
      "category": "tableau",
      "tools": ["Tableau", "SQL", "Python"],
      "thumbnail": "assets/images/portfolio/your-project-thumb.jpg",
      "images": [
        "assets/images/portfolio/your-project-1.jpg",
        "assets/images/portfolio/your-project-2.jpg"
      ],
      "embedType": "image",
      "embedUrl": "",
      "challenge": "Describe the business problem or challenge this project solved.",
      "solution": "Explain how you solved it - your approach, tools used, implementation.",
      "impact": "Quantify the results - metrics, cost savings, time saved, revenue generated.",
      "featured": false,
      "date": "2024-10"
    }
```

### Step 3: Customize Your Project Entry

**Required fields:**

- **id**: Number - Must be unique. Use the next available number (7, 8, 9, etc.)
- **title**: String - Your project name
- **shortDescription**: String - Brief description (shows on card, 1-2 lines max)
- **fullDescription**: String - Detailed description (shows in modal)
- **category**: String - Must be one of:
  - `"tableau"` - For Tableau projects
  - `"powerbi"` - For Power BI projects
  - `"python"` - For Python projects
  - `"all"` - Don't use this, pick a specific category
- **tools**: Array - List of tools used, e.g., `["Tableau", "SQL", "Python"]`
- **thumbnail**: String - Path to thumbnail image
- **images**: Array - List of image paths for the modal
- **embedType**: String - Type of visualization:
  - `"image"` - Static images/GIFs
  - `"tableau"` - Embedded Tableau dashboard
  - `"powerbi"` - Embedded Power BI dashboard
- **embedUrl**: String - URL for embed (empty if embedType is "image")
- **challenge**: String - The problem you were solving
- **solution**: String - How you solved it
- **impact**: String - The results and business value
- **featured**: Boolean - `true` or `false` (for future features)
- **date**: String - Format: "YYYY-MM" (e.g., "2024-10" for October 2024)

### Step 4: Embedding Tableau or Power BI

If you want to embed an interactive dashboard:

**For Tableau:**
```json
"embedType": "tableau",
"embedUrl": "https://public.tableau.com/views/YourDashboard/Sheet1?:embed=yes&:display_count=yes"
```

**For Power BI:**
```json
"embedType": "powerbi",
"embedUrl": "https://app.powerbi.com/view?r=YOUR_REPORT_ID"
```

**Important:** Make sure your dashboard is published publicly and embeddable.

### Step 5: Test Locally

1. Save `projects.json`
2. Open your site in a browser using a local server (see README.md)
3. Navigate to the Portfolio section
4. Check that your project appears
5. Click on it to test the modal

### Step 6: Deploy

```bash
git add .
git commit -m "Add new project: [Your Project Name]"
git push
```

Your new project will appear on your live site within 1-2 minutes!

---

## Complete Example Project Entry

Here's a full example you can copy and customize:

```json
{
  "id": 7,
  "title": "Marketing ROI Dashboard",
  "shortDescription": "Real-time marketing campaign performance and ROI tracking",
  "fullDescription": "Comprehensive marketing analytics dashboard that tracks campaign performance across all channels including social media, email, paid ads, and organic search. Provides real-time ROI calculations and attribution modeling to optimize marketing spend.",
  "category": "tableau",
  "tools": ["Tableau", "Google Analytics", "SQL"],
  "thumbnail": "assets/images/portfolio/marketing-roi-thumb.jpg",
  "images": [
    "assets/images/portfolio/marketing-roi-main.jpg",
    "assets/images/portfolio/marketing-roi-details.jpg"
  ],
  "embedType": "tableau",
  "embedUrl": "https://public.tableau.com/views/MarketingROI/Dashboard1?:embed=yes",
  "challenge": "Marketing team was unable to accurately measure ROI across different channels. Attribution was manual and campaigns were evaluated weeks after completion, leading to wasted budget on underperforming channels.",
  "solution": "Built Tableau dashboard integrating data from Google Analytics, Facebook Ads, Google Ads, and email marketing platform. Implemented multi-touch attribution model and automated daily data refresh. Created drill-down capabilities for campaign-level analysis.",
  "impact": "Increased overall marketing ROI by 38%, identified and eliminated $150K in wasteful ad spend, reduced time to optimize campaigns from 2 weeks to 24 hours.",
  "featured": true,
  "date": "2024-08"
}
```

---

## Updating Work Experience

To add or update a job:

1. Open `index.html`
2. Find the `<!-- ========== WORK EXPERIENCE SECTION ========== -->` section
3. Find an existing `<div class="timeline-item">` block
4. Copy the entire block and paste it below (or edit existing)
5. Update the content:

```html
<div class="timeline-item">
  <div class="experience-card">
    <div class="experience-header">
      <div>
        <h3 class="experience-title">Your Job Title</h3>
        <div class="experience-company">Company Name</div>
      </div>
      <div class="experience-date">Month YYYY - Present</div>
    </div>

    <p class="experience-description">
      Brief description of your role and responsibilities.
    </p>

    <ul class="experience-achievements">
      <li>Achievement 1 with quantifiable results</li>
      <li>Achievement 2 with metrics</li>
      <li>Achievement 3 showing impact</li>
      <li>Achievement 4 demonstrating skills</li>
    </ul>

    <div class="experience-tools">
      <span class="badge">Tableau</span>
      <span class="badge">Power BI</span>
      <span class="badge">SQL</span>
    </div>
  </div>
</div>
```

**Tips:**
- Most recent job should be at the top
- Use specific metrics in achievements (%, $, time saved)
- Add relevant tools/technologies as badges

---

## Adding a Certification

1. Open `index.html`
2. Find the `<!-- ========== CERTIFICATIONS SECTION ========== -->` section
3. Copy an existing certification card
4. Update with your information:

```html
<div class="cert-card">
  <div class="cert-icon">
    <i class="fas fa-certificate"></i>
  </div>
  <h3 class="cert-name">Certification Name</h3>
  <div class="cert-issuer">Issuing Organization</div>
  <div class="cert-date">Earned: Month Year</div>
  <a href="https://credential-url.com" class="cert-link">View Credential →</a>
</div>
```

**Icon options** (from Font Awesome):
- `fa-certificate` - Generic certificate
- `fa-award` - Award/badge
- `fa-graduation-cap` - Academic
- `fa-medal` - Achievement
- `fa-trophy` - Excellence

---

## Updating Your Bio

### About Me Section

1. Open `index.html`
2. Find `<!-- ========== ABOUT SECTION ========== -->`
3. Update the paragraphs:

```html
<p>
  Your bio paragraph 1. Talk about your current role and expertise.
</p>
<p>
  Your bio paragraph 2. Mention what you're learning or passionate about.
</p>
```

### Update Highlights

Find the `about-highlights` section and update:

```html
<div class="highlight-item">
  <i class="fas fa-chart-line highlight-icon"></i>
  <div>
    <strong>Your Highlight Title</strong>
    <p>Brief description</p>
  </div>
</div>
```

### Social Links

Update your LinkedIn and GitHub:

```html
<a href="https://linkedin.com/in/YOUR-PROFILE" target="_blank" class="social-link">
  <i class="fab fa-linkedin"></i>
  LinkedIn
</a>
```

---

## Changing Colors or Fonts

### Update Color Palette

1. Open `assets/css/variables.css`
2. Find the `:root` section
3. Update color values:

```css
--primary-green: #10B981;     /* Change this hex code */
--primary-blue: #3B82F6;      /* Change this hex code */
```

**Color tools:**
- [Coolors.co](https://coolors.co) - Generate palettes
- [Adobe Color](https://color.adobe.com) - Color wheel

### Change Fonts

1. Go to [Google Fonts](https://fonts.google.com)
2. Find fonts you like
3. Copy the `<link>` tag
4. Replace the font link in `index.html` `<head>` section
5. Update `assets/css/variables.css`:

```css
--font-heading: 'Your-Font-Name', sans-serif;
--font-body: 'Your-Font-Name', sans-serif;
```

---

## Adding Images

### Profile Photos

1. Add images to `assets/images/profile/`
2. Update paths in `index.html`:

```html
<!-- Hero image -->
<img src="assets/images/profile/headshot.jpg" alt="Keith Troutt" class="hero-image">

<!-- About image -->
<img src="assets/images/profile/professional.jpg" alt="Keith Troutt Professional Photo" class="about-image">
```

### Portfolio Images

1. Add to `assets/images/portfolio/`
2. Update in `projects.json`:

```json
"thumbnail": "assets/images/portfolio/project-thumb.jpg",
"images": [
  "assets/images/portfolio/project-main.jpg",
  "assets/images/portfolio/project-detail.jpg"
]
```

**Image optimization tips:**
- Use JPG for photos
- Use PNG for screenshots with text
- Use WebP for best compression (modern browsers)
- Compress images with [TinyPNG](https://tinypng.com)

---

## Updating Contact Information

1. Open `index.html`
2. Find `<!-- ========== CONTACT SECTION ========== -->`
3. Update your links:

```html
<a href="https://linkedin.com/in/YOUR-PROFILE" target="_blank" class="contact-link">
  <i class="fab fa-linkedin fa-2x"></i>
  <span>Connect on LinkedIn</span>
</a>

<a href="mailto:your.email@example.com" class="contact-link">
  <i class="fas fa-envelope fa-2x"></i>
  <span>Send me an email</span>
</a>
```

---

## Quick Reference: File Locations

| What to Update | File to Edit | Section |
|----------------|--------------|---------|
| Portfolio projects | `assets/js/data/projects.json` | Entire file |
| About me bio | `index.html` | About section |
| Work experience | `index.html` | Experience section |
| Certifications | `index.html` | Certifications section |
| Skills | `index.html` | Skills section |
| Contact info | `index.html` | Contact section |
| Colors | `assets/css/variables.css` | `:root` section |
| Fonts | `assets/css/variables.css` | `:root` section |

---

## Testing Checklist

Before pushing updates to your live site:

- [ ] Test on Desktop (Chrome, Firefox, Safari)
- [ ] Test on Mobile (phone browser)
- [ ] Check all links work
- [ ] Verify images load
- [ ] Test portfolio filtering
- [ ] Click through project modals
- [ ] Test navigation menu on mobile
- [ ] Validate JSON syntax (use [JSONLint](https://jsonlint.com))

---

## Common Mistakes to Avoid

### JSON Errors

❌ **Wrong:**
```json
{
  "title": "My Project",  // No comments in JSON!
  "tools": ["Tableau"]    // Missing comma before next item
}
{  // Missing comma between objects
```

✅ **Right:**
```json
{
  "title": "My Project",
  "tools": ["Tableau"]
},
{
```

### Image Paths

❌ **Wrong:** `images/portfolio/project.jpg` (missing `assets/`)
✅ **Right:** `assets/images/portfolio/project.jpg`

### Category Names

❌ **Wrong:** `"category": "Tableau"` (capital T)
✅ **Right:** `"category": "tableau"` (lowercase)

Must be exactly: `"tableau"`, `"powerbi"`, or `"python"`

---

## Getting Help

1. **JSON not loading?**
   - Validate syntax at [JSONLint.com](https://jsonlint.com)
   - Check browser console (F12) for errors
   - Make sure you're using a local server

2. **Images not showing?**
   - Verify file path is correct
   - Check file name matches exactly (case-sensitive)
   - Ensure image is in the right folder

3. **Styles look broken?**
   - Clear browser cache (Cmd/Ctrl + Shift + R)
   - Check for typos in CSS files
   - Verify all CSS files are linked in `index.html`

---

## Deployment Quick Reference

After making changes:

```bash
# Check what changed
git status

# Stage all changes
git add .

# Commit with descriptive message
git commit -m "Update: describe what you changed"

# Push to GitHub (deploy)
git push
```

Wait 1-2 minutes and your changes will be live!

---

**You're all set!** This guide covers 95% of the updates you'll ever need to make. The site is designed to be easy to maintain - just edit content and push. No complex code required!
