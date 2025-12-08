
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const targetUSN = '123';

db.get("SELECT * FROM students WHERE usn = ?", [targetUSN], (err, row) => {
    if (err) {
        console.error("DB_ERROR:", err.message);
        return;
    }
    if (row) {
        console.log(`FOUND_STUDENT: Name='${row.name}', USN='${row.usn}'`);
    } else {
        console.log(`STUDENT_NOT_FOUND: USN '${targetUSN}'`);

        // List a few generic ones to prove DB works
        db.all("SELECT usn, name FROM students LIMIT 5", [], (err, rows) => {
            if (rows) console.log("SAMPLE_STUDENTS:", JSON.stringify(rows));
        });
    }
});
