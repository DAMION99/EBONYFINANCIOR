class ContactQueries {
  constructor(db) {
    this.db = db;
  }

  // Contact operations
  createContact(data) {
    const stmt = this.db.prepare(`
      INSERT INTO contacts (first_name, last_name, email, phone, company, job_title, notes, photo_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.first_name,
      data.last_name || null,
      data.email || null,
      data.phone || null,
      data.company || null,
      data.job_title || null,
      data.notes || null,
      data.photo_url || null
    );

    return this.getContact(result.lastInsertRowid);
  }

  getContact(id) {
    const stmt = this.db.prepare(`
      SELECT * FROM contacts WHERE id = ?
    `);
    const contact = stmt.get(id);

    if (contact) {
      contact.tags = this.getContactTags(id);
    }

    return contact;
  }

  getAllContacts(limit = 100, offset = 0) {
    const stmt = this.db.prepare(`
      SELECT * FROM contacts
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `);
    const contacts = stmt.all(limit, offset);

    contacts.forEach(contact => {
      contact.tags = this.getContactTags(contact.id);
    });

    return contacts;
  }

  updateContact(id, data) {
    const fields = [];
    const values = [];

    if (data.first_name !== undefined) {
      fields.push('first_name = ?');
      values.push(data.first_name);
    }
    if (data.last_name !== undefined) {
      fields.push('last_name = ?');
      values.push(data.last_name);
    }
    if (data.email !== undefined) {
      fields.push('email = ?');
      values.push(data.email);
    }
    if (data.phone !== undefined) {
      fields.push('phone = ?');
      values.push(data.phone);
    }
    if (data.company !== undefined) {
      fields.push('company = ?');
      values.push(data.company);
    }
    if (data.job_title !== undefined) {
      fields.push('job_title = ?');
      values.push(data.job_title);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes);
    }
    if (data.photo_url !== undefined) {
      fields.push('photo_url = ?');
      values.push(data.photo_url);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    if (fields.length > 1) {
      const stmt = this.db.prepare(`
        UPDATE contacts
        SET ${fields.join(', ')}
        WHERE id = ?
      `);
      stmt.run(...values);
    }

    return this.getContact(id);
  }

  deleteContact(id) {
    const stmt = this.db.prepare('DELETE FROM contacts WHERE id = ?');
    return stmt.run(id);
  }

  searchContacts(query) {
    const searchTerm = `%${query}%`;
    const stmt = this.db.prepare(`
      SELECT * FROM contacts
      WHERE first_name LIKE ?
         OR last_name LIKE ?
         OR email LIKE ?
         OR phone LIKE ?
         OR company LIKE ?
      ORDER BY updated_at DESC
    `);

    const contacts = stmt.all(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);

    contacts.forEach(contact => {
      contact.tags = this.getContactTags(contact.id);
    });

    return contacts;
  }

  // Tag operations
  createTag(name, color = '#3B82F6') {
    const stmt = this.db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)');
    try {
      const result = stmt.run(name, color);
      return { id: result.lastInsertRowid, name, color };
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return this.getTagByName(name);
      }
      throw error;
    }
  }

  getTagByName(name) {
    const stmt = this.db.prepare('SELECT * FROM tags WHERE name = ?');
    return stmt.get(name);
  }

  getAllTags() {
    const stmt = this.db.prepare('SELECT * FROM tags ORDER BY name');
    return stmt.all();
  }

  addTagToContact(contactId, tagId) {
    const stmt = this.db.prepare('INSERT OR IGNORE INTO contact_tags (contact_id, tag_id) VALUES (?, ?)');
    return stmt.run(contactId, tagId);
  }

  removeTagFromContact(contactId, tagId) {
    const stmt = this.db.prepare('DELETE FROM contact_tags WHERE contact_id = ? AND tag_id = ?');
    return stmt.run(contactId, tagId);
  }

  getContactTags(contactId) {
    const stmt = this.db.prepare(`
      SELECT t.* FROM tags t
      JOIN contact_tags ct ON t.id = ct.tag_id
      WHERE ct.contact_id = ?
    `);
    return stmt.all(contactId);
  }

  getContactsByTag(tagId) {
    const stmt = this.db.prepare(`
      SELECT c.* FROM contacts c
      JOIN contact_tags ct ON c.id = ct.contact_id
      WHERE ct.tag_id = ?
      ORDER BY c.updated_at DESC
    `);
    const contacts = stmt.all(tagId);

    contacts.forEach(contact => {
      contact.tags = this.getContactTags(contact.id);
    });

    return contacts;
  }

  // Interaction operations
  createInteraction(data) {
    const stmt = this.db.prepare(`
      INSERT INTO interactions (contact_id, type, title, notes, interaction_date)
      VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
    `);

    const result = stmt.run(
      data.contact_id,
      data.type,
      data.title || null,
      data.notes || null,
      data.interaction_date || null
    );

    // Update contact's updated_at
    this.db.prepare('UPDATE contacts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(data.contact_id);

    return this.getInteraction(result.lastInsertRowid);
  }

  getInteraction(id) {
    const stmt = this.db.prepare('SELECT * FROM interactions WHERE id = ?');
    return stmt.get(id);
  }

  getContactInteractions(contactId, limit = 50) {
    const stmt = this.db.prepare(`
      SELECT * FROM interactions
      WHERE contact_id = ?
      ORDER BY interaction_date DESC
      LIMIT ?
    `);
    return stmt.all(contactId, limit);
  }

  getAllInteractions(limit = 100) {
    const stmt = this.db.prepare(`
      SELECT i.*, c.first_name, c.last_name
      FROM interactions i
      JOIN contacts c ON i.contact_id = c.id
      ORDER BY i.interaction_date DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  // Reminder operations
  createReminder(data) {
    const stmt = this.db.prepare(`
      INSERT INTO reminders (contact_id, title, notes, reminder_date)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.contact_id,
      data.title,
      data.notes || null,
      data.reminder_date
    );

    return this.getReminder(result.lastInsertRowid);
  }

  getReminder(id) {
    const stmt = this.db.prepare('SELECT * FROM reminders WHERE id = ?');
    return stmt.get(id);
  }

  getUpcomingReminders(limit = 50) {
    const stmt = this.db.prepare(`
      SELECT r.*, c.first_name, c.last_name
      FROM reminders r
      JOIN contacts c ON r.contact_id = c.id
      WHERE r.completed = 0 AND r.reminder_date >= CURRENT_TIMESTAMP
      ORDER BY r.reminder_date ASC
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  getContactReminders(contactId) {
    const stmt = this.db.prepare(`
      SELECT * FROM reminders
      WHERE contact_id = ? AND completed = 0
      ORDER BY reminder_date ASC
    `);
    return stmt.all(contactId);
  }

  completeReminder(id) {
    const stmt = this.db.prepare('UPDATE reminders SET completed = 1 WHERE id = ?');
    return stmt.run(id);
  }

  deleteReminder(id) {
    const stmt = this.db.prepare('DELETE FROM reminders WHERE id = ?');
    return stmt.run(id);
  }

  // Import/Export operations
  exportToCSV() {
    const contacts = this.getAllContacts(10000, 0);
    const headers = ['id', 'first_name', 'last_name', 'email', 'phone', 'company', 'job_title', 'notes', 'photo_url', 'tags'];

    let csv = headers.join(',') + '\n';

    contacts.forEach(contact => {
      const tags = contact.tags ? contact.tags.map(t => t.name).join(';') : '';
      const row = [
        contact.id,
        this.escapeCSV(contact.first_name),
        this.escapeCSV(contact.last_name),
        this.escapeCSV(contact.email),
        this.escapeCSV(contact.phone),
        this.escapeCSV(contact.company),
        this.escapeCSV(contact.job_title),
        this.escapeCSV(contact.notes),
        this.escapeCSV(contact.photo_url),
        this.escapeCSV(tags)
      ];
      csv += row.join(',') + '\n';
    });

    return csv;
  }

  escapeCSV(field) {
    if (!field) return '';
    const stringField = String(field);
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
  }

  importFromCSV(csvData, skipFirstRow = true) {
    const lines = csvData.trim().split('\n');
    const imported = [];
    const errors = [];

    const startIndex = skipFirstRow ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      try {
        const values = this.parseCSVLine(lines[i]);

        if (values.length < 2) continue;

        const contactData = {
          first_name: values[1] || '',
          last_name: values[2] || null,
          email: values[3] || null,
          phone: values[4] || null,
          company: values[5] || null,
          job_title: values[6] || null,
          notes: values[7] || null,
          photo_url: values[8] || null
        };

        if (!contactData.first_name) continue;

        const contact = this.createContact(contactData);

        if (values[9]) {
          const tags = values[9].split(';').filter(t => t.trim());
          tags.forEach(tagName => {
            const tag = this.createTag(tagName.trim());
            this.addTagToContact(contact.id, tag.id);
          });
        }

        imported.push(contact);
      } catch (error) {
        errors.push({ line: i + 1, error: error.message });
      }
    }

    return { imported, errors, count: imported.length };
  }

  parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);

    return values;
  }

  exportToVCard() {
    const contacts = this.getAllContacts(10000, 0);
    let vcards = '';

    contacts.forEach(contact => {
      vcards += 'BEGIN:VCARD\n';
      vcards += 'VERSION:3.0\n';
      vcards += `FN:${contact.first_name} ${contact.last_name || ''}\n`.trim() + '\n';
      vcards += `N:${contact.last_name || ''};${contact.first_name};;;\n`;

      if (contact.email) {
        vcards += `EMAIL:${contact.email}\n`;
      }
      if (contact.phone) {
        vcards += `TEL:${contact.phone}\n`;
      }
      if (contact.company) {
        vcards += `ORG:${contact.company}\n`;
      }
      if (contact.job_title) {
        vcards += `TITLE:${contact.job_title}\n`;
      }
      if (contact.notes) {
        vcards += `NOTE:${contact.notes.replace(/\n/g, '\\n')}\n`;
      }
      if (contact.photo_url) {
        vcards += `PHOTO;VALUE=URI:${contact.photo_url}\n`;
      }
      if (contact.tags && contact.tags.length > 0) {
        vcards += `CATEGORIES:${contact.tags.map(t => t.name).join(',')}\n`;
      }

      vcards += 'END:VCARD\n\n';
    });

    return vcards;
  }
}

module.exports = ContactQueries;
