
import axios from 'axios';

const API_URL = "http://localhost:5001/api/students";

async function inspectData() {
    try {
        const response = await axios.get(API_URL);
        const students = response.data;

        console.log("Total Students:", students.length);
        if (students.length > 0) {
            console.log("First Student Structure:", JSON.stringify(students[0], null, 2));
        }

        const target = students.find(s => s.usn == '123');
        if (target) {
            console.log("Found USN '123':", JSON.stringify(target, null, 2));
            console.log("Type of USN:", typeof target.usn);
        } else {
            console.log("USN '123' NOT FOUND in API response.");
        }

    } catch (err) {
        console.error("Error:", err.message);
    }
}

inspectData();
