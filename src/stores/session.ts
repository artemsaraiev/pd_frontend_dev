import { defineStore } from 'pinia';

export const useSessionStore = defineStore('session', {
  state: () => ({
    userId: (localStorage.getItem('userId') || '') as string,
    token: (localStorage.getItem('token') || '') as string,
  }),
  actions: {
    setSession(userId: string, token: string) {
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


