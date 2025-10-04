# CCRS Admin Dashboard

Citizen Crime Reporting System (CCRS) Admin Dashboard built with React + TypeScript + Vite.

## Features

- **Dashboard**: Overview of crime reports and system statistics
- **Reports Management**: View, filter, and manage citizen crime reports  
- **GIS Map View**: Interactive map visualization of crime reports in Pangasinan province
- **User Management**: Manage citizen accounts and administrators
- **Real-time Updates**: Live data synchronization via Firebase
- **Dark/Light Theme**: Toggle between themes for optimal viewing

## GIS Map Feature

The GIS Map feature provides spatial visualization of crime reports across Pangasinan province using:

- **Interactive Map**: OpenStreetMap tiles with Leaflet.js
- **Status-coded Markers**: Color-coded markers using Phosphor icons based on report status
- **Real-time Data**: Live updates of report locations
- **Detailed Popups**: Click markers to view report details
- **Responsive Design**: Optimized for desktop and mobile viewing
- **Theme Support**: Dark/light theme compatibility

### Map Dependencies

The map functionality requires:
- `leaflet` - Core mapping library
- `react-leaflet` - React components for Leaflet
- `@types/leaflet` - TypeScript definitions

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
