import { defineStore } from 'pinia';
export const useSessionStore = defineStore('session', {
    state: () => ({
        userId: (localStorage.getItem('userId') || ''),
        token: (localStorage.getItem('token') || ''),
    }),
    actions: {
        setSession(userId, token) {
            this.userId = userId;
            this.token = token;
            localStorage.setItem('userId', userId);
            localStorage.setItem('token', token);
        },
        clear() {
            this.userId = '';
            this.token = '';
            localStorage.removeItem('userId');
            localStorage.removeItem('token');
        }
    }
});
