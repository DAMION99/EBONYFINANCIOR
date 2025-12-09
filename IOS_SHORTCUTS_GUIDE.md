# iOS Shortcuts Integration Guide

This guide will help you connect iOS Shortcuts to your Personal CRM API.

## Prerequisites

1. Deploy your API server (see README.md)
2. Get your server's public URL (e.g., using ngrok, Heroku, or your own hosting)
3. Have your API key ready (from .env file)

## Base Configuration

For all shortcuts, you'll need:
- **Base URL**: Your server URL (e.g., `https://your-server.com`)
- **API Key**: From your `.env` file

Store these in iOS Shortcuts as "Magic Variables" or Dictionary values to reuse across shortcuts.

---

## 1. Add New Contact Shortcut

**Purpose**: Quickly add a new contact to your CRM

### Steps to Build:

1. **Ask for Input**: "What's the person's first name?"
   - Type: Text
   - Save as: `firstName`

2. **Ask for Input**: "Last name?" (Optional)
   - Type: Text
   - Default: blank
   - Save as: `lastName`

3. **Ask for Input**: "Email address?" (Optional)
   - Type: Text
   - Input Type: Email
   - Save as: `email`

4. **Ask for Input**: "Phone number?" (Optional)
   - Type: Text
   - Input Type: Phone
   - Save as: `phone`

5. **Ask for Input**: "Company?" (Optional)
   - Type: Text
   - Save as: `company`

6. **Ask for Input**: "Job title?" (Optional)
   - Type: Text
   - Save as: `jobTitle`

7. **Ask for Input**: "Notes?" (Optional)
   - Type: Text
   - Save as: `notes`

8. **Ask for Input**: "Tags? (comma-separated, e.g., 'client,VIP')" (Optional)
   - Type: Text
   - Save as: `tagsInput`

9. **Split Text**: Split `tagsInput` by `,`
   - Save as: `tagsList`

10. **Dictionary**: Create request body
    ```json
    {
      "first_name": "[firstName]",
      "last_name": "[lastName]",
      "email": "[email]",
      "phone": "[phone]",
      "company": "[company]",
      "job_title": "[jobTitle]",
      "notes": "[notes]",
      "tags": "[tagsList]"
    }
    ```

11. **Get Contents of URL**:
    - URL: `[Base URL]/api/contacts`
    - Method: POST
    - Headers:
      - `Content-Type`: `application/json`
      - `X-API-Key`: `[Your API Key]`
    - Request Body: Dictionary (from step 10)

12. **Get Dictionary from Input**: Parse response

13. **Show Notification**: "✅ Added [firstName] [lastName] to CRM!"

---

## 2. Search Contacts Shortcut

**Purpose**: Search and view contact details

### Steps to Build:

1. **Ask for Input**: "Who are you looking for?"
   - Type: Text
   - Save as: `searchQuery`

2. **Get Contents of URL**:
   - URL: `[Base URL]/api/contacts/search?q=[searchQuery]`
   - Method: GET
   - Headers:
      - `X-API-Key`: `[Your API Key]`

3. **Get Dictionary from Input**: Parse response

4. **Get Dictionary Value**: Get `data` from Dictionary

5. **Choose from List**: Show contact names
   - Use: `Get Variable` → `Repeat with Each`
   - Display: `[first_name] [last_name] - [company]`

6. **Show Result**: Display selected contact details
   ```
   Name: [first_name] [last_name]
   Email: [email]
   Phone: [phone]
   Company: [company]
   Title: [job_title]
   Notes: [notes]
   ```

---

## 3. Log Interaction Shortcut

**Purpose**: Record a call, meeting, or note for a contact

### Steps to Build:

1. **Get Contents of URL**: Fetch all contacts
   - URL: `[Base URL]/api/contacts?limit=100`
   - Method: GET
   - Headers:
      - `X-API-Key`: `[Your API Key]`

2. **Get Dictionary Value**: Get `data` from response

3. **Choose from List**: Select contact
   - Display: `[first_name] [last_name]`
   - Save as: `selectedContact`

4. **Get Dictionary Value**: Get `id` from `selectedContact`
   - Save as: `contactId`

5. **Choose from Menu**: Interaction type
   - Options:
     - 📞 Call
     - 🤝 Meeting
     - 💬 Note
     - 📧 Email
   - Save choice as: `interactionType`

6. **Ask for Input**: "What happened?"
   - Type: Text
   - Save as: `notes`

7. **Ask for Input**: "Title?" (Optional)
   - Type: Text
   - Default: "[interactionType] with [firstName]"
   - Save as: `title`

8. **Dictionary**: Create request body
    ```json
    {
      "contact_id": "[contactId]",
      "type": "[interactionType]",
      "title": "[title]",
      "notes": "[notes]"
    }
    ```

9. **Get Contents of URL**:
   - URL: `[Base URL]/api/interactions`
   - Method: POST
   - Headers:
      - `Content-Type`: `application/json`
      - `X-API-Key`: `[Your API Key]`
   - Request Body: Dictionary (from step 8)

10. **Show Notification**: "✅ Logged [interactionType] with [contact name]"

---

## 4. Set Reminder Shortcut

**Purpose**: Create a follow-up reminder for a contact

### Steps to Build:

1. **Get Contents of URL**: Fetch all contacts
   - URL: `[Base URL]/api/contacts`
   - Method: GET
   - Headers:
      - `X-API-Key`: `[Your API Key]`

2. **Get Dictionary Value**: Get `data` from response

