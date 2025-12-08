const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./database"); // Import SQLite connection

const app = express();
const PORT = 5001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));

// Helper to wrap db.run in a Promise
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

// Helper to wrap db.all in a Promise
const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Helper to wrap db.get in a Promise
const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};


// --- API ENDPOINTS ---

// 1. Get all students
app.get("/api/students", async (req, res) => {
  try {
    const students = await dbAll("SELECT * FROM students");
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: "Error fetching students", error: err.message });
  }
});

// 2. Add a new student
app.post("/api/students", async (req, res) => {
  const { name, usn, age, course, phone, image } = req.body;

  try {
    const existingStudent = await dbGet("SELECT * FROM students WHERE usn = ?", [usn]);
    if (existingStudent) {
      return res.status(400).json({ message: "Student with this USN already exists" });
    }

    await dbRun(
      "INSERT INTO students (name, usn, age, course, phone, image) VALUES (?, ?, ?, ?, ?, ?)",
      [name, usn, age, course, phone, image]
    );

    res.status(201).json({ message: "Student added successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error adding student", error: err.message });
  }
});

// 3. Get all attendance logs
app.get("/api/attendance", async (req, res) => {
  try {
    const logs = await dbAll("SELECT * FROM attendance_logs ORDER BY recognizedAt DESC");
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: "Error fetching attendance", error: err.message });
  }
});

// 4. Mark attendance manually
app.post("/api/attendance", async (req, res) => {
  const { name, usn, course, recognizedAt } = req.body;
  const date = new Date(recognizedAt || Date.now()).toISOString();
  const today = date.split('T')[0];

  try {
    // Check if already present today for this course
    const logs = await dbAll("SELECT * FROM attendance_logs WHERE usn = ? AND course = ?", [usn, course]);
    const alreadyPresent = logs.some(log => log.recognizedAt.split('T')[0] === today);

    if (alreadyPresent) {
      return res.status(400).json({ message: "Attendance already marked for today" });
    }

    await dbRun(
      "INSERT INTO attendance_logs (name, usn, course, recognizedAt) VALUES (?, ?, ?, ?)",
      [name, usn, course, date]
    );

    res.status(201).json({ message: "Attendance marked successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error marking attendance", error: err.message });
  }
});

// 5. Period-wise Attendance (Face Recognition)
app.post("/api/periodwise-attendance", async (req, res) => {
  const { usn, recognizedAt } = req.body;
  const date = new Date(recognizedAt).toISOString();
  const today = date.split('T')[0];

  try {
    const student = await dbGet("SELECT * FROM students WHERE usn = ?", [usn]);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Determine period
    const period = await getPeriodForCurrentTime(new Date(recognizedAt));
    if (period === 'No Period') {
      const serverTime = new Date(recognizedAt).toLocaleTimeString();
      return res.status(400).json({ message: `No active class period found at ${serverTime}. Please check the Timetable.` });
    }

    // Check duplicate
    const logs = await dbAll("SELECT * FROM attendance_logs WHERE usn = ? AND course = ?", [usn, period]);
    const alreadyPresent = logs.some(log => log.recognizedAt.split('T')[0] === today);

    if (alreadyPresent) {
      return res.status(200).json({ message: `Attendance already recorded for ${period}` });
    }

    await dbRun(
      "INSERT INTO attendance_logs (name, usn, course, recognizedAt) VALUES (?, ?, ?, ?)",
      [student.name, usn, period, date]
    );

    res.status(201).json({ message: `Attendance recorded for ${period}` });
  } catch (err) {
    res.status(500).json({ message: "Error recording attendance", error: err.message });
  }
});

