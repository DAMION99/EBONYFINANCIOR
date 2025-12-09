class ContactQueries {
  constructor(db) {
    this.db = db;
  }

  // Contact operations
  createContact(data) {
    const stmt = this.db.prepare(`
      INSERT INTO contacts (first_name, last_name, email, phone, company, job_title, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.first_name,
      data.last_name || null,
      data.email || null,
      data.phone || null,
      data.company || null,
      data.job_title || null,
      data.notes || null
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
}

module.exports = ContactQueries;
