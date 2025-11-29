const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

class ApiService {
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        }

        try {
            const response = await fetch(url, config)

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Request failed' }))
                throw new Error(error.message || error.error || 'Request failed')
            }

            // 204 No Content
            if (response.status === 204) {
                return null
            }

            return await response.json()
        } catch (error) {
            console.error('API Error:', error)
            throw error
        }
    }

    // Projects
    async getProjects() {
        return this.request('/projects')
    }

    async getProject(id) {
        return this.request(`/projects/${id}`)
    }

    async createProject(data) {
        return this.request('/projects', {
            method: 'POST',
            body: JSON.stringify(data),
        })
    }

    async updateProject(id, data) {
        return this.request(`/projects/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        })
    }

    async deleteProject(id) {
        return this.request(`/projects/${id}`, {
            method: 'DELETE',
        })
    }

    // Contacts
    async getContacts() {
        return this.request('/contacts')
    }

    // Users
    async getUsers() {
        return this.request('/users')
    }

    async getUser(id) {
        return this.request(`/users/${id}`)
    }

    async createUser(data) {
        return this.request('/users', {
            method: 'POST',
            body: JSON.stringify(data),
        })
    }

    async updateUser(id, data) {
        return this.request(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        })
    }

    async deleteUser(id) {
        return this.request(`/users/${id}`, {
            method: 'DELETE',
        })
    }

    async updateUserPassword(id, newPassword) {
        return this.request(`/users/${id}/password`, {
            method: 'PUT',
            body: JSON.stringify({ newPassword }),
        })
    }

    // Notifications
    async getNotifications(userId) {
        return this.request(`/notifications?userId=${userId}`)
    }

    async markNotificationsAsRead(userId, notificationIds = null) {
        return this.request('/notifications', {
            method: 'PUT',
            body: JSON.stringify({ userId, notificationIds }),
        })
    }
}

export const apiService = new ApiService()
export default apiService


