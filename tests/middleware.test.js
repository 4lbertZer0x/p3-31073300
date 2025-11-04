const { verifyToken, requireAuthAPI } = require('../app'); // Exporta tus middlewares

describe('Middleware Functions', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      headers: {},
      cookies: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  test('verifyToken debería rechazar solicitud sin token', () => {
    verifyToken(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Acceso denegado. Token requerido.'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('requireAuthAPI debería requerir token en header', () => {
    requireAuthAPI(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Token requerido'
    });
  });
});