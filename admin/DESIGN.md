Design an **Admin Dashboard UI/UX** for the CCRS Admin Dashboard project using **React (with Vite), Tailwind CSS, and shadcn/ui**.  

## Requirements
- **Theme**: Implement a theme inspired by the provided React Native design system (light/dark colors, typography, spacing, shadows, borders).  
- **Style inspiration**: Classic admin dashboards from the Bootstrap/PHP era (compact, functional, less rounded borders, minimal animations).  
- **Layout**:  
  - Fixed top navigation bar with branding + logout button.  
  - Sidebar navigation with links to **Dashboard**, **Reports**, and **Users**.  
  - Compact, full-width content area with cards, tables, and modals.  
  - Use shadcn/ui components for consistency (Button, Card, Table, Dialog, Input, Dropdown, etc.).  

## Pages to Design
1. **Login Page**  
   - Centered card with email + password input, login button.  
   - Minimalistic, with brand color accents.  

2. **Dashboard Page**  
   - KPI cards: total users, total reports, breakdowns.  
   - Recent activity feed (list of latest reports).  
   - Grid layout, compact spacing.  

3. **Reports Management Page**  
   - Table of reports with filters (status, category).  
   - Row actions: view details (modal), update status, add comments.  
   - Modal: show description, location, media, comments thread.  

4. **Users Management Page**  
   - Search + filter bar (status).  
   - Table of users with role, status, and report counts.  
   - Row actions: change role/status.  

5. **Audit Logs (optional)**  
   - Simple table showing admin actions with timestamps.  

## UI/UX Guidelines
- **Borders**: Subtle, straight edges (not overly rounded).  
- **Animations**: Minimal, just for transitions (modal open/close, dropdowns).  
- **Spacing**: Compact layout for information density.  
- **Typography**: Follow the baseTheme typography (smaller font sizes for tables, medium for cards/headers).  
- **Colors**:  
  - Light mode: `primary: #2B4C8C`, `secondary: #4674e5`, background `#f8fafc`, card `#ffffff`.  
  - Dark mode: background `#111827`, card `#1f2937`, text `#f9fafb`.  
- **Shadows**: Subtle elevation (sm, md, lg from baseTheme).  
- **Consistency**: Ensure Login, Dashboard, Reports, and Users share the same layout shell.  

## Deliverables
- A clean, production-ready **React component structure** with `Layout.tsx` (topbar + sidebar + outlet).  
- Use **shadcn/ui components** wrapped with Tailwind classes for styling.  
- Include **light/dark theme switching** using Tailwind + the provided theme tokens.  
- Prioritize **usability and readability** over flashy visuals.  

---

## Sample `tailwind.config.js` theme extension

```js
// tailwind.config.js
import { fontFamily } from "tailwindcss/defaultTheme"

export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2B4C8C",
        secondary: "#4674e5",
        accent: "#98c3f0",
        highlight: "#d6ac27",
        background: "#f8fafc",
        card: "#ffffff",
        gradientStart: "#1E3A8A",
        gradientEnd: "#3B82F6",
        success: "#10b981",
        danger: "#ef4444",
        warning: "#ed8936",
        error: "#f56565",
        info: "#4299e1",
        border: "#d1d5db",
        muted: "#718096",
        dark: {
          primary: "#60a5fa",
          secondary: "#818cf8",
          accent: "#93c5fd",
          highlight: "#facc15",
          background: "#111827",
          card: "#1f2937",
          text: "#f9fafb",
          border: "#374151",
          muted: "#4b5563",
        }
      },
      fontFamily: {
        sans: ["System", ...fontFamily.sans],
      },
      fontSize: {
        xs: "12px",
        sm: "14px",
        base: "16px",
        lg: "18px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "28px",
        "4xl": "32px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0,0,0,0.05)",
        md: "0 2px 4px rgba(0,0,0,0.1)",
        lg: "0 4px 6px rgba(0,0,0,0.15)",
      },
      borderRadius: {
        none: "0px",
        sm: "4px",
        md: "8px",
        lg: "12px",
      }
    },
  },
  plugins: [],
}
