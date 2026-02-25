# Keith Troutt - Portfolio Website

A modern, responsive portfolio website showcasing data visualization and analytics work. Built with vanilla HTML, CSS, and JavaScript for easy maintenance and maximum performance.

## 🚀 Quick Start - View Offline

### Option 1: Open Directly in Browser (Simplest)

1. Navigate to the project folder
2. Double-click `index.html`
3. The site will open in your default browser

**Note:** Some features (like loading the projects.json file) may require a local server due to browser security restrictions.

### Option 2: Use a Local Server (Recommended)

#### Using Python (Built-in on Mac)

```bash
# Navigate to the project folder
cd /path/to/portfolio_page

# Python 3 (recommended)
python3 -m http.server 8000

# OR Python 2
python -m SimpleHTTPServer 8000
```

Then open your browser and go to: `http://localhost:8000`

#### Using Node.js (if installed)

```bash
# Install http-server globally (one-time)
npm install -g http-server

# Navigate to project folder
cd /path/to/portfolio_page

# Start server
http-server -p 8000
```

Then open: `http://localhost:8000`

#### Using VS Code

If you use Visual Studio Code:

1. Install the "Live Server" extension
2. Right-click on `index.html`
3. Select "Open with Live Server"

---

## 📁 Project Structure

```
portfolio-website/
├── index.html                 # Main HTML file
├── README.md                  # This file
├── MAINTENANCE_GUIDE.md       # How to update content
├── DEVELOPMENT_PLAN.md        # Original development plan
│
├── assets/
│   ├── css/
│   │   ├── variables.css      # Design tokens (colors, fonts, spacing)
│   │   ├── main.css           # Base styles and utilities
│   │   ├── sections.css       # Section-specific styles
│   │   └── responsive.css     # Mobile responsiveness
│   │
│   ├── js/
│   │   ├── main.js            # Navigation, animations, scroll
│   │   ├── portfolio.js       # Portfolio filtering and modal
│   │   └── data/
│   │       └── projects.json  # ⭐ Your portfolio projects
│   │
│   ├── images/
│   │   ├── profile/           # Your photos
│   │   ├── portfolio/         # Project images
│   │   ├── logos/             # Company/certification logos
│   │   └── icons/             # Skill icons
│   │
│   └── docs/
│       └── resume.pdf         # Your resume
│
└── .gitignore
```

---

## 🎨 Customization

### Update Your Information

Edit `index.html` to replace placeholder content:

1. **Hero Section** - Your name, title, description
2. **About Section** - Your bio, highlights, social links
3. **Work Experience** - Your job history
4. **Certifications** - Your credentials
5. **Skills** - Your technical skills
6. **Contact** - Your LinkedIn, email

### Add Your Photos

Replace placeholder images:

- **Profile photo**: Add to `assets/images/profile/`
- **Project images**: Add to `assets/images/portfolio/`

Update image paths in `index.html` and `projects.json`

### Add Portfolio Projects

**This is super easy!** Just edit `assets/js/data/projects.json`

See [MAINTENANCE_GUIDE.md](MAINTENANCE_GUIDE.md) for detailed instructions.

---

## 🌐 Deploying to GitHub Pages

### Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click "New repository"
3. Name it: `keithtroutt.github.io` (or any name you prefer)
4. Make it **Public**
5. Don't initialize with README (you already have one)
6. Click "Create repository"

### Step 2: Push Your Code

```bash
# Navigate to your project folder
cd /path/to/portfolio_page

# Initialize git (if not already done)
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit: Portfolio website"

# Add GitHub remote (replace YOUR-USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR-USERNAME/keithtroutt.github.io.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click "Settings"
3. Scroll down to "Pages" (in the left sidebar)
4. Under "Source", select "main" branch
5. Click "Save"
6. Wait 1-2 minutes

Your site will be live at: `https://YOUR-USERNAME.github.io/repository-name/`

### Step 4: Connect Custom Domain (keithtroutt.com)

1. Buy domain from [Google Domains](https://domains.google), [Namecheap](https://namecheap.com), etc.
2. In your domain provider's DNS settings, add these records:

```
Type: A
Name: @
Value: 185.199.108.153

Type: A
Name: @
Value: 185.199.109.153

Type: A
Name: @
Value: 185.199.110.153

Type: A
Name: @
Value: 185.199.111.153

Type: CNAME
Name: www
Value: YOUR-USERNAME.github.io
```

3. In GitHub Pages settings, add your custom domain: `keithtroutt.com`
4. Check "Enforce HTTPS"
5. Wait 24-48 hours for DNS propagation

---

## 🔧 Making Updates

### Update Content

1. Edit `index.html` for static content
2. Edit `assets/js/data/projects.json` for portfolio projects
3. Test locally
4. Push to GitHub:

```bash
git add .
git commit -m "Update: describe your changes"
git push
```

Changes will appear on your live site within 1-2 minutes.

### Add New Project (Quick)

1. Add project images to `assets/images/portfolio/`
2. Edit `assets/js/data/projects.json`
3. Add new project entry (copy existing format)
4. Test locally, then push

See [MAINTENANCE_GUIDE.md](MAINTENANCE_GUIDE.md) for step-by-step instructions.

---

## 🎯 Features

- ✅ Fully responsive (mobile, tablet, desktop)
- ✅ Modern design with gradients and animations
- ✅ Portfolio filtering by tool type
- ✅ Project detail modals
- ✅ Smooth scroll navigation
- ✅ SEO optimized
- ✅ Accessibility (WCAG 2.1 AA)
- ✅ Fast loading times
- ✅ Easy content management via JSON

---

## 🛠️ Technology Stack

- **HTML5** - Semantic markup
- **CSS3** - Modern styling (Grid, Flexbox, Custom Properties)
- **JavaScript** - Vanilla JS (no frameworks)
- **Google Fonts** - Outfit & Inter typefaces
- **Font Awesome** - Icons
- **GitHub Pages** - Free hosting

---

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## 🐛 Troubleshooting

### Projects not loading?

- Make sure you're using a local server (not just opening the HTML file)
- Check browser console for errors (F12 → Console tab)
- Verify `projects.json` has valid JSON syntax

### Images not showing?

- Check file paths are correct
- Ensure images are in the correct folder
- Verify image file names match what's in the code

### Mobile menu not working?

- Clear browser cache
- Check JavaScript console for errors

---

## 📞 Need Help?

1. Check [MAINTENANCE_GUIDE.md](MAINTENANCE_GUIDE.md) for common tasks
2. Review [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) for architecture details
3. Check browser console (F12) for error messages

---

## 📄 License

This is your personal portfolio website. You own all rights to the content and code.

---

## 🎉 Next Steps

1. Replace all placeholder content with your real information
2. Add your professional photos
3. Add your actual portfolio projects to `projects.json`
4. Test thoroughly on mobile and desktop
5. Deploy to GitHub Pages
6. Share your new portfolio!

**Your portfolio is ready to customize and deploy!**
