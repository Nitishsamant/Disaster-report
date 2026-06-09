$msi = 'https://nodejs.org/dist/latest-v18.x/node-v18.18.0-x64.msi'
$msiPath = \"$env:TEMP\\node-lts.msi\"
Invoke-WebRequest $msi -OutFile $msiPath
Start-Process msiexec.exe -ArgumentList \"/i $msiPath /qn /norestart\" -Waitconst express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
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

// Ensure foreign keys are enforced
db.exec("PRAGMA foreign_keys = ON;");

// Load schema from schema.sql if present
try {
  const schemaPath = path.join(__dirname, "schema.sql");
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, "utf8");
    db.exec(schemaSql, (err) => {
      if (err) console.error("❌ Error applying schema:", err);
      else console.log("✅ Schema applied (schema.sql)");
    });
  }
} catch (e) {
  console.error("❌ Schema load error:", e);
}

// Seed data if tables are empty and seed.sql exists
try {
  const seedPath = path.join(__dirname, "seed.sql");
  if (fs.existsSync(seedPath)) {
    db.get("SELECT COUNT(*) AS cnt FROM reports", (err, row) => {
      if (err) {
        // If reports table doesn't exist yet, skip; schema will create it
        return;
      }
      if (row && row.cnt === 0) {
        const seedSql = fs.readFileSync(seedPath, "utf8");
        db.exec(seedSql, (err) => {
          if (err) console.error("❌ Error applying seed data:", err);
          else console.log("✅ Seed data applied (seed.sql)");
        });
      }
    });
  }
} catch (e) {
  console.error("❌ Seed load error:", e);
}

// 👉 Route to insert report into database
app.post("/report", (req, res) => {
  // Accept `title` or legacy `type` from the frontend
  const title = req.body.title || req.body.type || "Untitled";
  const description = req.body.description || "";
  const location = req.body.location || "";
  const severity = req.body.severity ? parseInt(req.body.severity, 10) : null;

  const sql = `INSERT INTO reports (title, description, location, severity) VALUES (?, ?, ?, ?)`;
  db.run(sql, [title, description, location, severity], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ id: this.lastID, message: "✅ Report stored in database" });
    }
  });
});

// 👉 Route to fetch all reports
app.get("/reports", (req, res) => {
  db.all("SELECT * FROM reports ORDER BY date_reported DESC", [], (err, rows) => {
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