3. **Choose from List**: Select contact
   - Display: `[first_name] [last_name]`
   - Save as: `selectedContact`

4. **Get Dictionary Value**: Get `id` from `selectedContact`
   - Save as: `contactId`

5. **Ask for Input**: "What's the reminder about?"
   - Type: Text
   - Save as: `reminderTitle`

6. **Ask for Input**: "When should I remind you?"
   - Type: Date and Time
   - Save as: `reminderDate`

7. **Format Date**: Format `reminderDate` as ISO 8601
   - Custom Format: `yyyy-MM-dd'T'HH:mm:ss`
   - Save as: `formattedDate`

8. **Ask for Input**: "Additional notes?" (Optional)
   - Type: Text
   - Save as: `reminderNotes`

9. **Dictionary**: Create request body
    ```json
    {
      "contact_id": "[contactId]",
      "title": "[reminderTitle]",
      "notes": "[reminderNotes]",
      "reminder_date": "[formattedDate]"
    }
    ```

10. **Get Contents of URL**:
    - URL: `[Base URL]/api/reminders`
    - Method: POST
    - Headers:
       - `Content-Type`: `application/json`
       - `X-API-Key`: `[Your API Key]`
    - Request Body: Dictionary (from step 9)

11. **Show Notification**: "⏰ Reminder set for [reminderDate]"

---

## 5. View Recent Contacts Shortcut

**Purpose**: Quick view of recently updated contacts

### Steps to Build:

1. **Get Contents of URL**:
   - URL: `[Base URL]/api/contacts?limit=10`
   - Method: GET
   - Headers:
      - `X-API-Key`: `[Your API Key]`

2. **Get Dictionary from Input**: Parse response

3. **Get Dictionary Value**: Get `data` from Dictionary

4. **Repeat with Each**: Loop through contacts
   - Create text for each:
     ```
     👤 [first_name] [last_name]
     🏢 [company]
     📱 [phone]
     📧 [email]
     ---
     ```

5. **Show Result**: Display formatted list

---

## 6. Get Upcoming Reminders Shortcut

**Purpose**: Check your upcoming follow-ups

### Steps to Build:

1. **Get Contents of URL**:
   - URL: `[Base URL]/api/reminders?limit=20`
   - Method: GET
   - Headers:
      - `X-API-Key`: `[Your API Key]`

2. **Get Dictionary Value**: Get `data` from response

3. **Repeat with Each**: Format reminders
   ```
   ⏰ [title]
   👤 [first_name] [last_name]
   📅 [reminder_date]
   📝 [notes]
   ---
   ```

4. **Show Result**: Display upcoming reminders

---

## 7. View Contact History Shortcut

**Purpose**: See all interactions with a specific contact

### Steps to Build:

1. **Get Contents of URL**: Fetch contacts
   - URL: `[Base URL]/api/contacts`
   - Method: GET
   - Headers:
      - `X-API-Key`: `[Your API Key]`

2. **Choose from List**: Select contact

3. **Get Dictionary Value**: Get `id`
   - Save as: `contactId`

4. **Get Contents of URL**: Fetch interactions
   - URL: `[Base URL]/api/contacts/[contactId]/interactions`
   - Method: GET
   - Headers:
      - `X-API-Key`: `[Your API Key]`

5. **Get Dictionary Value**: Get `data`

6. **Repeat with Each**: Format interactions
   ```
   [type]: [title]
   📅 [interaction_date]
   📝 [notes]
   ---
   ```

7. **Show Result**: Display interaction history

---

## Tips & Best Practices

### Storing Configuration

Create a "CRM Config" shortcut that returns a dictionary:
```json
{
  "baseURL": "https://your-server.com",
  "apiKey": "your-api-key-here"
}
```

Then in other shortcuts:
1. **Run Shortcut**: "CRM Config"
2. **Get Dictionary Value**: Get values as needed

### Error Handling

Add after API calls:
1. **If**: Response contains "success" = false
2. **Show Alert**: "Error: [error message from response]"
3. **Stop Shortcut**

### Using Siri

Name shortcuts clearly:
- "Add CRM Contact"
- "Search CRM"
- "Log CRM Interaction"

Then say: "Hey Siri, Add CRM Contact"

### Home Screen Widgets

Add shortcuts to Home Screen for quick access to:
- Add Contact
- Recent Contacts
- Upcoming Reminders

---

## Testing Your Shortcuts

1. Start with the "Add New Contact" shortcut
2. Test with dummy data
3. Check the API response in the server logs
4. Verify data in database with "View Recent Contacts"

## Troubleshooting

**"Request failed" error**:
- Check your server is running
- Verify the URL is correct
- Ensure API key is set properly

**"Unauthorized" error**:
- Check X-API-Key header is included
- Verify API key matches your .env file

**Empty responses**:
- Check the API endpoint URL
- Verify query parameters are correct

**Date format issues**:
- Use ISO 8601 format: `2024-12-31T14:30:00`
- Use "Format Date" action with custom format

---

## Advanced: Automation Ideas

### Daily Reminder Check
- **Trigger**: Every day at 9 AM
- **Action**: Run "Get Upcoming Reminders" shortcut
- **Show**: Notification with count

### After Meeting
- **Trigger**: When calendar event ends
- **Action**: Ask if you want to log interaction
- **Quick Add**: Pre-fill with meeting details

### Contact from Messages
- **Trigger**: When message received
- **Action**: Quick add interaction note
- **Context**: Auto-fill contact from message sender

---

## Need Help?

Check the API documentation in the README.md for:
- Full API endpoint reference
- Response format examples
- Error codes and handling
