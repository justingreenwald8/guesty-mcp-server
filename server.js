const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Simple JSON Database Initialization
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify({
    guests: [{ id: 'guest_123', name: 'Justin Greenwald', location: 'The Surf Lodge', status: 'VIP / In-House' }],
    chat_history: [],
    concierge_notes: [
      { id: 1, text: 'Prefers sunset views.' },
      { id: 2, text: 'Allergic to shellfish.' }
    ]
  }, null, 2));
}

function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// API Endpoints
app.get('/api/data', (req, res) => {
  res.json(readDB());
});

app.post('/api/chat', (req, res) => {
  const { text, isGuest } = req.body;
  const db = readDB();
  const newMessage = { text, isGuest, timestamp: new Date().toISOString() };
  db.chat_history.push(newMessage);
  
  // Logic to extract notes
  const lowerText = text.toLowerCase();
  let note = "";
  if (lowerText.includes('towel')) note = "Requested extra towels.";
  if (lowerText.includes('pillow')) note = "Requested extra pillows.";
  if (lowerText.includes('check-in')) note = "Arriving at the property.";
  
  if (note) {
    db.concierge_notes.unshift({ id: Date.now(), text: note });
  }
  
  writeDB(db);
  res.json(newMessage);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