// 6. Download Attendance Report (CSV)
app.get("/api/reports/attendance", async (req, res) => {
  try {
    const logs = await dbAll("SELECT * FROM attendance_logs ORDER BY recognizedAt DESC");

    // Convert to CSV
    const headers = ["Name", "USN", "Course", "Date & Time"];
    const csvRows = logs.map(log => {
      const date = new Date(log.recognizedAt).toLocaleString();
      return `"${log.name}","${log.usn}","${log.course}","${date}"`;
    });

    const csvContent = [headers.join(","), ...csvRows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=attendance_report.csv");
    res.status(200).send(csvContent);

  } catch (err) {
    res.status(500).json({ message: "Error generating report", error: err.message });
  }
});

// 7. Timetable CRUD
app.get("/api/timetable", async (req, res) => {
  try {
    // Order by Day then StartTime. Custom ordering for days.
    const timetable = await dbAll("SELECT * FROM timetable");

    const dayOrder = { "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6, "Sunday": 7 };

    timetable.sort((a, b) => {
      if (dayOrder[a.day] !== dayOrder[b.day]) {
        return (dayOrder[a.day] || 8) - (dayOrder[b.day] || 8);
      }
      return a.startTime.localeCompare(b.startTime);
    });

    res.json(timetable);
  } catch (err) {
    res.status(500).json({ message: "Error fetching timetable", error: err.message });
  }
});

app.post("/api/timetable", async (req, res) => {
  const { subject, startTime, endTime, day } = req.body;
  try {
    await dbRun("INSERT INTO timetable (subject, startTime, endTime, day) VALUES (?, ?, ?, ?)", [subject, startTime, endTime, day]);
    res.status(201).json({ message: "Period added successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error adding period", error: err.message });
  }
});

app.delete("/api/timetable/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // Get the subject name before deleting
    const period = await dbGet("SELECT * FROM timetable WHERE id = ?", [id]);
    if (period) {
      const { subject } = period;

      // Delete from timetable
      await dbRun("DELETE FROM timetable WHERE id = ?", [id]);

      // Optional: Delete associated attendance logs? 
      // The user said "removing subject... should reflect in logs". 
      // Usually this means deleting the logs for that subject so they don't show up as orphaned.
      await dbRun("DELETE FROM attendance_logs WHERE course = ?", [subject]);

      res.json({ message: `Period and associated logs for '${subject}' deleted successfully` });
    } else {
      res.status(404).json({ message: "Period not found" });
    }
  } catch (err) {
    res.status(500).json({ message: "Error deleting period", error: err.message });
  }
});

app.put("/api/timetable/:id", async (req, res) => {
  const { id } = req.params;
  const { subject, startTime, endTime, day } = req.body;
  try {
    // Get old subject name
    const oldPeriod = await dbGet("SELECT * FROM timetable WHERE id = ?", [id]);

    if (oldPeriod) {
      const oldSubject = oldPeriod.subject;

      // Update timetable
      await dbRun(
        "UPDATE timetable SET subject = ?, startTime = ?, endTime = ?, day = ? WHERE id = ?",
        [subject, startTime, endTime, day, id]
      );

      // Update attendance logs if subject name changed
      if (oldSubject !== subject) {
        await dbRun("UPDATE attendance_logs SET course = ? WHERE course = ?", [subject, oldSubject]);
      }

      res.json({ message: "Period and associated logs updated successfully" });
    } else {
      res.status(404).json({ message: "Period not found" });
    }
  } catch (err) {
    res.status(500).json({ message: "Error updating period", error: err.message });
  }
});

// Helper function for periods (Dynamic from DB)
async function getPeriodForCurrentTime(now) {
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeVal = currentHour * 60 + currentMinute; // Minutes from midnight
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }); // e.g., "Monday"

  try {
    // Filter by current day
    const timetable = await dbAll("SELECT * FROM timetable WHERE day = ?", [currentDay]);
    console.log(`DEBUG: Checking period for ${currentDay} at ${currentHour}:${currentMinute} (${currentTimeVal}). Found ${timetable.length} entries.`);

    for (const period of timetable) {
      const [startH, startM] = period.startTime.split(':').map(Number);
      const [endH, endM] = period.endTime.split(':').map(Number);

      const startVal = startH * 60 + startM;
      const endVal = endH * 60 + endM;

      console.log(`   Checking ${period.subject}: ${startVal} <= ${currentTimeVal} < ${endVal}`);

      if (currentTimeVal >= startVal && currentTimeVal < endVal) {
        return period.subject;
      }
    }
  } catch (err) {
    console.error("Error fetching timetable for period check:", err);
  }


  return 'No Period';
}

// 8. Delete Student
app.delete("/api/students/:usn", async (req, res) => {
  const { usn } = req.params;
  try {
    await dbRun("DELETE FROM students WHERE usn = ?", [usn]);
    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting student", error: err.message });
  }
});

