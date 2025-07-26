// Database API configuration using Flask backend
const API_BASE = window.location.origin + '/api';

// Database service that connects to our Flask backend
class DatabaseService {
    // Users table operations
    static async createUser(userData) {
        try {
            const response = await fetch(`${API_BASE}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                return { data: null, error: result.error };
            }
            
            return { data: { id: result.user_id, ...userData }, error: null };
        } catch (error) {
            console.error('Error creating user:', error);
            return { data: null, error: error.message };
        }
    }

    static async getUserByEmail(email) {
        try {
            const response = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password: 'dummy' }) // We'll modify this approach
            });
            
            if (!response.ok) {
                return { data: null, error: 'User not found' };
            }
            
            const result = await response.json();
            return { data: result.user, error: null };
        } catch (error) {
            console.error('Error getting user:', error);
            return { data: null, error: error.message };
        }
    }

    static async loginUser(email, password) {
        try {
            const response = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                return { data: null, error: result.error };
            }
            
            return { data: result.user, error: null };
        } catch (error) {
            console.error('Error logging in:', error);
            return { data: null, error: error.message };
        }
    }

    static async updateUserVerification(userId, status) {
        try {
            const response = await fetch(`${API_BASE}/users/${userId}/verify`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                return { data: null, error: result.error };
            }
            
            return { data: result, error: null };
        } catch (error) {
            console.error('Error updating verification:', error);
            return { data: null, error: error.message };
        }
    }

    static async getAllUsers() {
        try {
            const response = await fetch(`${API_BASE}/users`);
            const result = await response.json();
            
            if (!response.ok) {
                return { data: null, error: result.error };
            }
            
            return { data: result.data, error: null };
        } catch (error) {
            console.error('Error getting all users:', error);
            return { data: null, error: error.message };
        }
    }

    static async getUnverifiedMitra() {
        try {
            const response = await fetch(`${API_BASE}/mitra/unverified`);
            const result = await response.json();
            
            if (!response.ok) {
                return { data: null, error: result.error };
            }
            
            return { data: result.data, error: null };
        } catch (error) {
            console.error('Error getting unverified mitra:', error);
            return { data: null, error: error.message };
        }
    }

    static async getVerifiedMitra() {
        try {
            const response = await fetch(`${API_BASE}/mitra/verified`);
            const result = await response.json();
            
            if (!response.ok) {
                return { data: null, error: result.error };
            }
            
            return { data: result.data, error: null };
        } catch (error) {
            console.error('Error getting verified mitra:', error);
            return { data: null, error: error.message };
        }
    }

    // Pesanan operations
    static async createPesanan(pesananData) {
        try {
            const response = await fetch(`${API_BASE}/pesanan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(pesananData)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                return { data: null, error: result.error };
            }
            
            return { data: { id: result.pesanan_id, ...pesananData }, error: null };
        } catch (error) {
            console.error('Error creating pesanan:', error);
            return { data: null, error: error.message };
        }
    }

    static async getPesananByUser(userId) {
        try {
            const response = await fetch(`${API_BASE}/pesanan/user/${userId}`);
            const result = await response.json();
            
            if (!response.ok) {
                return { data: null, error: result.error };
            }
            
            return { data: result.data, error: null };
        } catch (error) {
            console.error('Error getting user pesanan:', error);
            return { data: null, error: error.message };
        }
    }

    static async getPesananByMitra(mitraId) {
        try {
            const response = await fetch(`${API_BASE}/pesanan/mitra/${mitraId}`);
            const result = await response.json();
            
            if (!response.ok) {
                return { data: null, error: result.error };
            }
            
            return { data: result.data, error: null };
        } catch (error) {
            console.error('Error getting mitra pesanan:', error);
            return { data: null, error: error.message };
        }
    }

    static async getAllPesanan() {
        try {
            const { data: users } = await this.getAllUsers();
            if (!users) return { data: [], error: null };
            
            // Get pesanan for all users and mitra
            const allPesanan = [];
            for (const user of users) {
                if (user.role === 'user') {
                    const { data: userPesanan } = await this.getPesananByUser(user.id);
                    if (userPesanan) allPesanan.push(...userPesanan);
                }
            }
            
            return { data: allPesanan, error: null };
        } catch (error) {
            console.error('Error getting all pesanan:', error);
            return { data: null, error: error.message };
        }
    }

    static async updatePesananStatus(pesananId, status) {
        try {
            const response = await fetch(`${API_BASE}/pesanan/${pesananId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                return { data: null, error: result.error };
            }
            
            return { data: { id: pesananId, status }, error: null };
        } catch (error) {
            console.error('Error updating pesanan status:', error);
            return { data: null, error: error.message };
        }
    }

    static async createSaldoTransaction(transactionData) {
        // TODO: Implement in backend
        return { data: { id: Date.now(), ...transactionData }, error: null };
    }

    static async getSaldoByUser(userId) {
        // TODO: Implement in backend
        return { data: { transactions: [], balance: 0 }, error: null };
    }

    static async getPendingTopups() {
        // TODO: Implement in backend
        return { data: [], error: null };
    }

    static async updateSaldoStatus(saldoId, status) {
        // TODO: Implement in backend
        return { data: { id: saldoId, status }, error: null };
    }

    static async sendMessage(messageData) {
        // TODO: Implement in backend
        return { data: { id: Date.now(), ...messageData }, error: null };
    }

    static async getChatHistory(userId1, userId2) {
        // TODO: Implement in backend
        return { data: [], error: null };
    }

    static async getChatList(userId) {
        // TODO: Implement in backend
        return { data: [], error: null };
    }

    // Real-time subscriptions (mock for now)
    static subscribeToChats(userId, callback) {
        return { unsubscribe: () => {} };
    }

    static subscribeToUserPesanan(userId, callback) {
        return { unsubscribe: () => {} };
    }

    static subscribeToMitraPesanan(mitraId, callback) {
        return { unsubscribe: () => {} };
    }
}

// Export for use in other files
window.DatabaseService = DatabaseService;
