# SpotMe - Fitness Networking Platform

## Project Overview
SpotMe is a comprehensive fitness networking platform that leverages AI and social connectivity to create personalized, engaging workout experiences. The platform transforms fitness tracking into an interactive and motivational journey for gym enthusiasts with the tagline "Never lift solo again."

**Current Status:** Active development with unified messaging interface

## Tech Stack
- **Frontend:** React.js with TypeScript, Vite
- **Backend:** Express.js with TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **Authentication:** Firebase Auth
- **Real-time:** WebSocket connections
- **Styling:** Tailwind CSS with shadcn/ui components
- **Maps:** MapBox for geolocation services
- **AI:** OpenAI integration for personality insights

## Project Architecture

### Color Scheme
- **Primary Colors:** Bright orange (#F97316), pink, yellow, and pale yellow
- **Design System:** Warm-toned glass morphism effects with gradients
- **User Preference:** NO PURPLE colors (user explicitly dislikes purple)

### Core Features
1. **Real-time Partner Matching** - Location-based gym partner discovery
2. **Unified Messaging & Connections** - Integrated chat, connection management, and partner ratings
3. **AI-Powered Insights** - Personality-based compatibility matching
4. **Workout Management** - Routines, focus areas, and recommendations
5. **Social Challenges** - Leaderboards, achievements, and workout battles
6. **Location Services** - Gym traffic prediction and nearby user discovery

### Navigation Structure
- **Desktop:** Sidebar navigation with consolidated "Messages & Connections"
- **Mobile:** Bottom navigation with 3 main sections (Explore, Messages, Menu)
- **Removed:** Music sharing functionality (completely eliminated)

## Recent Changes

### January 16, 2025
**Major UI Restructuring:**
- ✅ Removed all music sharing functionality from the application
- ✅ Merged Messages, Connections, and Partner Ratings into single unified page with tabbed interface
- ✅ Updated navigation components (Sidebar and MobileNav) to reflect simplified structure
- ✅ Implemented warm-toned color palette with orange primary color
- ✅ Created comprehensive tabbed interface in Messages.tsx with three sections:
  - Messages: Chat interface with connection list
  - Connections: Active connections, received requests, sent requests
  - Partner Ratings: Ratings received/given with rating form dialog

**Technical Updates:**
- Updated `client/src/App.tsx` to route both `/messages` and `/connections` to unified page
- Modified `client/src/components/layout/Sidebar.tsx` and `MobileNav.tsx` for new structure
- Enhanced `client/src/pages/Messages.tsx` with comprehensive tabbed interface
- Removed music sharing routes and components
- Fixed variable naming conflicts in rating queries

## User Preferences
- **Color Preferences:** Bright orange, pink, yellow, pale yellow (absolutely NO purple)
- **Feature Preferences:** Remove music sharing completely
- **UI Preferences:** Unified interfaces over separate pages for related functionality

## Current Issues
- Authentication flow needs to be tested
- WebSocket connections for real-time messaging
- Partner rating system integration

## Development Guidelines
- Follow warm color palette in all new features
- Maintain unified interface approach for related functionality
- Ensure mobile-responsive design
- Use TypeScript for type safety
- Implement real-time features with WebSocket where appropriate