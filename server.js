const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const app = express();
const PORT = 3000;

// Middleware to parse JSON
app.use(express.json());

// Serve frontend (index.html, css, js)
app.use(express.static(__dirname));

// Connect / Create SQLite Database
const db = new sqlite3.Database("./database.sqlite", (err) => {
  if (err) console.error("❌ Database error:", err);
  else console.log("✅ Connected to SQLite database");
});

// Create table if not exists
db.run(`CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT,
  location TEXT,
  severity TEXT,
  description TEXT
)`);

// 👉 Route to insert report into database
app.post("/report", (req, res) => {
  const { type, location, severity, description } = req.body;

  db.run(
    `INSERT INTO reports (type, location, severity, description) VALUES (?, ?, ?, ?)`,
    [type, location, severity, description],
    (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ message: "✅ Report stored in database" });
      }
    }
  );
});

// 👉 Route to fetch all reports
app.get("/reports", (req, res) => {
  db.all("SELECT * FROM reports", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});