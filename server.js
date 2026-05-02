require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const CRMDatabase = require('./database/schema');
const ContactQueries = require('./database/queries');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

// Initialize database
const database = new CRMDatabase('./crm.db');
const queries = new ContactQueries(database.db);

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'contact-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, 'public')));

// API Key authentication middleware
const authenticateAPIKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;

  if (!API_KEY || apiKey === API_KEY) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized - Invalid API Key' });
  }
};

// Apply authentication to all routes except health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Personal CRM API is running' });
});

app.use('/api', authenticateAPIKey);

// ===== CONTACT ENDPOINTS =====

// Get all contacts
app.get('/api/contacts', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const contacts = queries.getAllContacts(limit, offset);
    res.json({ success: true, data: contacts, count: contacts.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search contacts
app.get('/api/contacts/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, error: 'Search query required' });
    }
    const contacts = queries.searchContacts(q);
    res.json({ success: true, data: contacts, count: contacts.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single contact
app.get('/api/contacts/:id', (req, res) => {
  try {
    const contact = queries.getContact(req.params.id);
    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }
    res.json({ success: true, data: contact });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create contact
app.post('/api/contacts', (req, res) => {
  try {
    const { first_name, last_name, email, phone, company, job_title, notes, tags } = req.body;

    if (!first_name) {
      return res.status(400).json({ success: false, error: 'first_name is required' });
    }

    const contact = queries.createContact({
      first_name,
      last_name,
      email,
      phone,
      company,
      job_title,
      notes
    });

    // Add tags if provided
    if (tags && Array.isArray(tags)) {
      tags.forEach(tagName => {
        const tag = queries.createTag(tagName);
        queries.addTagToContact(contact.id, tag.id);
      });
      // Refresh contact to include tags
      const updatedContact = queries.getContact(contact.id);
      return res.status(201).json({ success: true, data: updatedContact });
    }

    res.status(201).json({ success: true, data: contact });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update contact
app.put('/api/contacts/:id', (req, res) => {
  try {
    const contact = queries.updateContact(req.params.id, req.body);
    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }
    res.json({ success: true, data: contact });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete contact
app.delete('/api/contacts/:id', (req, res) => {
  try {
    const result = queries.deleteContact(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }
    res.json({ success: true, message: 'Contact deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== TAG ENDPOINTS =====

// Get all tags
app.get('/api/tags', (req, res) => {
  try {
    const tags = queries.getAllTags();
    res.json({ success: true, data: tags });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create tag
app.post('/api/tags', (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Tag name is required' });
    }
    const tag = queries.createTag(name, color);
    res.status(201).json({ success: true, data: tag });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get contacts by tag
app.get('/api/tags/:id/contacts', (req, res) => {
  try {
    const contacts = queries.getContactsByTag(req.params.id);
    res.json({ success: true, data: contacts, count: contacts.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add tag to contact
app.post('/api/contacts/:contactId/tags/:tagId', (req, res) => {
  try {
    queries.addTagToContact(req.params.contactId, req.params.tagId);
    const contact = queries.getContact(req.params.contactId);
    res.json({ success: true, data: contact });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove tag from contact
app.delete('/api/contacts/:contactId/tags/:tagId', (req, res) => {
  try {
    queries.removeTagFromContact(req.params.contactId, req.params.tagId);
    const contact = queries.getContact(req.params.contactId);
    res.json({ success: true, data: contact });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== INTERACTION ENDPOINTS =====

// Get all interactions
app.get('/api/interactions', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const interactions = queries.getAllInteractions(limit);
    res.json({ success: true, data: interactions, count: interactions.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get contact interactions
app.get('/api/contacts/:id/interactions', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const interactions = queries.getContactInteractions(req.params.id, limit);
    res.json({ success: true, data: interactions, count: interactions.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create interaction
app.post('/api/interactions', (req, res) => {
  try {
    const { contact_id, type, title, notes, interaction_date } = req.body;

    if (!contact_id || !type) {
      return res.status(400).json({
        success: false,
        error: 'contact_id and type are required'
      });
    }

    const interaction = queries.createInteraction({
      contact_id,
      type,
      title,
      notes,
      interaction_date
    });

    res.status(201).json({ success: true, data: interaction });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== REMINDER ENDPOINTS =====

// Get upcoming reminders
app.get('/api/reminders', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const reminders = queries.getUpcomingReminders(limit);
    res.json({ success: true, data: reminders, count: reminders.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get contact reminders
app.get('/api/contacts/:id/reminders', (req, res) => {
  try {
    const reminders = queries.getContactReminders(req.params.id);
    res.json({ success: true, data: reminders, count: reminders.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create reminder
app.post('/api/reminders', (req, res) => {
  try {
    const { contact_id, title, notes, reminder_date } = req.body;

    if (!contact_id || !title || !reminder_date) {
      return res.status(400).json({
        success: false,
        error: 'contact_id, title, and reminder_date are required'
      });
    }

    const reminder = queries.createReminder({
      contact_id,
      title,
      notes,
      reminder_date
    });

    res.status(201).json({ success: true, data: reminder });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Complete reminder
app.put('/api/reminders/:id/complete', (req, res) => {
  try {
    queries.completeReminder(req.params.id);
    const reminder = queries.getReminder(req.params.id);
    res.json({ success: true, data: reminder });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete reminder
app.delete('/api/reminders/:id', (req, res) => {
  try {
    const result = queries.deleteReminder(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Reminder not found' });
    }
    res.json({ success: true, message: 'Reminder deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== PHOTO UPLOAD ENDPOINT =====

// Upload contact photo
app.post('/api/contacts/:id/photo', upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No photo file provided' });
    }

    const photoUrl = `/uploads/${req.file.filename}`;
    const contact = queries.updateContact(req.params.id, { photo_url: photoUrl });

    if (!contact) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    res.json({ success: true, data: contact, photo_url: photoUrl });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete contact photo
app.delete('/api/contacts/:id/photo', (req, res) => {
  try {
    const contact = queries.getContact(req.params.id);
    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    if (contact.photo_url) {
      const photoPath = path.join(__dirname, contact.photo_url);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    const updatedContact = queries.updateContact(req.params.id, { photo_url: null });
    res.json({ success: true, data: updatedContact });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== IMPORT/EXPORT ENDPOINTS =====

// Export contacts to CSV
app.get('/api/export/csv', (req, res) => {
  try {
    const csv = queries.exportToCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Import contacts from CSV
app.post('/api/import/csv', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No CSV file provided' });
    }

    const csvData = fs.readFileSync(req.file.path, 'utf-8');
    fs.unlinkSync(req.file.path);

    const result = queries.importFromCSV(csvData, true);

    res.json({
      success: true,
      message: `Imported ${result.count} contacts`,
      data: result
    });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export contacts to vCard
app.get('/api/export/vcard', (req, res) => {
  try {
    const vcard = queries.exportToVCard();
    res.setHeader('Content-Type', 'text/vcard');
    res.setHeader('Content-Disposition', 'attachment; filename=contacts.vcf');
    res.send(vcard);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Personal CRM API running on port ${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
  if (API_KEY) {
    console.log(`🔒 API Key authentication enabled`);
  } else {
    console.log(`⚠️  Warning: No API Key set. Add API_KEY to .env for security`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  database.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  database.close();
  process.exit(0);
});
