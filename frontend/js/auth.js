/**
 * Co-Fleeter Auth Service
 * Uses Backend API
 */

class AuthService {
    constructor() {
        this.currentUser = null;
        this.loadSession();
    }

    async login(email, password) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();

            if (data.success) {
                this.createSession(data.user);
                return { success: true, user: data.user };
            } else {
                return { success: false, message: data.message || 'Login failed' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Network error' };
        }
    }

    async register(newUser) {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });
            const data = await response.json();

            if (data.success) {
                return { success: true, user: data.user };
            } else {
                return { success: false, message: data.message || 'Registration failed' };
            }
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, message: 'Network error' };
        }
    }

    logout() {
        this.currentUser = null;
        sessionStorage.removeItem('cofleeter_user');
        // Optional: Notify backend
        window.location.href = 'index.html';
    }

    createSession(user) {
        this.currentUser = user;
        sessionStorage.setItem('cofleeter_user', JSON.stringify(user));
    }

    loadSession() {
        const stored = sessionStorage.getItem('cofleeter_user');
        if (stored) {
            this.currentUser = JSON.parse(stored);
        }
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    isAdmin() {
        return this.currentUser && this.currentUser.role === 'ADMIN';
    }

    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'index.html';
        }
    }

    redirectIfLoggedIn() {
        if (this.isAuthenticated()) {
            window.location.href = 'dashboard.html';
        }
    }
}

const auth = new AuthService();
