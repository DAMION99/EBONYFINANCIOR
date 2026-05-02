class CRMAPI {
    constructor() {
        this.baseURL = window.location.origin;
        this.apiKey = localStorage.getItem('crm_api_key');
    }

    setApiKey(key) {
        this.apiKey = key;
        localStorage.setItem('crm_api_key', key);
    }

    clearApiKey() {
        this.apiKey = null;
        localStorage.removeItem('crm_api_key');
    }

    async request(endpoint, options = {}) {
        const headers = {
            'X-API-Key': this.apiKey,
            ...options.headers
        };

        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        const config = {
            ...options,
            headers
        };

        if (config.body && !(config.body instanceof FormData)) {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, config);

            if (response.status === 401) {
                this.clearApiKey();
                throw new Error('Unauthorized - Invalid API Key');
            }

            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Request failed');
                }
                return data;
            } else {
                return response;
            }
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async testConnection() {
        const response = await this.request('/health');
        return response;
    }

    // Contacts
    async getContacts(limit = 100, offset = 0) {
        return this.request(`/api/contacts?limit=${limit}&offset=${offset}`);
    }

    async getContact(id) {
        return this.request(`/api/contacts/${id}`);
    }

    async createContact(data) {
        return this.request('/api/contacts', {
            method: 'POST',
            body: data
        });
    }

    async updateContact(id, data) {
        return this.request(`/api/contacts/${id}`, {
            method: 'PUT',
            body: data
        });
    }

    async deleteContact(id) {
        return this.request(`/api/contacts/${id}`, {
            method: 'DELETE'
        });
    }

    async searchContacts(query) {
        return this.request(`/api/contacts/search?q=${encodeURIComponent(query)}`);
    }

    async uploadContactPhoto(contactId, file) {
        const formData = new FormData();
        formData.append('photo', file);

        return this.request(`/api/contacts/${contactId}/photo`, {
            method: 'POST',
            body: formData,
            headers: {}
        });
    }

    async deleteContactPhoto(contactId) {
        return this.request(`/api/contacts/${contactId}/photo`, {
            method: 'DELETE'
        });
    }

    // Tags
    async getTags() {
        return this.request('/api/tags');
    }

    async createTag(name, color) {
        return this.request('/api/tags', {
            method: 'POST',
            body: { name, color }
        });
    }

    async getContactsByTag(tagId) {
        return this.request(`/api/tags/${tagId}/contacts`);
    }

    async addTagToContact(contactId, tagId) {
        return this.request(`/api/contacts/${contactId}/tags/${tagId}`, {
            method: 'POST'
        });
    }

    async removeTagFromContact(contactId, tagId) {
        return this.request(`/api/contacts/${contactId}/tags/${tagId}`, {
            method: 'DELETE'
        });
    }

    // Interactions
    async getInteractions(limit = 100) {
        return this.request(`/api/interactions?limit=${limit}`);
    }

    async getContactInteractions(contactId, limit = 50) {
        return this.request(`/api/contacts/${contactId}/interactions?limit=${limit}`);
    }

    async createInteraction(data) {
        return this.request('/api/interactions', {
            method: 'POST',
            body: data
        });
    }

    // Reminders
    async getReminders(limit = 50) {
        return this.request(`/api/reminders?limit=${limit}`);
    }

    async getContactReminders(contactId) {
        return this.request(`/api/contacts/${contactId}/reminders`);
    }

    async createReminder(data) {
        return this.request('/api/reminders', {
            method: 'POST',
            body: data
        });
    }

    async completeReminder(id) {
        return this.request(`/api/reminders/${id}/complete`, {
            method: 'PUT'
        });
    }

    async deleteReminder(id) {
        return this.request(`/api/reminders/${id}`, {
            method: 'DELETE'
        });
    }

    // Import/Export
    async exportCSV() {
        const response = await this.request('/api/export/csv');
        return response.blob();
    }

    async exportVCard() {
        const response = await this.request('/api/export/vcard');
        return response.blob();
    }

    async importCSV(file) {
        const formData = new FormData();
        formData.append('file', file);

        return this.request('/api/import/csv', {
            method: 'POST',
            body: formData,
            headers: {}
        });
    }
}

const api = new CRMAPI();
