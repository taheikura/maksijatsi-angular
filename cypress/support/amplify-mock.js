// Amplify mock helper for Cypress tests

export const mockAmplifyModule = () => {
  const mockAmplify = {
    configure: () => {},
    getConfig: () => ({
      Auth: {
        Cognito: {
          userPoolId: 'test-pool-id',
          userPoolClientId: 'test-client-id',
          region: 'us-east-1',
        },
      },
      API: {
        GraphQL: {
          endpoint: 'https://mock-endpoint.com/graphql',
          region: 'us-east-1',
        },
      },
    }),
    Auth: {
      signIn: () =>
        Promise.resolve({
          isSignedIn: true,
          nextStep: { signInStep: 'DONE' },
        }),
      getCurrentUser: () =>
        Promise.resolve({
          username: 'test-user',
          userId: 'test-user-id',
        }),
      fetchUserAttributes: () =>
        Promise.resolve({
          email: 'test@example.com',
          name: 'Test User',
        }),
    },
  };

  const mockGenerateClient = () => ({
    graphql: () => Promise.resolve({ data: {} }),
    models: {
      Game: {
        list: () => Promise.resolve({ data: [], nextToken: null }),
        create: () => Promise.resolve({ data: { id: 'test-game-id' } }),
        update: () => Promise.resolve({ data: { id: 'test-game-id' } }),
        delete: () => Promise.resolve({ data: { id: 'test-game-id' } }),
      },
    },
    queries: {},
    mutations: {},
    subscriptions: {},
  });

  return { mockAmplify, mockGenerateClient };
};

export const setupAmplifyMocks = (win) => {
  const { mockAmplify, mockGenerateClient } = mockAmplifyModule();

  // Set global mocks
  win.Amplify = mockAmplify;
  win.generateClient = mockGenerateClient;

  // Override the entire aws-amplify module space
  if (!win.__amplifyModules) {
    win.__amplifyModules = {};
  }

  win.__amplifyModules['aws-amplify'] = mockAmplify;
  win.__amplifyModules['aws-amplify/data'] = { generateClient: mockGenerateClient };
  win.__amplifyModules['aws-amplify/auth'] = mockAmplify.Auth;

  return { mockAmplify, mockGenerateClient };
};
