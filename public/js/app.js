let contacts = [];
let allContacts = [];
let interactions = [];
let reminders = [];
let tags = [];
let photoFilter = 'all';

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    if (api.apiKey) {
        try {
            await api.testConnection();
            showAppPage();
            await loadAllData();
        } catch (error) {
            showLoginPage();
        }
    } else {
        showLoginPage();
    }

    setupEventListeners();
});

function setupEventListeners() {
    // Login
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            navigateToPage(page);
        });
    });

    // Contacts
    document.getElementById('add-contact-btn').addEventListener('click', () => openContactModal());
    document.getElementById('contact-form').addEventListener('submit', handleContactSubmit);
    document.getElementById('contact-search').addEventListener('input', handleContactSearch);

    // Interactions
    document.getElementById('add-interaction-btn').addEventListener('click', () => openInteractionModal());
    document.getElementById('interaction-form').addEventListener('submit', handleInteractionSubmit);

    // Reminders
    document.getElementById('add-reminder-btn').addEventListener('click', () => openReminderModal());
    document.getElementById('reminder-form').addEventListener('submit', handleReminderSubmit);

    // Import/Export
    document.getElementById('export-csv-btn').addEventListener('click', handleExportCSV);
    document.getElementById('export-vcard-btn').addEventListener('click', handleExportVCard);
    document.getElementById('import-csv-btn').addEventListener('click', () => {
        document.getElementById('import-csv-input').click();
    });
    document.getElementById('import-csv-input').addEventListener('change', handleImportCSV);
    document.getElementById('import-vcard-btn').addEventListener('click', () => {
        document.getElementById('import-vcard-input').click();
    });
    document.getElementById('import-vcard-input').addEventListener('change', handleImportVCard);
}

// Authentication
async function handleLogin(e) {
    e.preventDefault();
    const apiKey = document.getElementById('api-key-input').value;
    const errorEl = document.getElementById('login-error');

    try {
        api.setApiKey(apiKey);
        await api.testConnection();
        showAppPage();
        await loadAllData();
    } catch (error) {
        errorEl.textContent = 'Invalid API key. Please try again.';
        api.clearApiKey();
    }
}

function handleLogout() {
    api.clearApiKey();
    showLoginPage();
}

function showLoginPage() {
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('app-page').classList.add('hidden');
}

function showAppPage() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('app-page').classList.remove('hidden');
}

// Navigation
function navigateToPage(page) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-page="${page}"]`).classList.add('active');

    document.querySelectorAll('.content-page').forEach(contentPage => {
        contentPage.classList.remove('active');
    });
    document.getElementById(`${page}-page`).classList.add('active');

    if (page === 'interactions') loadInteractions();
    if (page === 'reminders') loadReminders();
    if (page === 'tags') loadTags();
}

// Load data
async function loadAllData() {
    await Promise.all([
        loadContacts(),
        loadInteractions(),
        loadReminders(),
        loadTags()
    ]);
}

async function loadContacts() {
    try {
        const response = await api.getContacts();
        contacts = response.data;
        allContacts = [...contacts];
        applyFilters();
    } catch (error) {
        console.error('Failed to load contacts:', error);
    }
}

async function loadInteractions() {
    try {
        const response = await api.getInteractions();
        interactions = response.data;
        renderInteractions(interactions);
    } catch (error) {
        console.error('Failed to load interactions:', error);
    }
}

async function loadReminders() {
    try {
        const response = await api.getReminders();
        reminders = response.data;
        renderReminders(reminders);
    } catch (error) {
        console.error('Failed to load reminders:', error);
    }
}

async function loadTags() {
    try {
        const response = await api.getTags();
        tags = response.data;
        renderTags(tags);
    } catch (error) {
        console.error('Failed to load tags:', error);
    }
}

// Render functions
function renderContacts(contactsList) {
    const grid = document.getElementById('contacts-grid');

    if (contactsList.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">👥</div>
                <p>No contacts found</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = contactsList.map(contact => `
        <div class="contact-card" onclick="editContact(${contact.id})">
            <div class="contact-header">
                <div class="contact-photo">
                    ${contact.photo_url
                        ? `<img src="${contact.photo_url}" alt="${contact.first_name}">`
                        : getInitials(contact.first_name, contact.last_name)
                    }
                </div>
                <div class="contact-info">
                    <h3>${contact.first_name} ${contact.last_name || ''}</h3>
                    ${contact.company ? `<div class="contact-company">${contact.company}</div>` : ''}
                </div>
            </div>
            <div class="contact-details">
                ${contact.email ? `<div class="contact-detail">📧 ${contact.email}</div>` : ''}
                ${contact.phone ? `<div class="contact-detail">📱 ${contact.phone}</div>` : ''}
                ${contact.job_title ? `<div class="contact-detail">💼 ${contact.job_title}</div>` : ''}
            </div>
            ${contact.tags && contact.tags.length > 0 ? `
                <div class="contact-tags">
                    ${contact.tags.map(tag => `<span class="tag">${tag.name}</span>`).join('')}
                </div>
            ` : ''}
            <div class="contact-actions" onclick="event.stopPropagation()">
                <button class="btn btn-small btn-secondary" onclick="viewContactDetails(${contact.id})">View Details</button>
                <button class="btn btn-small btn-danger" onclick="deleteContactConfirm(${contact.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

