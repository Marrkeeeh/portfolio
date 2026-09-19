# Mark Jeryl Omandam — Portfolio

Personal portfolio website for Mark Jeryl Omandam, a BSIT graduate interested in web development, IT systems, networking, databases, and IoT.

## Description

This is a modern, professional, responsive personal portfolio website built with plain HTML, CSS, and JavaScript (no frameworks). It showcases skills, projects, education, certifications, resume, and contact information for a junior-level IT and web development professional.

## Technologies

- HTML5 (semantic markup)
- CSS3 (flexbox, grid, CSS variables, media queries)
- Vanilla JavaScript (ES6+, no frameworks or dependencies)

## Features

### UI / Layout
- 10 content sections: Navigation, Hero, About, Skills, Projects, Experience/Education, Certifications, Resume, Contact, Footer
- Fully responsive layout (desktop, laptop, tablet, and mobile)
- Sticky navigation bar with mobile hamburger menu
- Smooth scrolling between sections
- Active navigation indicator (highlights current section while scrolling)
- Scroll reveal animations
- Back-to-top floating button

### User Experience
- Dark / Light mode toggle with saved preference (localStorage)
- Subtle hover effects on buttons, cards, and links
- Placeholder states for projects, certifications, and contact info
- Project status badges (Completed / In Development / Planned)

### Forms & Validation
- Contact form with client-side validation (name, email, message fields)
- Visible focus states and error messages
- Accessible keyboard navigation

### Accessibility
- Semantic HTML elements
- Proper heading hierarchy (`h1` → `h6`)
- `alt` text for images
- `aria-label` and `aria-expanded` attributes where appropriate
- Visible focus outlines
- Respects `prefers-reduced-motion` browser setting
- Good color contrast in both themes

### SEO
- Custom page title and meta description
- Open Graph and Twitter Card metadata
- Favicon placeholder

## File Structure

```
portfolio/
├── index.html              # Main page (all sections)
├── css/
│   └── style.css           # All styles, themes, responsive rules
├── js/
│   └── script.js           # Interactive features (no dependencies)
├── assets/
│   ├── profile.jpg         # Your profile photo (you add this)
│   ├── favicon.png         # Browser tab icon (you add this)
│   └── Mark_Jeryl_Omandam_CV.pdf  # Your resume PDF (you add this)
├── README.md
└── .gitignore
```

## Running Locally

### Option 1 — Open directly in a browser
1. Clone or download this project to your computer.
2. Open the project folder.
3. Double-click `index.html` or drag it into any modern web browser
   (Chrome, Edge, Firefox, Safari).

### Option 2 — VS Code Live Server (recommended)
1. Open the project folder in **Visual Studio Code**.
2. Install the **Live Server** extension by Ritwick Dey from the Extensions panel.
3. Right-click `index.html` and choose **"Open with Live Server"**.
4. The website opens at `http://127.0.0.1:5500/` (or similar port) and auto-reloads when you edit files.

### Option 3 — Using XAMPP (your current environment)
1. Place the project folder inside your `htdocs` directory
   (e.g. `C:\xampp\htdocs\Portfolio\`).
2. Start the **Apache** module in the XAMPP Control Panel.
3. In your browser, visit:
   ```
   http://localhost/Portfolio/
   ```

## Assets You Need to Add

The website will work immediately, but you should add these files to the `assets/` folder:

| File | Description |
|------|-------------|
| `assets/profile.jpg` | Your portrait photo (square or 4:5 ratio works best). |
| `assets/favicon.png` | A small square icon for the browser tab (16×16 or 32×32 px). |
| `assets/Mark_Jeryl_Omandam_CV.pdf` | Your resume/CV in PDF format. |

## Placeholders You Should Replace

Open `index.html` and look for these placeholders (they are wrapped in brackets `[...]` or clearly marked):

- **Contact section** — email, GitHub URL, LinkedIn URL, location
- **Footer social links** — GitHub, LinkedIn, Email
- **Certifications section** — replace the placeholder cards with your earned certifications (or remove extra ones)
- **Project cards** — add real GitHub and Live Demo URLs once your projects are online

## Future Improvements

Planned enhancements for future versions:

- **Supabase integration** — dynamically load projects, experience, and certifications from a database instead of hard-coding in HTML
- **Contact form backend** — use a service like Formspree, Resend, or a custom Supabase edge function to actually send emails
- **Blog section** — write posts about projects, tutorials, and things learned
- **Analytics** — add a privacy-friendly analytics tool (e.g. Plausible, Umami) to monitor visitors
- **More animations** — optional micro-interactions (without sacrificing performance)

## License

Personal portfolio — content is © Mark Jeryl Omandam.
