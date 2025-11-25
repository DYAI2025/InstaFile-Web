# FlashDoc Marketing Website

Professional marketing website for the FlashDoc Chrome extension.

## 🚀 Quick Start

Simply open `index.html` in any modern browser. No build process required.

## 📁 Structure

```
website-flashdoc/
├── index.html          # Main landing page (single file)
├── assets/             # Images and screenshots
│   ├── instafile_dyai_1280x800.png
│   ├── InstaFile_menu01_1280x800.png
│   ├── InstaFile_menu02_1280x800.png
│   └── InstaFile_menu03_1280x800.png
└── README.md           # This file
```

## 🎨 Features

- **Modern Design**: Glassmorphism, gradients, and smooth animations
- **Fully Responsive**: Mobile-first design that works on all devices
- **Zero Dependencies**: Pure HTML, CSS, and vanilla JavaScript
- **SEO Optimized**: Proper meta tags and semantic HTML
- **Fast Loading**: Single-page design with optimized assets
- **Accessible**: WCAG AA compliant with proper ARIA labels

## 🔧 Customization

### Update Chrome Web Store Link

Replace `EXTENSION_ID` in the following lines with your actual Chrome Web Store extension ID:

```html
<!-- Line ~486 and ~526 -->
href="https://chrome.google.com/webstore/detail/flashdoc/EXTENSION_ID"
```

### Change Colors

Edit the CSS custom properties in the `:root` selector:

```css
:root {
  --accent-yellow: #ffcf33;
  --accent-pink: #f973ff;
  --accent-purple: #8b5cf6;
  /* ... more colors */
}
```

### Update Content

All content is in `index.html`. Key sections:
- Hero section (lines ~462-566)
- How It Works (lines ~569-616)
- Formats & Features (lines ~619-677)
- Screenshots & Privacy (lines ~680-715)

## 🌐 Deployment

### GitHub Pages

1. Push to GitHub repository
2. Go to Settings → Pages
3. Select main branch
4. Your site will be live at `https://username.github.io/repo-name`

### Netlify

1. Drag and drop the entire folder to [Netlify Drop](https://app.netlify.com/drop)
2. Or connect your GitHub repo for automatic deployments

### Vercel

```bash
npm i -g vercel
vercel
```

## ✅ Pre-Launch Checklist

- [ ] Replace `EXTENSION_ID` with actual Chrome Web Store ID
- [ ] Verify all image paths are correct
- [ ] Test all external links (GitHub, Chrome Store)
- [ ] Test on mobile devices (iOS Safari, Chrome Android)
- [ ] Check responsive design at all breakpoints
- [ ] Validate HTML/CSS (W3C validators)
- [ ] Run Lighthouse audit (target score > 90)

## 📱 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

## 📄 License

This website template is part of the FlashDoc project.

## 🔗 Links

- [FlashDoc Extension](https://chrome.google.com/webstore/detail/flashdoc/EXTENSION_ID)
- [GitHub Repository](https://github.com/DYAI2025/Instdoc)
- [Report Issues](https://github.com/DYAI2025/Instdoc/issues)

---

Built with ⚡ for FlashDoc