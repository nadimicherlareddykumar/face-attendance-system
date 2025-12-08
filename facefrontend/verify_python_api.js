import axios from 'axios';
import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:5006/recognize';
const TEST_IMAGE_PATH = '../python-face-api-20251120T131704Z-1-001/python-face-api/faces/123/1.jpg';

async function testRecognition() {
    try {
        console.log(`Reading image from ${TEST_IMAGE_PATH}...`);
        const imageBuffer = fs.readFileSync(TEST_IMAGE_PATH);
        const base64Image = imageBuffer.toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64Image}`;

        console.log(`Sending request to ${API_URL}...`);
        const start = Date.now();
        const res = await axios.post(API_URL, { image: dataUrl });
        const duration = (Date.now() - start) / 1000;

        console.log(`Response received in ${duration}s:`);
        console.log(JSON.stringify(res.data, null, 2));

        if (res.data.length > 0 && res.data[0].usn === '123') {
            console.log("✅ SUCCESS: Face recognized correctly as '123'!");
        } else {
            console.log("❌ FAILURE: Face NOT recognized or wrong USN.");
        }

    } catch (err) {
        console.error("❌ ERROR:", err.message);
        if (err.response) {
            console.error("Response Data:", err.response.data);
        }
    }
}

testRecognition();
