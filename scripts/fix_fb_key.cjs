const fs = require('fs');
const { execSync } = require('child_process');

const envFile = fs.readFileSync('.env.vercel.local.check', 'utf8');


const lines = fs.readFileSync('.env.vercel.local.check', 'utf8').split('\n');
let key = null;
for (const line of lines) {
    if (line.startsWith('FIREBASE_PRIVATE_KEY=')) {
        key = line.substring('FIREBASE_PRIVATE_KEY='.length);
        break;
    }
}

if (key) {
    // Remove all double quotes
    key = key.replace(/"/g, '');
    
    // Replace literal \n with actual newlines
    key = key.replace(/\\n/g, '\n');
    
    // Write to a temp file
    fs.writeFileSync('temp_fb_key.txt', key, 'utf8');
    
    console.log("Extracted key, length:", key.length);
    
    try {
        console.log("Adding to production...");
        execSync(`npx vercel env add FIREBASE_PRIVATE_KEY production < temp_fb_key.txt`, { stdio: 'inherit' });
        console.log("Adding to preview...");
        execSync(`npx vercel env add FIREBASE_PRIVATE_KEY preview < temp_fb_key.txt`, { stdio: 'inherit' });
        console.log("Adding to development...");
        execSync(`npx vercel env add FIREBASE_PRIVATE_KEY development < temp_fb_key.txt`, { stdio: 'inherit' });
    } catch (e) {
        console.error("Failed to add:", e.message);
    }
    
    fs.unlinkSync('temp_fb_key.txt');
} else {
    console.error("Could not find FIREBASE_PRIVATE_KEY in .env.vercel.local.check");
}
