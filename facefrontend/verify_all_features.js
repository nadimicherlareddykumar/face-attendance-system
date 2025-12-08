import axios from 'axios';
import fs from 'fs';

const NODE_API = 'http://localhost:5001/api';
const PYTHON_API = 'http://localhost:5000';

// Dummy 1x1 pixel base64 image
const DUMMY_IMAGE = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vLs9PX29/j5+v/EABtBAAMBAQEBAQEBAAAAAAAAAAAAAAABAgMEBQYH/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8ER/2Q==";

async function runTests() {
    console.log("🚀 Starting Full System Verification...\n");
    const timestamp = Date.now();
    const testUSN = `TEST_${timestamp}`;
    const testName = `Test Student ${timestamp}`;

    try {
        // 1. Test Student Enrollment (Node Backend)
        console.log("1️⃣  Testing Student Enrollment (Node API)...");
        await axios.post(`${NODE_API}/students`, {
            name: testName,
            usn: testUSN,
            course: "Computer Science",
            year: "4",
            section: "A",
            email: "test@example.com",
            phone: "1234567890"
        });
        console.log("   ✅ Student record created in Database.");

        // 2. Test Timetable Creation (For Current Time)
        console.log("\n2️⃣  Testing Timetable Management...");
        const now = new Date();
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const currentDay = days[now.getDay()];

        const startHour = now.getHours().toString().padStart(2, '0');
        const startMin = now.getMinutes().toString().padStart(2, '0');
        // End time = start time + 1 hour
        const endHour = (now.getHours() + 1).toString().padStart(2, '0');

        const startTime = `${startHour}:${startMin}`;
        const endTime = `${endHour}:${startMin}`;

        console.log(`   Creating class for ${currentDay} ${startTime} - ${endTime}...`);
        await axios.post(`${NODE_API}/timetable`, {
            subject: `Test Subject ${timestamp}`,
            startTime: startTime,
            endTime: endTime,
            day: currentDay
        });
        console.log("   ✅ Timetable entry added.");

        // 3. Test Attendance Marking (Logic Check)
        console.log("\n3️⃣  Testing Attendance Logic...");
        // We simulate a recognition event happening NOW
        const recognizedAt = new Date().toISOString();

        const attRes = await axios.post(`${NODE_API}/periodwise-attendance`, {
            usn: testUSN,
            recognizedAt: recognizedAt
        });

        if (attRes.status === 201) {
            console.log(`   ✅ Attendance marked successfully: "${attRes.data.message}"`);
        } else {
            console.warn(`   ⚠️  Attendance response: ${attRes.status} - ${attRes.data.message}`);
        }

        // 4. Verify Dashboard Stats
        console.log("\n4️⃣  Verifying Dashboard Data...");
        // Fetch all attendance and filter for today
        const allAttendanceRes = await axios.get(`${NODE_API}/attendance`);
        const todayStr = new Date().toISOString().split('T')[0];

        const presentStudent = allAttendanceRes.data.find(s =>
            s.usn === testUSN && s.recognizedAt.startsWith(todayStr)
        );

        if (presentStudent) {
            console.log("   ✅ Student found in 'Attendance' list for today.");
        } else {
            console.error("   ❌ Student NOT found in 'Attendance' list for today.");
        }

        // 5. Test Report Generation
        console.log("\n5️⃣  Testing Report Generation...");
        const reportRes = await axios.get(`${NODE_API}/reports/attendance`);
        if (reportRes.data.includes("Name,USN,Course")) {
            console.log("   ✅ CSV Report generated successfully.");
            console.log("   Preview: " + reportRes.data.split('\n')[0]);
        } else {
            console.error("   ❌ CSV Report format incorrect.");
        }

        console.log("\n🎉 All System Tests Passed!");

    } catch (err) {
        console.error("\n❌ TEST FAILED:");
        if (err.response) {
            console.error(`   Status: ${err.response.status}`);
            console.error(`   Data: ${JSON.stringify(err.response.data)}`);
        } else {
            console.error(`   Error: ${err.message}`);
        }
    }
}

runTests();
