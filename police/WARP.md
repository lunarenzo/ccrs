# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Common Development Commands

### Development Server
```bash
# Start development server with multiple platform options
npm start               # Start Expo dev server
npm run android         # Start and open on Android emulator
npm run ios            # Start and open on iOS simulator  
npm run web            # Start and open in web browser
```

### Code Quality
```bash
# Linting and type checking
npm run lint           # Run ESLint with Expo config
npx tsc --noEmit      # Type check without emitting files (TypeScript validation)
```

### Project Management
```bash
# Reset project to blank slate (moves current app to app-example)
npm run reset-project  # Interactive script to start fresh

# Install dependencies
npm install            # Install all dependencies
```

### Building and Deployment
```bash
# Note: EAS Build setup required for production builds
# Basic Expo export for static hosting (web)
npx expo export --platform web
```

## Architecture Overview

### Project Structure
This is an **Expo 53** React Native app using **Expo Router** for file-based routing with TypeScript support.

```
app/                    # File-based routing directory
├── (auth)/            # Auth route group (login flow)
│   └── login.tsx      # Officer login screen
├── (tabs)/            # Main app tab navigation
│   ├── _layout.tsx    # Tab bar configuration  
│   ├── index.tsx      # Home/Dashboard screen
│   ├── assignments.tsx # Assignment inbox (planned)
│   └── explore.tsx    # Secondary tab screen
├── _layout.tsx        # Root layout (theme, navigation)
└── +not-found.tsx     # 404 fallback

components/            # Reusable UI components
├── ui/               # Platform-specific UI components
│   ├── IconSymbol.*   # Cross-platform icon mapping (SF Symbols → Material)
│   └── TabBarBackground.* # Platform-specific tab styling
├── Themed*.tsx       # Theme-aware text/view components
├── HapticTab.tsx     # Haptic feedback tab buttons
└── ParallaxScrollView.tsx # Scroll animations

hooks/                # Custom React hooks
├── useColorScheme.*  # Theme detection (web/native)
└── useThemeColor.ts  # Theme color utilities

constants/            # App-wide constants
└── Colors.ts         # Theme color definitions
```

### Key Architectural Patterns

**File-based Routing**: Expo Router uses the `/app` directory structure to generate navigation. Route groups like `(auth)` and `(tabs)` organize related screens without affecting URL structure.

**Cross-platform Components**: `IconSymbol` automatically maps SF Symbols (iOS) to Material Icons (Android/Web) for consistent iconography.

**Theme System**: `ThemedText` and `ThemedView` components automatically adapt to light/dark mode based on system settings.

**Authentication Flow**: Login screen in `(auth)/login.tsx` redirects to `(tabs)` upon successful authentication. Currently uses placeholder logic - Firebase Auth integration needed.

### Path Aliases
TypeScript configured with `@/*` paths pointing to project root for clean imports:
```typescript
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
```

## Product Context

This app is the **Police Officers module** of the **CCRS (Crime Report System)**, designed to operationalize police response to citizen-submitted crime reports.

### Domain Vocabulary
- **Officer**: Police officer or detective using this app for case management
- **Supervisor**: Unit supervisor who can reassign cases and approve closures  
- **Assignment**: A crime report assigned to an officer for investigation
- **Report/Case**: Citizen-submitted crime incident requiring police response
- **Evidence**: Photos, videos, audio recordings, and notes collected on-site
- **Status Workflow**: `pending → validated → responding → resolved | rejected`

### Primary User Stories
- Officers receive push notifications for new assignments
- Officers can accept/decline assignments with quick status updates
- Officers capture evidence (photos/video/audio) with automatic metadata (timestamp, geolocation)
- Officers can navigate to incident locations and update case status in real-time
- Supervisors can reassign cases and review evidence before case closure
- All actions create audit trails integrated with admin dashboard

### UI/UX Standards
- **Icons**: Use Phosphor icons throughout the app for consistency
- **Charts**: Use Recharts library for analytics and data visualization
- **Design**: Clean, professional interface suitable for field use

## Technical Details

### Expo Configuration
- **Expo SDK**: ~53.0.22 (latest stable)
- **React Native**: 0.79.6
- **New Architecture**: Enabled (`newArchEnabled: true`)
- **Routing**: Expo Router ~5.1.5 with typed routes enabled

