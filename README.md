# Personal CRM API

A lightweight, self-hosted CRM backend designed to work seamlessly with iOS Shortcuts. Track contacts, interactions, reminders, and more - all controlled from your iPhone.

## Features

- 📇 **Contact Management** - Store names, emails, phones, companies, and notes
- 📸 **Contact Photos** - Upload and manage contact profile pictures
- 🏷️ **Tagging System** - Organize contacts with custom tags
- 📝 **Interaction Tracking** - Log calls, meetings, emails, and notes
- ⏰ **Reminders** - Set follow-up reminders for contacts
- 🔍 **Search** - Quick search across all contact fields
- 📤 **Import/Export** - CSV and vCard import/export support
- 🌐 **Web Dashboard** - Beautiful web interface for managing contacts
- 🔒 **API Key Authentication** - Secure your data
- 📱 **iOS Shortcuts Ready** - Designed for Shortcuts app integration

## Quick Start

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd EBONYFINANCIOR
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   ```

4. **Edit .env file**
   ```bash
   PORT=3000
   API_KEY=your-secret-api-key-change-this
   NODE_ENV=production
   ```

5. **Start the server**
   ```bash
   npm start
   ```

The API will be running at `http://localhost:3000`

### Development Mode

For development with auto-reload:
```bash
npm run dev
```

## Web Dashboard

Access the web dashboard at `http://localhost:3000` in your browser.

### Features

- **Contact Management** - Add, edit, delete, and search contacts
- **Photo Uploads** - Drag and drop or select photos for contacts
- **Interactions & Reminders** - Log interactions and set reminders
- **Tags** - Create and manage contact tags
- **Import/Export** - Import from CSV or export to CSV/vCard
- **Responsive Design** - Works on desktop, tablet, and mobile

### Using the Dashboard

1. Open `http://localhost:3000` in your browser
2. Enter your API key (from `.env` file)
3. Start managing your contacts!

The dashboard provides a user-friendly alternative to iOS Shortcuts for managing your CRM data.

## API Documentation

All endpoints require authentication via API key in the `X-API-Key` header or `api_key` query parameter.

**Base URL**: `http://localhost:3000/api`

### Response Format

All responses follow this format:
```json
{
  "success": true,
  "data": { ... },
  "count": 10
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error message"
}
```

---

## Contacts

