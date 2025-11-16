// Configuración global
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

// Nota: No auto-moqueamos DatabaseService aquí porque algunos tests requieren
// la implementación real. Los tests individuales deben mockearlo explícitamente
// cuando sea necesario.