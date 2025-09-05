# Session Context - Maxi Yahtzee Angular Project

## Project Overview

**Project**: Multiplayer Maxi Yahtzee game built with Angular and AWS Amplify
**Location**: `d:\maksijatsi-angular` **Tech Stack**: Angular 20.2.3, Three.js,
CANNON.js physics, AWS Amplify, GraphQL, DynamoDB

## Conversation Summary

### GitHub Actions & CI/CD

- Created `amplify-deployment-status.yml` workflow for tracking AWS Amplify
  deployments
- Implemented OIDC authentication instead of long-lived AWS credentials
- Added automatic PR labeling based on deployment status

### Code Quality & Standards

- Fixed multiple TypeScript, ESLint, and SonarQube errors across components
- Enforced strict type safety and accessibility compliance
- Implemented comprehensive linting with Prettier formatting
- Added pre-commit hooks for code quality enforcement

### 3D Dice Game Implementation

- Enhanced dice throwing with gentler physics using CANNON.js
- Added OrbitControls for camera movement in Three.js scene
- Replaced cube models with `lowpolydice.glb` for realistic dice
- Added wood texture to game table with proper shadow rendering
- Implemented delta time-based animation loop for consistent performance
- Added dice settlement detection using physics sleep states

### Game Logic & Scoring

- Implemented comprehensive Yatzy scoring system with Finnish categories
- Added two-phase gameplay: upper section (1-6) must be completed before lower
  section
- Created scoring methods for all categories including "Kolme paria" (Three
  pairs)
- Added proper turn management and multiplayer validation
- Implemented dice keeping/selection functionality

### UI/UX Enhancements

- Complete Finnish localization of all UI elements
- Disabled global scrollbars for immersive experience
- Fixed quit button navigation and game state cleanup
- Hidden sign-out button during active gameplay
- Added user profile component with Cognito attributes display
- Created interactive scoresheet with modal score selection

### Authentication & Navigation

- Implemented proper game quit functionality with database cleanup
- Added profile component displaying user email, nickname, verification status
- Integrated AWS Cognito user management throughout the application

### Backend Architecture

- AWS AppSync GraphQL API for real-time synchronization
- DynamoDB for game state, users, and scores storage
- Lambda functions for game logic and cleanup operations
- Amplify hosting with automatic CI/CD deployment

## Key Files Modified

### Core Game Components

- `src/app/game/game.component.ts` - Main game logic with 3D physics
- `src/app/game/game.component.html` - Game UI with Finnish scoresheet
- `src/app/game/game.component.css` - Game styling and layout
- `src/app/lobby/lobby.component.ts` - Game lobby and user management
- `src/app/profile/profile.component.ts` - User profile display

### Backend Configuration

- `amplify/data/resource.ts` - GraphQL schema with Finnish enums
- `amplify/functions/cleanup-empty-games/` - Lambda cleanup function

### CI/CD & Workflows

- `.github/workflows/amplify-deployment-status.yml` - Deployment tracking

## Current State

### Active Development

- **Current File**: `src/app/game/game.component.ts` (line 140, character 9-29)
- **Last Feature**: Successfully added "Kolme paria" scoring category
- **Physics System**: Fully functional with gentle dice throwing and settlement
  detection
- **Scoring System**: Complete with all Finnish Yatzy categories implemented
- **Multiplayer**: Real-time synchronization with turn-based gameplay

### Technical Achievements

- **3D Physics**: Realistic dice simulation with CANNON.js integration
- **Performance**: Delta time animation loop for consistent 60fps
- **Localization**: Complete Finnish translation including game-specific terms
- **Code Quality**: Zero ESLint/TypeScript errors, comprehensive linting
- **Testing**: E2E tests with Cypress instead of unit tests due to AWS
  integration complexity

### User Preferences Identified

- Prefers OIDC authentication over long-lived credentials
- Requires fixing all code quality warnings/errors
- Wants realistic 3D physics with gentle animations
- Needs complete Finnish localization with proper Yahtzee terminology
- Values performance optimization and consistent animation timing
- Requires proper multiplayer state management and validation

## Next Steps Potential

- Further physics tuning if needed
- Additional scoring categories or game variants
- Enhanced 3D visual effects
- Performance optimizations
- Additional multiplayer features

## Technical Notes

- Uses Volta for Node.js version management (20.19.0)
- Amplify Gen 2 with TypeScript configuration
- Three.js with angular-three integration
- Material Design UI components
- GraphQL subscriptions for real-time updates

---

_Session saved: $(Get-Date)_ _Project Status: Active development with fully
functional 3D Yahtzee game_
