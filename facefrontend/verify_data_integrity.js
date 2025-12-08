
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = "http://localhost:5001/api/students";
const FACES_DIR = path.join(__dirname, 'faces');
const PYTHON_FACES_DIR = path.resolve(__dirname, '../python-face-api-20251120T131704Z-1-001/python-face-api/faces');

async function verifyIntegrity() {
    console.log("Starting Data Integrity Check...");

    try {
        // 1. Fetch Students from DB
        console.log("Fetching students from API...");
        const response = await axios.get(API_URL);
        const dbStudents = response.data;
        console.log(`Found ${dbStudents.length} students in Database.`);

        const dbUsns = dbStudents.map(s => s.usn);
        console.log("DB USNs:", dbUsns);

        // 2. Check Faces Directory (Frontend root)
        if (fs.existsSync(FACES_DIR)) {
            console.log(`\nChecking Faces Directory: ${FACES_DIR}`);
            const faceUsns = fs.readdirSync(FACES_DIR).filter(file => fs.statSync(path.join(FACES_DIR, file)).isDirectory());
            console.log("Filesystem USNs:", faceUsns);
            compareUsns("Frontend Faces", dbUsns, faceUsns);
        } else {
            console.log(`\nFaces Directory not found at: ${FACES_DIR}`);
        }

        // 3. Check Python Faces Directory
        if (fs.existsSync(PYTHON_FACES_DIR)) {
            console.log(`\nChecking Python Faces Directory: ${PYTHON_FACES_DIR}`);
            const pyFaceUsns = fs.readdirSync(PYTHON_FACES_DIR).filter(file => fs.statSync(path.join(PYTHON_FACES_DIR, file)).isDirectory());
            console.log("Python Filesystem USNs:", pyFaceUsns);
            compareUsns("Python Faces", dbUsns, pyFaceUsns);
        } else {
            console.log(`\nPython Faces Directory not found at: ${PYTHON_FACES_DIR}`);
        }

    } catch (err) {
        console.error("Error during verification:", err.message);
        if (err.response) {
            console.error("API Response:", err.response.status, err.response.data);
        }
    }
}

function compareUsns(sourceName, dbUsns, fsUsns) {
    const missingInFs = dbUsns.filter(usn => !fsUsns.includes(usn));
    const missingInDb = fsUsns.filter(usn => !dbUsns.includes(usn));

    // Case sensitivity check
    const caseMismatch = [];
    dbUsns.forEach(dbUsn => {
        const fsMatch = fsUsns.find(fsUsn => fsUsn.toLowerCase() === dbUsn.toLowerCase() && fsUsn !== dbUsn);
        if (fsMatch) {
            caseMismatch.push({ db: dbUsn, fs: fsMatch });
        }
    });


    console.log(`\n--- Comparison Result (${sourceName}) ---`);
    if (missingInFs.length === 0 && missingInDb.length === 0 && caseMismatch.length === 0) {
        console.log("✅ Perfect Match!");
    } else {
        if (missingInFs.length > 0) console.log("❌ USNs in DB but missing in Faces:", missingInFs);
        if (missingInDb.length > 0) console.log("⚠️  USNs in Faces but missing in DB:", missingInDb);
        if (caseMismatch.length > 0) console.log("⚠️  Case Mismatches:", caseMismatch);
    }
}

verifyIntegrity();