// 9. Update Student
app.put("/api/students/:usn", async (req, res) => {
  const { usn } = req.params;
  const { name, age, course, phone } = req.body;
  try {
    await dbRun(
      "UPDATE students SET name = ?, age = ?, course = ?, phone = ? WHERE usn = ?",
      [name, age, course, phone, usn]
    );
    res.json({ message: "Student updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error updating student", error: err.message });
  }
});



// 10. Get Student Attendance Summary
app.get("/api/students/:usn/summary", async (req, res) => {
  const { usn } = req.params;
  try {
    const student = await dbGet("SELECT * FROM students WHERE usn = ?", [usn]);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const logs = await dbAll("SELECT * FROM attendance_logs WHERE usn = ? ORDER BY recognizedAt DESC", [usn]);

    // Group by course
    const attendanceMap = {};
    logs.forEach(log => {
      if (!attendanceMap[log.course]) {
        attendanceMap[log.course] = [];
      }
      attendanceMap[log.course].push(log.recognizedAt);
    });

    // Convert to array
    const summary = Object.keys(attendanceMap).map(course => ({
      subject: course,
      classesAttended: attendanceMap[course].length,
      history: attendanceMap[course] // Array of timestamps
    }));

    res.json({
      name: student.name,
      usn: student.usn,
      course: student.course,
      image: student.image, // Include profile image
      summary: summary
    });

  } catch (err) {
    res.status(500).json({ message: "Error fetching summary", error: err.message });
  }
});

// 11. Get Defaulter Stats (Pie Chart Data)
app.get("/api/stats/defaulters", async (req, res) => {
  try {
    const students = await dbAll("SELECT * FROM students");
    const logs = await dbAll("SELECT * FROM attendance_logs");

    let defaulters = 0;
    let eligible = 0;

    // Mock Logic: Total Classes = Attended + 5 (Same as frontend)
    // In production, this should come from a real 'classes_held' table
    students.forEach(student => {
      const studentLogs = logs.filter(log => log.usn === student.usn);
      const attended = studentLogs.length;
      const total = attended + 5;
      const percentage = (attended / total) * 100;

      if (percentage < 75) {
        defaulters++;
      } else {
        eligible++;
      }
    });

    res.json([
      { name: 'Eligible', value: eligible, fill: '#10B981' }, // Green
      { name: 'Defaulter', value: defaulters, fill: '#EF4444' } // Red
    ]);

  } catch (err) {
    res.status(500).json({ message: "Error fetching stats", error: err.message });
  }
});

// 12. Download Defaulter Report (CSV)
app.get("/api/reports/defaulters", async (req, res) => {
  try {
    const students = await dbAll("SELECT * FROM students");
    const logs = await dbAll("SELECT * FROM attendance_logs");

    const defaulterList = [];

    students.forEach(student => {
      const studentLogs = logs.filter(log => log.usn === student.usn);
      const attended = studentLogs.length;
      const total = attended + 5;
      const percentage = Math.round((attended / total) * 100);

      if (percentage < 75) {
        defaulterList.push({
          name: student.name,
          usn: student.usn,
          course: student.course,
          percentage: `${percentage}%`,
          status: "Defaulter"
        });
      }
    });

    // Convert to CSV
    const headers = ["Name", "USN", "Course", "Attendance %", "Status"];
    const csvRows = defaulterList.map(d =>
      `"${d.name}","${d.usn}","${d.course}","${d.percentage}","${d.status}"`
    );

    const csvContent = [headers.join(","), ...csvRows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=defaulter_list.csv");
    res.status(200).send(csvContent);

  } catch (err) {
    res.status(500).json({ message: "Error generating report", error: err.message });
  }
});

// --- AUTHENTICATION ---

app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const existingAdmin = await dbGet("SELECT * FROM admins WHERE email = ?", [email]);
    if (existingAdmin) {
      return res.status(400).json({ message: "Email already registered" });
    }

    await dbRun(
      "INSERT INTO admins (username, email, password) VALUES (?, ?, ?)",
      [username, email, password]
    );

    res.status(201).json({ message: "Admin created successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await dbGet("SELECT * FROM admins WHERE email = ?", [email]);

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (admin.password !== password) {
      return res.status(401).json({ message: "Invalid password" });
    }

    res.status(200).json({ message: "Signin successful", admin: { username: admin.username, email: admin.email } });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