function renderInteractions(interactionsList) {
    const container = document.getElementById('interactions-list');

    if (interactionsList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <p>No interactions logged</p>
            </div>
        `;
        return;
    }

    container.innerHTML = interactionsList.map(interaction => `
        <div class="list-item">
            <div class="list-item-header">
                <div>
                    <div class="list-item-title">
                        ${getInteractionIcon(interaction.type)} ${interaction.title || interaction.type}
                    </div>
                    <div class="list-item-meta">
                        ${interaction.first_name} ${interaction.last_name || ''} • ${formatDate(interaction.interaction_date)}
                    </div>
                </div>
            </div>
            ${interaction.notes ? `<div class="list-item-content">${interaction.notes}</div>` : ''}
        </div>
    `).join('');
}

function renderReminders(remindersList) {
    const container = document.getElementById('reminders-list');

    if (remindersList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⏰</div>
                <p>No upcoming reminders</p>
            </div>
        `;
        return;
    }

    container.innerHTML = remindersList.map(reminder => `
        <div class="list-item">
            <div class="list-item-header">
                <div>
                    <div class="list-item-title">⏰ ${reminder.title}</div>
                    <div class="list-item-meta">
                        ${reminder.first_name} ${reminder.last_name || ''} • ${formatDate(reminder.reminder_date)}
                    </div>
                </div>
                <div class="button-group">
                    <button class="btn btn-small btn-secondary" onclick="completeReminderAction(${reminder.id})">Complete</button>
                    <button class="btn btn-small btn-danger" onclick="deleteReminderAction(${reminder.id})">Delete</button>
                </div>
            </div>
            ${reminder.notes ? `<div class="list-item-content">${reminder.notes}</div>` : ''}
        </div>
    `).join('');
}