### Create Contact
**POST** `/api/contacts`

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "company": "Acme Inc",
  "job_title": "CEO",
  "notes": "Met at conference",
  "tags": ["client", "VIP"]
}
```

**Required**: `first_name`

### Get All Contacts
**GET** `/api/contacts?limit=100&offset=0`

Returns all contacts with their tags, ordered by most recently updated.

### Get Single Contact
**GET** `/api/contacts/:id`

Returns contact details including all tags.

### Update Contact
**PUT** `/api/contacts/:id`

```json
{
  "phone": "+1987654321",
  "notes": "Updated notes"
}
```

Only include fields you want to update.

### Delete Contact
**DELETE** `/api/contacts/:id`

Permanently deletes contact and all associated interactions and reminders.

### Search Contacts
**GET** `/api/contacts/search?q=john`

Searches across first_name, last_name, email, phone, and company fields.

### Upload Contact Photo
**POST** `/api/contacts/:id/photo`

Upload a photo for a contact. Send as `multipart/form-data` with the photo file in the `photo` field.

**Supported formats**: JPEG, PNG, GIF, WebP  
**Max size**: 5MB

Returns the updated contact with `photo_url` field.

### Delete Contact Photo
**DELETE** `/api/contacts/:id/photo`

Removes the photo from a contact and deletes the file from the server.

---

## Tags

### Get All Tags
**GET** `/api/tags`

Returns all available tags.

### Create Tag
**POST** `/api/tags`

```json
{
  "name": "VIP",
  "color": "#FF0000"
}
```

### Get Contacts by Tag
**GET** `/api/tags/:id/contacts`

Returns all contacts with this tag.

### Add Tag to Contact
**POST** `/api/contacts/:contactId/tags/:tagId`

### Remove Tag from Contact
**DELETE** `/api/contacts/:contactId/tags/:tagId`

---

## Interactions

### Create Interaction
**POST** `/api/interactions`

```json
{
  "contact_id": 1,
  "type": "call",
  "title": "Follow-up call",
  "notes": "Discussed Q1 plans",
  "interaction_date": "2024-12-09T14:30:00"
}
```

**Required**: `contact_id`, `type`

**Type examples**: call, meeting, email, note, message

### Get All Interactions
**GET** `/api/interactions?limit=100`

Returns recent interactions across all contacts.

### Get Contact Interactions
**GET** `/api/contacts/:id/interactions?limit=50`

Returns all interactions for a specific contact.

---

## Reminders

### Create Reminder
**POST** `/api/reminders`

```json
{
  "contact_id": 1,
  "title": "Follow up on proposal",
  "notes": "Check if they reviewed the document",
  "reminder_date": "2024-12-15T10:00:00"
}
```

**Required**: `contact_id`, `title`, `reminder_date`

**Date format**: ISO 8601 (`YYYY-MM-DDTHH:mm:ss`)

### Get Upcoming Reminders
**GET** `/api/reminders?limit=50`

Returns incomplete reminders ordered by date.

### Get Contact Reminders
**GET** `/api/contacts/:id/reminders`

Returns all incomplete reminders for a contact.

### Complete Reminder
**PUT** `/api/reminders/:id/complete`

Marks reminder as completed.

### Delete Reminder
**DELETE** `/api/reminders/:id`

---

## Import / Export

### Export Contacts to CSV
**GET** `/api/export/csv`

Downloads all contacts as a CSV file. Includes all contact fields and tags (semicolon-separated).

**Response**: `text/csv` file download

### Import Contacts from CSV
**POST** `/api/import/csv`

Upload a CSV file to import contacts. Send as `multipart/form-data` with the CSV file in the `file` field.

**CSV Format**:
```csv
id,first_name,last_name,email,phone,company,job_title,notes,photo_url,tags
,John,Doe,john@example.com,+1234567890,Acme Inc,CEO,Great contact,,client;VIP
```

The first row should be headers. The `id` column is ignored during import. Tags should be semicolon-separated.

**Response**:
```json
{
  "success": true,
  "message": "Imported 15 contacts",
  "data": {
    "imported": [...],
    "errors": [],
    "count": 15
  }
}
```

### Export Contacts to vCard
**GET** `/api/export/vcard`

Downloads all contacts as a vCard (.vcf) file compatible with Apple Contacts, Google Contacts, and other contact management apps.

**Response**: `text/vcard` file download

---

## Deployment

### Option 1: Local Network (Easiest for Testing)

1. Start the server on your computer
2. Find your local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. Use `http://YOUR-LOCAL-IP:3000` in iOS Shortcuts
4. Only works when on same WiFi network

### Option 2: Ngrok (Quick Public URL)

1. Install ngrok: https://ngrok.com/
2. Start your server: `npm start`
3. In another terminal: `ngrok http 3000`
4. Use the ngrok URL in iOS Shortcuts
5. URL changes each time you restart ngrok (free tier)

```bash
ngrok http 3000
```

### Option 3: Heroku (Free Hosting)

1. Install Heroku CLI
2. Create `Procfile`:
   ```
   web: node server.js
   ```

3. Deploy:
   ```bash
   heroku create your-crm-api
   heroku config:set API_KEY=your-secret-key
   git push heroku main
   ```

4. Use `https://your-crm-api.herokuapp.com` in Shortcuts

### Option 4: Railway / Render / Fly.io

Similar to Heroku - these platforms support Node.js deployment with simple configuration.

### Option 5: VPS / Cloud Server

