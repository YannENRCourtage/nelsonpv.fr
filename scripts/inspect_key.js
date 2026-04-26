import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '..', '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
let key = envConfig.FIREBASE_PRIVATE_KEY;

if (key) {
    console.log("Original Length:", key.length);
    console.log("Starts with:", key.substring(0, 50));
    console.log("Ends with:", key.substring(key.length - 50));
    
    // Check for weird characters
    const weirdChars = key.match(/[^A-Za-z0-9+/=\s-]/g);
    if (weirdChars) {
        console.log("Weird characters found:", weirdChars);
    }
}
