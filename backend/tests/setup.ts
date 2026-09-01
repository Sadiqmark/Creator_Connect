// Stub external network boundary for jwks-rsa in test runner
jest.mock('jwks-rsa', () => {
  return {
    JwksClient: jest.fn().mockImplementation(() => ({
      getSigningKey: jest.fn(),
    })),
  };
});