function renderTags(tagsList) {
    const grid = document.getElementById('tags-grid');

    if (tagsList.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">🏷️</div>
                <p>No tags created</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = tagsList.map(tag => `
        <div class="tag-card">
            <div class="tag-color" style="background: ${tag.color}"></div>
            <div class="tag-name">${tag.name}</div>
        </div>
    `).join('');
}

// Contact modal
function openContactModal(contact = null) {
    const modal = document.getElementById('contact-modal');
    const title = document.getElementById('contact-modal-title');

    if (contact) {
        title.textContent = 'Edit Contact';
        document.getElementById('contact-id').value = contact.id;
        document.getElementById('contact-first-name').value = contact.first_name;
        document.getElementById('contact-last-name').value = contact.last_name || '';
        document.getElementById('contact-email').value = contact.email || '';
        document.getElementById('contact-phone').value = contact.phone || '';
        document.getElementById('contact-company').value = contact.company || '';
        document.getElementById('contact-job-title').value = contact.job_title || '';
        document.getElementById('contact-notes').value = contact.notes || '';
    } else {
        title.textContent = 'Add Contact';
        document.getElementById('contact-form').reset();
        document.getElementById('contact-id').value = '';
    }

    modal.classList.remove('hidden');
}

function closeContactModal() {
    document.getElementById('contact-modal').classList.add('hidden');
    document.getElementById('contact-form').reset();
}

async function handleContactSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('contact-id').value;
    const photoFile = document.getElementById('contact-photo').files[0];

    const data = {
        first_name: document.getElementById('contact-first-name').value,
        last_name: document.getElementById('contact-last-name').value,
        email: document.getElementById('contact-email').value,
        phone: document.getElementById('contact-phone').value,
        company: document.getElementById('contact-company').value,
        job_title: document.getElementById('contact-job-title').value,
        notes: document.getElementById('contact-notes').value
    };

    try {
        let contact;
        if (id) {
            contact = await api.updateContact(id, data);
        } else {
            contact = await api.createContact(data);
        }

        if (photoFile && contact.data.id) {
            await api.uploadContactPhoto(contact.data.id, photoFile);
        }

        closeContactModal();
        await loadContacts();
    } catch (error) {
        alert('Failed to save contact: ' + error.message);
    }
}

async function editContact(id) {
    try {
        const response = await api.getContact(id);
        openContactModal(response.data);
    } catch (error) {
        alert('Failed to load contact: ' + error.message);
    }
}

async function deleteContactConfirm(id) {
    if (confirm('Are you sure you want to delete this contact?')) {
        try {
            await api.deleteContact(id);
            await loadContacts();
        } catch (error) {
            alert('Failed to delete contact: ' + error.message);
        }
    }
}

function viewContactDetails(id) {
    editContact(id);
}

// Photo filter
function setPhotoFilter(filter) {
    photoFilter = filter;
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.filter === filter);
    });
    applyFilters();
}

function applyFilters() {
    const query = document.getElementById('contact-search').value.toLowerCase().trim();
    let filtered = [...allContacts];

    if (photoFilter === 'with-photo') {
        filtered = filtered.filter(c => c.photo_url);
    } else if (photoFilter === 'no-photo') {
        filtered = filtered.filter(c => !c.photo_url);
    }

    if (query) {
        filtered = filtered.filter(contact => {
            const searchStr = `${contact.first_name} ${contact.last_name} ${contact.email} ${contact.phone} ${contact.company}`.toLowerCase();
            return searchStr.includes(query);
        });
    }

    const withPhoto = allContacts.filter(c => c.photo_url).length;
    const countEl = document.getElementById('contacts-count');
    if (countEl) {
        countEl.textContent = `${allContacts.length} total · ${withPhoto} with photo · ${allContacts.length - withPhoto} without`;
    }

    renderContacts(filtered);
}

// Search
function handleContactSearch(e) {
    applyFilters();
}

// Interaction modal
async function openInteractionModal() {
    const modal = document.getElementById('interaction-modal');
    const select = document.getElementById('interaction-contact');

    select.innerHTML = '<option value="">Select a contact...</option>' +
        allContacts.map(c => `<option value="${c.id}">${c.first_name} ${c.last_name || ''}</option>`).join('');

    modal.classList.remove('hidden');
}

function closeInteractionModal() {
    document.getElementById('interaction-modal').classList.add('hidden');
    document.getElementById('interaction-form').reset();
}

