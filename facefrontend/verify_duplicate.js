import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

async function verifyDuplicate() {
    try {
        const timestamp = Date.now();
        const testUSN = `DUP_TEST_${timestamp}`;

        // 1. Add Student
        console.log("1. Adding Student...");
        await axios.post(`${API_URL}/students`, {
            name: "Duplicate Tester",
            usn: testUSN,
            course: "Testing",
            age: 20,
            phone: "1234567890"
        });

        // 2. Add Timetable for NOW
        console.log("2. Adding Timetable Period...");
        const now = new Date();
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const currentDay = days[now.getDay()];
        const startHour = now.getHours().toString().padStart(2, '0');
        const startMin = now.getMinutes().toString().padStart(2, '0');
        const endHour = (now.getHours() + 1).toString().padStart(2, '0'); // 1 hour long

        const subject = `DupCheck_${timestamp}`;

        await axios.post(`${API_URL}/timetable`, {
            subject: subject,
            startTime: `${startHour}:${startMin}`,
            endTime: `${endHour}:${startMin}`,
            day: currentDay
        });

        // 3. Mark Attendance (First Time)
        console.log("3. Marking Attendance (1st attempt)...");
        const res1 = await axios.post(`${API_URL}/periodwise-attendance`, {
            usn: testUSN,
            recognizedAt: new Date().toISOString()
        });
        console.log(`   Response 1: ${res1.status} - ${res1.data.message}`);

        // 4. Mark Attendance (Second Time - Immediate)
        console.log("4. Marking Attendance (2nd attempt)...");
        const res2 = await axios.post(`${API_URL}/periodwise-attendance`, {
            usn: testUSN,
            recognizedAt: new Date().toISOString()
        });
        console.log(`   Response 2: ${res2.status} - ${res2.data.message}`);

        // 5. Verify DB Count
        console.log("5. Verifying DB Count...");
        const logsRes = await axios.get(`${API_URL}/attendance`);
        const logs = logsRes.data.filter(l => l.usn === testUSN && l.course === subject);

        console.log(`   Total Logs found: ${logs.length}`);

        if (logs.length === 1) {
            console.log("✅ SUCCESS: Only 1 entry found. Backend duplicate check is WORKING.");
        } else {
            console.log(`❌ FAILURE: Found ${logs.length} entries. Backend duplicate check FAILED.`);
        }

    } catch (err) {
        console.error("❌ ERROR:", err.response ? err.response.data : err.message);
    }
}

verifyDuplicate();
