# FlashDoc Marketing Website - Development Context

## Project Overview

The FlashDoc Marketing Website is a single-page HTML application created to promote the FlashDoc Chrome extension. It's a professional marketing website that showcases the extension's features, explains how it works, and provides clear calls-to-action for installation and GitHub access.

**Project Purpose**: To market the FlashDoc Chrome/Edge extension that allows users to instantly save selected text as files in various formats directly from their browser.

**Main Technologies**:
- Pure HTML5
- CSS3 with modern features (grid, flexbox, gradients, custom properties)
- Vanilla JavaScript (minimal)
- Responsive design with mobile-first approach
- Google Fonts for typography

**Architecture**: Single HTML file with embedded CSS and minimal JavaScript

## Key Features

- **Modern Design**: Glassmorphism, gradients, and smooth animations
- **Fully Responsive**: Mobile-first design that works on all devices
- **Zero Dependencies**: Pure HTML, CSS, and vanilla JavaScript
- **SEO Optimized**: Proper meta tags and semantic HTML
- **Fast Loading**: Single-page design with optimized assets
- **Accessible**: WCAG AA compliant with proper ARIA labels
- **100% Local Processing**: No external dependencies or tracking

## File Structure

```
website-instaFile/
├── index.html          # Main landing page (single file solution)
├── README.md           # Project documentation and setup guide
├── assets/             # Image assets and screenshots
│   ├── FlashDoc_dyai_1280x800.png
│   ├── FlashDoc_menu01_1280x800.png
│   ├── FlashDoc_menu02_1280x800.png
│   ├── FlashDoc_menu03_1280x800.png
│   ├── FlashDoc_real_fotoage01.png
│   ├── FlashDoc_real_fotoage02.png
│   ├── FlashDoc_resized.png
│   └── Bildschirmfoto vom 2025-11-24 12-44-24.png
├── brainstorm_ergebnis (1).md  # Brainstorming and planning document
├── artifacts_.md       # Implementation artifacts and testing guide
├── doctype_index.html  # Alternative index file?
├── FlashDocFiles.zip   # Compressed version of the project
├── FlashDocFiles_alt.zip   # Alternate compressed archive
├── FlashDoc-main.zip   # Project archive?
└── .git/               # Git repository
```

## Building and Running

The website is designed as a simple, standalone solution that requires no build process:

**Development**:
- Simply open `index.html` in any modern browser
- All styling is embedded in the same file
- Images are referenced from the assets/ directory

**Deployment Options**:
1. GitHub Pages: Push to GitHub repository and enable Pages in settings
2. Netlify: Drag and drop the entire folder or connect GitHub repo
3. Vercel: Use `vercel` CLI command
4. Any static hosting service

**Customization**:
- Update Chrome Web Store link by replacing `EXTENSION_ID` with actual extension ID
- Change colors by modifying CSS custom properties in the `:root` selector
- Update content directly in `index.html` (organized in sections: Hero, How It Works, Formats & Features, Screenshots & Privacy)

## Development Conventions

- The code follows a single-file approach to keep things simple and dependency-free
- CSS custom properties are used for consistent theming
- Semantic HTML for accessibility
- Responsive design using CSS Grid and Flexbox
- Mobile-first approach with responsive breakpoints
- Modern CSS features like backdrop-filter for glassmorphism effects
- Inline SVG and icons rather than external dependencies

## Key Sections in index.html

1. **Hero Section** (lines ~462-566): Introduction with CTA buttons
2. **How It Works** (lines ~569-616): 3-step explanation of the workflow
3. **Formats & Features** (lines ~619-677): Supported formats and triggers
4. **Screenshots & Privacy** (lines ~680-715): UI showcase and privacy statement

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

## Pre-Launch Checklist

When customizing this template for deployment:
- [ ] Replace `EXTENSION_ID` with actual Chrome Web Store ID
- [ ] Verify all image paths are correct
- [ ] Test all external links (GitHub, Chrome Store)
- [ ] Test on mobile devices (iOS Safari, Chrome Android)
- [ ] Check responsive design at all breakpoints
- [ ] Validate HTML/CSS (W3C validators)
- [ ] Run Lighthouse audit (target score > 90)

## Important Customization Points

To customize the website for your own extension:

1. **Chrome Web Store Link**: Update the placeholder `EXTENSION_ID` in two places around lines 486 and 526
2. **Colors**: Edit CSS custom properties in the `:root` selector
3. **Content**: All text content is directly in `index.html`
4. **Images**: Replace image files in the assets/ folder and update alt text as needed

## Design Philosophy

The design follows a dark theme with purple/violet and yellow accents, creating a modern and professional look that works well for tech-focused audiences. The layout uses card-based design, glassmorphism effects, and smooth animations to create an engaging user experience while maintaining readability and accessibility.

## Notes

- The project exists in multiple compressed formats (FlashDocFiles.zip, FlashDocFiles_alt.zip, FlashDoc-main.zip) suggesting different versions or deployments
- Two additional HTML files exist: `doctype_index.html` and the main `index.html` 
- The `brainstorm_ergebnis(1).md` and `artifacts_.md` files contain the original planning and implementation guide for this website