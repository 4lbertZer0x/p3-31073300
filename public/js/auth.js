// public/js/auth.js - Manejo de tokens JWT en frontend

class AuthManager {
    constructor() {
        this.token = this.getStoredToken();
    }

    // Obtener token almacenado
    getStoredToken() {
        return localStorage.getItem('authToken') || 
               this.getCookie('token');
    }

    // Obtener cookie
    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    // Almacenar token
    setToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
        // También setear cookie para compatibilidad con EJS
        document.cookie = `token=${token}; path=/; max-age=86400; ${window.location.protocol === 'https:' ? 'secure;' : ''}`;
    }

    // Eliminar token
    clearToken() {
        this.token = null;
        localStorage.removeItem('authToken');
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }

    // Verificar si está autenticado
    isAuthenticated() {
        return !!this.token;
    }

    // Obtener datos del usuario del token
    getUserFromToken() {
        if (!this.token) return null;
        
        try {
            const payload = JSON.parse(atob(this.token.split('.')[1]));
            return {
                id: payload.id,
                username: payload.username,
                email: payload.email,
                role: payload.role
            };
        } catch (error) {
            console.error('Error decoding token:', error);
            return null;
        }
    }

    // Fetch con autenticación
    async authFetch(url, options = {}) {
        const token = this.getStoredToken();
        
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        const response = await fetch(url, options);
        
        // Si el token expiró, limpiar y redirigir
        if (response.status === 401) {
            this.clearToken();
            window.location.href = '/login';
            throw new Error('Token expirado');
        }

        return response;
    }

    // Verificar token con el servidor
    async verifyToken() {
        try {
            const response = await this.authFetch('/api/auth/verify');
            return await response.json();
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }
}

// Instancia global
window.authManager = new AuthManager();

// Interceptor para todas las llamadas fetch
const originalFetch = window.fetch;
window.fetch = async function(resource, options = {}) {
    // Solo agregar token a llamadas a nuestra API
    if (typeof resource === 'string' && resource.startsWith('/api/')) {
        const token = window.authManager.getStoredToken();
        if (token) {
            options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${token}`
            };
        }
    }
    
    return originalFetch(resource, options);
};