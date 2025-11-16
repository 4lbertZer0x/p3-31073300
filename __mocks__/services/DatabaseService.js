// Manual mock for services/DatabaseService used by Jest tests

const mockUser = {
  id: 1,
  username: 'admin',
  email: 'admin@test.com',
  role: 'admin',
  verifyPassword: jest.fn().mockResolvedValue(true)
};

module.exports = {
  initialize: jest.fn().mockResolvedValue(true),
  ensureTestUsers: jest.fn().mockResolvedValue({ adminCreated: false, userCreated: false }),
  getUserByUsername: jest.fn().mockResolvedValue(mockUser),
  getUserById: jest.fn().mockResolvedValue(mockUser),
  getAllReviews: jest.fn().mockResolvedValue([
    { id: 1, title: 'Test Review', content: 'Test', username: 'testuser' }
  ]),
  getFeaturedReviews: jest.fn().mockResolvedValue([]),
  getDebugInfo: jest.fn().mockResolvedValue({ database: { usersCount: 2, moviesCount: 5, reviewsCount: 10 } }),
  createUser: jest.fn().mockImplementation(async (data) => ({ id: 2, ...data })),
  getUserCount: jest.fn().mockResolvedValue(2),
  // Minimal model-like mocks used by controllers/tests
  Product: {
    findByPk: jest.fn().mockResolvedValue(null),
    findAndCountAll: jest.fn().mockResolvedValue({ count: 0, rows: [] }),
    create: jest.fn().mockImplementation(async (data) => ({ id: 1, ...data, setTags: jest.fn() }))
  },
  Category: {
    findAll: jest.fn().mockResolvedValue([]),
    findByPk: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation(async (data) => ({ id: 1, ...data }))
  },
  Tag: {
    findAll: jest.fn().mockResolvedValue([]),
    findByPk: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation(async (data) => ({ id: 1, ...data }))
  }
};
