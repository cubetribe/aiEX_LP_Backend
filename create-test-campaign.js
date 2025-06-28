/**
 * Script to create a test campaign directly in SQLite
 */

const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '.tmp/data.db');
const db = new Database(dbPath);

try {
  console.log('Creating test campaign...');
  
  const result = db.prepare(`
    INSERT INTO campaigns (
      title, 
      slug, 
      description, 
      campaign_type, 
      status, 
      is_active, 
      config, 
      created_at, 
      updated_at,
      published_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'Test Quiz Campaign',
    'test3',
    'Test campaign for debugging',
    'quiz',
    'active',
    1,
    JSON.stringify({
      "type": "quiz",
      "title": "AI Readiness Assessment",
      "description": "Finden Sie heraus, wie bereit Sie für AI sind",
      "questions": [
        {
          "id": "q1",
          "question": "Sind Sie Privatperson oder Unternehmer?",
          "type": "single-choice",
          "required": true,
          "options": [
            {"value": "privatperson", "label": "Privatperson"},
            {"value": "unternehmer", "label": "Unternehmer"}
          ]
        },
        {
          "id": "q2", 
          "question": "Wie hoch ist Ihr monatliches Einkommen?",
          "type": "single-choice",
          "required": true,
          "options": [
            {"value": "unter_2000", "label": "Unter 2.000€"},
            {"value": "2000_5000", "label": "2.000€ - 5.000€"},
            {"value": "ueber_5000", "label": "Über 5.000€"}
          ]
        }
      ]
    }),
    new Date().toISOString(),
    new Date().toISOString(),
    new Date().toISOString()
  );
  
  console.log('Campaign created with ID:', result.lastInsertRowid);
  
  // Verify creation
  const campaign = db.prepare('SELECT * FROM campaigns WHERE slug = ?').get('test3');
  console.log('Created campaign:', {
    id: campaign.id,
    title: campaign.title,
    slug: campaign.slug,
    status: campaign.status,
    is_active: campaign.is_active
  });
  
} catch (error) {
  console.error('Error creating campaign:', error);
} finally {
  db.close();
}