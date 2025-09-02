# Maxi Yahtzee - Multiplayer Dice Game

[![Amplify Deployment](https://github.com/taheikura/main/actions/workflows/amplify-deployment-status.yml/badge.svg)](https://github.com/taheikura/main/actions/workflows/amplify-deployment-status.yml)
[![AWS Amplify](https://img.shields.io/badge/AWS-Amplify-orange)](https://aws.amazon.com/amplify/)

This is a multiplayer Maxi Yahtzee game built with Angular and AWS Amplify,
featuring 3D dice simulation and real-time gameplay.

## Game Features

- **3D Dice Simulation**: Realistic dice physics using Three.js and cannon-es
- **Multiplayer Support**: Real-time multiplayer games with turn-based gameplay
- **Authentication**: Secure user authentication with Amazon Cognito
- **Real-time Updates**: Live game state synchronization using AWS AppSync
  GraphQL subscriptions
- **Responsive Design**: Material Design UI components for modern user
  experience

## Technical Stack

- **Frontend**: Angular 20.2.3 with Angular Material
- **3D Graphics**: Three.js with angular-three integration
- **Physics**: cannon-es for realistic dice physics simulation
- **Backend**: AWS Amplify with AppSync GraphQL API
- **Database**: Amazon DynamoDB for game state and user data
- **Authentication**: Amazon Cognito User Pools
- **Real-time**: GraphQL subscriptions for live updates

## Development Setup

### Prerequisites

- Node.js >= 20.19.0 (managed via Volta)
- AWS CLI configured
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd maksijatsi-angular

# Install dependencies
npm install

# Start development server
npm start
```

### Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:e2e:open` - Open Cypress test runner
- `npm run sandbox` - Start Amplify sandbox environment
- `npm run deletesandbox` - Delete Amplify sandbox

## Testing Strategy

This project uses **Cypress end-to-end (E2E) tests** instead of traditional unit
tests due to the complex AWS service integrations. The testing approach focuses
on real user workflows and provides better coverage for the integrated
authentication and game functionality.

### Why E2E Tests Over Unit Tests?

- **AWS Integration Complexity**: Unit testing AWS Amplify components requires
  extensive, brittle mocking
- **Real User Experience**: E2E tests validate actual user workflows
- **Authentication Testing**: Proper testing of Cognito integration without
  complex service mocks
- **Component Integration**: Tests verify that all parts work together correctly

### Running Tests

```bash
# Run all E2E tests headlessly
npm run test:e2e

# Open Cypress Test Runner for interactive testing
npm run test:e2e:open

# Note: npm test returns a message directing to E2E tests
npm test
```

### CI/CD Integration

The project includes automated testing in the AWS Amplify CI/CD pipeline:

1. **Build Phase**: Compiles Angular application for production
2. **Test Phase**: Runs Cypress E2E tests against the built application
3. **Deploy Phase**: Deploys to AWS infrastructure if tests pass

The CI configuration (`amplify.yml`) ensures that:

- Chrome browser is installed for Cypress in CI environment
- Built application is served locally during testing
- E2E tests validate the production build before deployment
- Failed tests prevent deployment of broken code

## AWS Architecture

### Backend Services

- **AWS AppSync**: GraphQL API for real-time data synchronization
- **Amazon Cognito**: User authentication and authorization
- **Amazon DynamoDB**: NoSQL database for game state, users, and scores
- **AWS Lambda**: Serverless functions for game logic (dice throwing, scoring,
  turn management)

### Frontend Hosting

- **AWS Amplify Hosting**: Automatic deployments with CI/CD
- **Amazon CloudFront**: Global CDN for fast content delivery
- **Amazon S3**: Static asset storage

### Real-time Features

- **GraphQL Subscriptions**: Live game state updates
- **Optimistic Updates**: Immediate UI responses with backend sync
- **Conflict Resolution**: Handles concurrent player actions

## Game Architecture

### Core Components

- **Lobby Component**: Game discovery and joining interface
- **Game Component**: Main gameplay interface with 3D dice
- **Authentication**: Amplify Authenticator integration
- **User Service**: User management and profile handling
- **Games Service**: Game state management and API interactions

### 3D Dice System

- **Three.js Scene**: 3D rendering of dice and game environment
- **Physics Simulation**: Realistic dice rolling using cannon-es
- **Animation System**: Smooth dice throwing and settling animations
- **Result Detection**: Automatic face value detection after dice settle

## Deployment

The application is automatically deployed to AWS Amplify Hosting:

1. **Automatic Deployment**: Push to the main branch triggers deployment
2. **Environment Configuration**: Production settings applied automatically
3. **Backend Provisioning**: AWS resources created/updated as needed
4. **Frontend Distribution**: Static files deployed to global CDN

### Manual Deployment

```bash
# Deploy backend changes
npx ampx pipeline-deploy --branch main --app-id <your-app-id>

# Deploy frontend (handled automatically by Amplify Hosting)
npm run build
```

## Code Quality & Linting

This project enforces code quality through comprehensive linting and formatting
tools:

### Tools Used

- **ESLint**: TypeScript and Angular-specific linting with strict rules
- **Prettier**: Consistent code formatting across all file types
- **Husky**: Git hooks for automated quality checks
- **lint-staged**: Runs linting only on staged files for faster commits

### Available Commands

```bash
# Lint all TypeScript and template files
npm run lint

# Auto-fix linting issues where possible
npm run lint:fix

# Format all code files with Prettier
npm run format

# Check if files are properly formatted
npm run format:check

# Run both linting and format checking
npm run code-quality

# Auto-fix linting and format all files
npm run code-quality:fix
```

### Pre-commit Hooks

The project automatically runs code quality checks before each commit:

- Lints and formats only the files you're committing
- Prevents commits with linting errors
- Ensures consistent code style across the team

### IDE Integration

VS Code is configured to:

- Auto-format files on save
- Show linting errors in real-time
- Auto-fix issues when possible
- Organize imports automatically

Install the recommended extensions for the best experience:

- ESLint extension
- Prettier extension
- Angular Language Service

### CI/CD Integration

The build pipeline includes code quality checks:

- Linting and formatting verification before build
- Build fails if code quality standards aren't met
- Ensures only properly formatted, linted code reaches production

### Linting Rules Summary

**TypeScript/JavaScript:**

- Enforces modern ES6+ patterns
- Requires explicit typing where beneficial
- Prevents common code smells and bugs
- Limits function complexity and nesting depth

**Angular-specific:**

- Enforces Angular style guide conventions
- Validates component/directive naming patterns
- Ensures proper lifecycle implementation
- Accessibility checks for templates

**Templates:**

- Accessibility compliance (ARIA, alt text, etc.)
- Semantic HTML validation
- Angular template best practices

## Contributing

### Development Workflow

1. Create feature branch from `main`
2. Develop and test locally using `npm start`
3. Run E2E tests with `npm run test:e2e`
4. Push branch and create pull request
5. CI/CD pipeline runs tests automatically
6. Merge after approval and passing tests

### Testing Guidelines

- Write E2E tests for new user-facing features
- Focus on happy path scenarios and error handling
- Mock external services at the network level, not the module level
- Ensure tests work in both local and CI environments

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more
information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
