
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const paths = {
    database: path.resolve(__dirname, '../server-20251120T131707Z-1-001/server/database.sqlite'),
    frontendFaces: path.resolve(__dirname, 'faces'),
    pythonFaces: path.resolve(__dirname, '../python-face-api-20251120T131704Z-1-001/python-face-api/faces')
};

function deleteFile(filePath) {
    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
            console.log(`✅ Deleted: ${filePath}`);
        } catch (err) {
            console.error(`❌ Failed to delete ${filePath}: ${err.message}`);
        }
    } else {
        console.log(`ℹ️  File not found (already clean): ${filePath}`);
    }
}

function deleteFolderContents(folderPath) {
    if (fs.existsSync(folderPath)) {
        console.log(`Cleaning folder: ${folderPath}`);
        try {
            const files = fs.readdirSync(folderPath);
            for (const file of files) {
                const curPath = path.join(folderPath, file);
                if (fs.lstatSync(curPath).isDirectory()) {
                    fs.rmSync(curPath, { recursive: true, force: true });
                    console.log(`   Deleted dir: ${file}`);
                } else {
                    fs.unlinkSync(curPath);
                    console.log(`   Deleted file: ${file}`);
                }
            }
            console.log(`✅ Cleared contents of: ${folderPath}`);
        } catch (err) {
            console.error(`❌ Failed to clear ${folderPath}: ${err.message}`);
        }
    } else {
        console.log(`ℹ️  Folder not found: ${folderPath}`);
        // Optionally create it so it's ready
        fs.mkdirSync(folderPath, { recursive: true });
        console.log(`✨ Created empty folder: ${folderPath}`);
    }
}

console.log("--- STARTING SYSTEM RESET ---");
deleteFile(paths.database);
deleteFolderContents(paths.frontendFaces);
deleteFolderContents(paths.pythonFaces);
console.log("--- RESET COMPLETE ---");
