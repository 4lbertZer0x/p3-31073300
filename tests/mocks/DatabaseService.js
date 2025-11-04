// Mock completo de DatabaseService
const DatabaseService = {
  // Métodos de inicialización
  initialize: jest.fn().mockResolvedValue(true),
  initializeDatabase: jest.fn().mockResolvedValue(true),
  
  // Métodos de usuarios
  getUserByUsername: jest.fn().mockImplementation((username) => {
    if (username === 'admin') {
      return Promise.resolve({
        id: 1,
        username: 'admin',
        email: 'admin@test.com',
        role: 'admin',
        verifyPassword: jest.fn().mockResolvedValue(true)
      });
    }
    return Promise.resolve(null);
  }),
  
  getUserById: jest.fn().mockResolvedValue({
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    role: 'user'
  }),
  
  createUser: jest.fn().mockImplementation((userData) => {
    return Promise.resolve({
      id: 2,
      username: userData.username,
      email: userData.email,
      role: userData.role || 'user'
    });
  }),
  
  getAllUsers: jest.fn().mockResolvedValue([
    {
      id: 1,
      username: 'admin',
      email: 'admin@test.com',
      role: 'admin'
    },
    {
      id: 2,
      username: 'usuario',
      email: 'usuario@test.com',
      role: 'user'
    }
  ]),
  
  // Métodos de reseñas
  getAllReviews: jest.fn().mockResolvedValue([
    {
      id: 1,
      title: 'Test Review',
      content: 'Test content',
      rating: 5,
      movie_title: 'Test Movie',
      username: 'testuser',
      is_featured: false,
      created_at: new Date()
    }
  ]),
  
  getFeaturedReviews: jest.fn().mockResolvedValue([]),
  
  createReview: jest.fn().mockImplementation((reviewData) => {
    return Promise.resolve({
      id: 1,
      ...reviewData,
      username: 'testuser',
      created_at: new Date()
    });
  }),
  
  // Métodos de películas
  getAllMovies: jest.fn().mockResolvedValue([
    {
      id: 1,
      title: 'Test Movie',
      year: '2023',
      genre: 'Action',
      type: 'movie'
    }
  ]),
  
  // Métodos de debug
  getDebugInfo: jest.fn().mockResolvedValue({
    database: {
      usersCount: 2,
      moviesCount: 5,
      reviewsCount: 10
    }
  }),
  
  getUserCount: jest.fn().mockResolvedValue(2)
};

module.exports = DatabaseService;