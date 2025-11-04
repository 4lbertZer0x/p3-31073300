// Mock manual de DatabaseService
jest.mock('../services/DatabaseService', () => {
  return {
    initialize: jest.fn().mockResolvedValue(true),
    getUserByUsername: jest.fn().mockResolvedValue({
      id: 1,
      username: 'admin',
      email: 'admin@test.com',
      role: 'admin',
      verifyPassword: jest.fn().mockResolvedValue(true)
    }),
    getAllReviews: jest.fn().mockResolvedValue([
      {
        id: 1,
        title: 'Test Review',
        content: 'Test content',
        rating: 5,
        movie_title: 'Test Movie',
        username: 'testuser'
      }
    ]),
    getDebugInfo: jest.fn().mockResolvedValue({
      database: {
        usersCount: 2,
        moviesCount: 5,
        reviewsCount: 10
      }
    })
  };
});

// Configuración global
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';