### Key Dependencies
- **Navigation**: `@react-navigation/*` with Expo Router integration
- **Icons**: Expo Symbols (iOS) + Material Icons fallback, **plan to migrate to Phosphor**
- **Haptics**: `expo-haptics` for tactile feedback
- **Image Processing**: `expo-image` for optimized media handling
- **Gestures**: `react-native-gesture-handler` and `react-native-reanimated`

### Recommended Additional Libraries
Per project coding standards, consider adding:
- **Validation**: `zod` for runtime validation and error handling
- **State Management**: `react-query` for data fetching, `zustand` for complex state
- **Security**: `react-native-encrypted-storage` for sensitive data storage
- **Error Handling**: `expo-error-reporter` for production error logging
- **Testing**: `detox` for E2E testing, `@testing-library/react-native` for component tests

### TypeScript Configuration
- Extends Expo's TypeScript base configuration
- Strict mode enabled
- Path mapping configured for `@/*` imports

### Platform Support
- **iOS**: Supports tablets, uses SF Symbols
- **Android**: Edge-to-edge design enabled, adaptive icons
- **Web**: Static export ready with Metro bundler

## Development Workflow

### Coding Standards
This project follows comprehensive TypeScript, React Native, and Expo development standards defined in `.cursorrules`. Key principles:
- **Functional Programming**: Use functional components and declarative patterns
- **TypeScript First**: Strict typing with interfaces over types
- **Performance**: Minimize useState/useEffect, prefer Context and reducers
- **Accessibility**: High a11y standards with proper ARIA roles and native props
- **Security**: Secure storage with react-native-encrypted-storage, input sanitization

### Getting Started
1. `npm install` - Install dependencies
2. `npm start` - Start development server
3. Scan QR code with Expo Go app or use simulator

### Authentication Development
The login flow is partially implemented but needs Firebase Auth integration:
- `app/(auth)/login.tsx` contains UI but uses placeholder authentication
- Role-based access control needed (officer/supervisor/admin roles)
- Protected routes should redirect unauthenticated users to login

### Adding New Features
1. **New Screens**: Add `.tsx` files in `/app` directory following file-based routing conventions
2. **Shared Components**: Add to `/components` with TypeScript interfaces
3. **Business Logic**: Create custom hooks in `/hooks` for reusable stateful logic
4. **Styling**: Follow existing theme patterns with `ThemedText`/`ThemedView` components

### Testing Strategy
Following the project's testing standards from `.cursorrules`:
- **Unit Tests**: Jest + React Native Testing Library for components and hooks
- **Integration Tests**: Detox for critical user flows (login, evidence capture, case updates)
- **Snapshot Tests**: Component UI consistency testing
- **Police-specific Testing**: 
  - Evidence capture and metadata validation
  - Offline functionality (status updates, evidence queuing)
  - Role-based access control (officer vs supervisor permissions)
  - Chain of custody integrity

### Debugging Tools
- **Expo DevTools**: Built-in debugging in development server
- **React DevTools**: Available in development builds
- **Flipper**: For advanced native debugging (requires development build)
- **Network Debugging**: Use Reactotron or Flipper for API call inspection

### Performance Considerations
- Evidence media files should be compressed before upload
- Implement proper caching for offline-first case data
- Use React Query or SWR for efficient data fetching and synchronization
- Consider lazy loading for large assignment lists

### Security Guidelines
Following Expo security best practices and project standards:
- **Secure Storage**: Use `react-native-encrypted-storage` for sensitive data (tokens, user credentials)
- **Input Sanitization**: Sanitize all user inputs to prevent XSS attacks
- **HTTPS Only**: Ensure secure communication with APIs using HTTPS and proper authentication
- **Evidence Chain of Custody**: Files must maintain immutability and complete audit trails
- **Permission Handling**: Use `expo-permissions` for graceful device permission requests
- **Role-Based Access**: Critical for police data - implement strict officer/supervisor/admin controls
- **Privacy**: Geolocation data should be optional and clearly consent-based

Refer to [Expo Security Guidelines](https://docs.expo.dev/guides/security/) for comprehensive security practices.