Deploy to DigitalOcean, AWS, or any server:

1. Install Node.js on server
2. Clone repository
3. Install PM2: `npm install -g pm2`
4. Start: `pm2 start server.js --name crm-api`
5. Set up nginx reverse proxy (optional)
6. Configure SSL certificate with Let's Encrypt

---

## iOS Shortcuts Integration

See [IOS_SHORTCUTS_GUIDE.md](./IOS_SHORTCUTS_GUIDE.md) for detailed instructions on building shortcuts.

### Quick Setup

1. Deploy your API (see Deployment section)
2. Get your public URL and API key
3. Follow the shortcut guides to build:
   - Add Contact
   - Search Contacts
   - Log Interaction
   - Set Reminder
   - View Recent Contacts

### Example: Quick Add Contact

In iOS Shortcuts:
1. Ask for name, email, phone
2. GET request to `/api/contacts`
3. Use X-API-Key header
4. Show success notification

---

## Database

The API uses SQLite with the following schema:

### Tables

- **contacts** - Contact information
- **tags** - Custom tags for organization
- **contact_tags** - Many-to-many relationship
- **interactions** - Log of all contact interactions
- **reminders** - Follow-up reminders

### Backup

The database is stored in `crm.db`. To backup:

```bash
cp crm.db crm.db.backup
```

To restore:
```bash
cp crm.db.backup crm.db
```

### Reset Database

To start fresh:
```bash
rm crm.db
npm start
```

The database will be recreated automatically.

---

## Security

### API Key Protection

- Never commit your `.env` file
- Use a strong, random API key
- Rotate API keys periodically

### HTTPS

For production, always use HTTPS:
- Use a reverse proxy (nginx, Caddy)
- Get free SSL certificate from Let's Encrypt
- Most hosting platforms provide HTTPS automatically

### Network Security

- Only expose necessary ports
- Use firewall rules
- Consider VPN for private access

---

## Troubleshooting

### Port Already in Use
```bash
# Change PORT in .env file
PORT=3001
```

### Can't Connect from iOS
- Check firewall allows connections
- Verify you're on the same network (local network)
- Test with curl: `curl http://your-ip:3000/health`

### Database Locked
- Close any other processes using the database
- Restart the server

### API Returns 401 Unauthorized
- Check API key is correct
- Verify X-API-Key header is included
- Check .env file has API_KEY set

---

## Development

### Project Structure

```
EBONYFINANCIOR/
├── server.js              # Main Express server
├── database/
│   ├── schema.js          # Database initialization
│   └── queries.js         # Database queries
├── public/                # Web dashboard
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── api.js         # API client
│       └── app.js         # Dashboard logic
├── uploads/               # Contact photos
├── package.json
├── .env.example
├── README.md
└── IOS_SHORTCUTS_GUIDE.md
```

### Adding New Features

1. Add database schema in `database/schema.js`
2. Add queries in `database/queries.js`
3. Add API endpoint in `server.js`
4. Update documentation

### Testing API

Use curl to test endpoints:

```bash
# Health check
curl http://localhost:3000/health

# Create contact
curl -X POST http://localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"first_name":"John","last_name":"Doe"}'

# Get contacts
curl http://localhost:3000/api/contacts \
  -H "X-API-Key: your-api-key"
```

---

## License

MIT License - feel free to modify and use for personal or commercial projects.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the iOS Shortcuts guide
3. Check server logs for errors

---

## Roadmap

Completed features:
- [x] Web dashboard for managing contacts
- [x] Import/export contacts (CSV, vCard)
- [x] Contact photos

Future enhancements:
- [ ] Custom fields
- [ ] Email/SMS integration
- [ ] Analytics and insights
- [ ] Shared contacts (multi-user)
- [ ] Batch operations
- [ ] Advanced search filters
- [ ] Contact merging/deduplication

---

Built with ❤️ for iOS Shortcuts users
