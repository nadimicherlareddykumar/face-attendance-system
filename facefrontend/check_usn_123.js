
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../server-20251120T131707Z-1-001/server/database.sqlite');
const db = new sqlite3.Database(dbPath);

const targetUSN = '123';

console.log(`Checking Database at: ${dbPath}`);

db.get("SELECT * FROM students WHERE usn = ?", [targetUSN], (err, row) => {
    if (err) {
        console.error("Error:", err.message);
        return;
    }
    if (row) {
        console.log(`✅ Found Student: Name='${row.name}', USN='${row.usn}'`);
    } else {
        console.log(`❌ Student with USN '${targetUSN}' NOT FOUND in database.`);
    }

    // Also list all USNs just in case
    db.all("SELECT usn, name FROM students", [], (err, rows) => {
        if (err) return;
        console.log("All Students in DB:", rows.map(r => `${r.usn} (${r.name})`));
    });
});
