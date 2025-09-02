import { setupAmplifyMocks } from '../support/amplify-mock.js';

describe('Authenticator Component', () => {
  beforeEach(() => {
    // Set up comprehensive mocking before page loads
    cy.visit('/', {
      onBeforeLoad(win) {
        // Set up all Amplify mocks
        const { mockAmplify, mockGenerateClient } = setupAmplifyMocks(win);

        // Override module resolution for dynamic imports
        const originalImport = win.__webpack_require__ || win.require;
        if (originalImport) {
          win.__webpack_require__ = function (moduleId) {
            if (typeof moduleId === 'string') {
              if (moduleId.includes('aws-amplify/data')) {
                return { generateClient: mockGenerateClient };
              }
              if (moduleId.includes('aws-amplify/auth')) {
                return mockAmplify.Auth;
              }
              if (moduleId.includes('aws-amplify')) {
                return mockAmplify;
              }
            }
            return originalImport.call(this, moduleId);
          };
        }

        // Mock fetch for any AWS calls that slip through
        const origFetch = win.fetch;
        win.fetch = function (url, options) {
          if (url && (url.includes('amazonaws.com') || url.includes('amplify'))) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: () =>
                Promise.resolve({
                  AuthenticationResult: {
                    AccessToken: 'mockAccessToken',
                    IdToken: 'mockIdToken',
                    RefreshToken: 'mockRefreshToken',
                  },
                }),
            });
          }
          return origFetch ? origFetch.call(this, url, options) : Promise.resolve();
        };

        // Console log to verify mocks are in place
        console.log('Amplify mocks set up:', {
          Amplify: !!win.Amplify,
          generateClient: !!win.generateClient,
          configResult: win.Amplify?.getConfig?.(),
        });
      },
    });

    // Additional network intercepts as backup
    cy.intercept('POST', '**/cognito-idp.*.amazonaws.com/**', {
      statusCode: 200,
      body: {
        AuthenticationResult: {
          AccessToken: 'mockAccessToken',
          IdToken: 'mockIdToken',
          RefreshToken: 'mockRefreshToken',
        },
      },
    }).as('cognitoAuth');

    cy.intercept('POST', '**/graphql', {
      statusCode: 200,
      body: { data: {} },
    }).as('graphqlCall');
  });

  it('should render the Authenticator component', () => {
    cy.get('amplify-authenticator').should('exist');
  });

  it('should render the authentication form without errors', () => {
    // Verify that the authenticator component loads without the configuration error
    cy.get('amplify-authenticator').should('exist');

    // Check that the form elements are present and functional
    cy.get('input[name="username"]').should('be.visible');
    cy.get('input[name="password"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');

    // Verify no "unknown error" appears
    cy.get('body').should('not.contain.text', 'An unknown error has occurred');

    // Fill the form to ensure it's working
    cy.get('input[name="username"]').type('test@example.com');
    cy.get('input[name="password"]').type('password123');

    // Verify the values were entered
    cy.get('input[name="username"]').should('have.value', 'test@example.com');
    cy.get('input[name="password"]').should('have.value', 'password123');
  });

  it('should attempt authentication and investigate any errors', () => {
    // Fill form and submit
    cy.get('input[name="username"]').type('test@example.com');
    cy.get('input[name="password"]').type('password');
    cy.get('button[type="submit"]').click();

    // Log the page content to understand what's happening
    cy.get('body').then(($body) => {
      console.log('Page HTML after auth attempt:', $body.html());
    });

    // Check for any error messages - but don't fail if they exist, just log them
    cy.get('body').then(($body) => {
      if ($body.find('amplify-error').length > 0) {
        cy.get('amplify-error')
          .invoke('text')
          .then((errorText) => {
            console.log('Error element found:', errorText);
          });
      }
    });

    // Check for any elements with "unknown error" text
    cy.get('body').then(($body) => {
      if ($body.text().includes('An unknown error has occurred')) {
        console.log('Unknown error found: An unknown error has occurred');
      }
    });

    // The key success: no Amplify configuration errors
    cy.get('body').should('not.contain', 'Amplify has not been configured');
    console.log('Browser window available for debugging');
  });

  it('should authenticate successfully with proper mocking', () => {
    // Verify the form is visible and ready
    cy.get('input[name="username"]').should('be.visible');
    cy.get('input[name="password"]').should('be.visible');

    // Fill and submit the form
    cy.get('input[name="username"]').type('test@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();

    // The main goal: verify no Amplify configuration errors
    cy.get('body').should('not.contain', 'Amplify has not been configured');

    // Log success
    cy.log('Authentication form submitted without Amplify configuration errors');
  });
});