async function handleInteractionSubmit(e) {
    e.preventDefault();

    const data = {
        contact_id: parseInt(document.getElementById('interaction-contact').value),
        type: document.getElementById('interaction-type').value,
        title: document.getElementById('interaction-title').value,
        notes: document.getElementById('interaction-notes').value
    };

    try {
        await api.createInteraction(data);
        closeInteractionModal();
        await loadInteractions();
    } catch (error) {
        alert('Failed to save interaction: ' + error.message);
    }
}

// Reminder modal
async function openReminderModal() {
    const modal = document.getElementById('reminder-modal');
    const select = document.getElementById('reminder-contact');

    select.innerHTML = '<option value="">Select a contact...</option>' +
        allContacts.map(c => `<option value="${c.id}">${c.first_name} ${c.last_name || ''}</option>`).join('');

    modal.classList.remove('hidden');
}

function closeReminderModal() {
    document.getElementById('reminder-modal').classList.add('hidden');
    document.getElementById('reminder-form').reset();
}

async function handleReminderSubmit(e) {
    e.preventDefault();

    const dateValue = document.getElementById('reminder-date').value;
    const reminderDate = new Date(dateValue).toISOString();

    const data = {
        contact_id: parseInt(document.getElementById('reminder-contact').value),
        title: document.getElementById('reminder-title').value,
        notes: document.getElementById('reminder-notes').value,
        reminder_date: reminderDate
    };

    try {
        await api.createReminder(data);
        closeReminderModal();
        await loadReminders();
    } catch (error) {
        alert('Failed to save reminder: ' + error.message);
    }
}

async function completeReminderAction(id) {
    try {
        await api.completeReminder(id);
        await loadReminders();
    } catch (error) {
        alert('Failed to complete reminder: ' + error.message);
    }
}

async function deleteReminderAction(id) {
    if (confirm('Are you sure you want to delete this reminder?')) {
        try {
            await api.deleteReminder(id);
            await loadReminders();
        } catch (error) {
            alert('Failed to delete reminder: ' + error.message);
        }
    }
}

// Import/Export
async function handleExportCSV() {
    try {
        const blob = await api.exportCSV();
        downloadBlob(blob, 'contacts.csv');
    } catch (error) {
        alert('Failed to export CSV: ' + error.message);
    }
}

async function handleExportVCard() {
    try {
        const blob = await api.exportVCard();
        downloadBlob(blob, 'contacts.vcf');
    } catch (error) {
        alert('Failed to export vCard: ' + error.message);
    }
}

async function handleImportVCard(e) {
    const file = e.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById('import-vcard-status');

    try {
        statusEl.textContent = 'Importing...';
        statusEl.className = 'status-message';

        const result = await api.importVCard(file);

        statusEl.textContent = result.message;
        statusEl.className = 'status-message success';

        await loadContacts();

        setTimeout(() => {
            statusEl.textContent = '';
            statusEl.className = 'status-message';
        }, 5000);
    } catch (error) {
        statusEl.textContent = 'Failed to import: ' + error.message;
        statusEl.className = 'status-message error';
    }

    e.target.value = '';
}

async function handleImportCSV(e) {
    const file = e.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById('import-status');

    try {
        statusEl.textContent = 'Importing...';
        statusEl.className = 'status-message';

        const result = await api.importCSV(file);

        statusEl.textContent = `Successfully imported ${result.data.count} contacts`;
        statusEl.className = 'status-message success';

        await loadContacts();

        setTimeout(() => {
            statusEl.textContent = '';
            statusEl.className = 'status-message';
        }, 3000);
    } catch (error) {
        statusEl.textContent = 'Failed to import: ' + error.message;
        statusEl.className = 'status-message error';
    }

    e.target.value = '';
}

// Utility functions
function getInitials(firstName, lastName) {
    const first = firstName ? firstName[0] : '';
    const last = lastName ? lastName[0] : '';
    return (first + last).toUpperCase();
}

function getInteractionIcon(type) {
    const icons = {
        call: '📞',
        meeting: '🤝',
        email: '📧',
        note: '📝',
        message: '💬'
    };
    return icons[type] || '📝';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

function downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}
