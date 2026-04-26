const fs = require('fs');
const { execSync } = require('child_process');

const lines = fs.readFileSync('.env.vercel.test', 'utf8').split('\n');
let key = null;
for (const line of lines) {
    if (line.startsWith('FIREBASE_PRIVATE_KEY=')) {
        key = line.substring('FIREBASE_PRIVATE_KEY='.length);
        break;
    }
}

if (key) {
    // 1. Remove all double quotes
    key = key.replace(/"/g, '');
    
    // 2. Separate header, body, and footer
    const header = "-----BEGIN PRIVATE KEY-----";
    const footer = "-----END PRIVATE KEY-----";
    
    if (key.includes(header) && key.includes(footer)) {
        const bodyStart = key.indexOf(header) + header.length;
        const bodyEnd = key.indexOf(footer);
        let body = key.substring(bodyStart, bodyEnd);
        
        // 3. Remove ALL spaces from the body (which should only contain base64 chars and \n)
        body = body.replace(/ /g, '');
        
        // 4. Reconstruct the key
        key = header + body + footer;
    }
    
    // 5. Replace literal \n with actual newlines
    key = key.replace(/\\n/g, '\n');
    
    // Write to a temp file
    fs.writeFileSync('temp_fb_key_clean.txt', key, 'utf8');
    
    console.log("Deep cleaned key, length:", key.length);
    
    try {
        console.log("Removing old keys...");
        execSync(`npx vercel env rm FIREBASE_PRIVATE_KEY production --yes`);
        execSync(`npx vercel env rm FIREBASE_PRIVATE_KEY preview --yes`);
        execSync(`npx vercel env rm FIREBASE_PRIVATE_KEY development --yes`);
        
        console.log("Adding to production...");
        execSync(`npx vercel env add FIREBASE_PRIVATE_KEY production < temp_fb_key_clean.txt`, { stdio: 'inherit' });
        console.log("Adding to preview...");
        execSync(`npx vercel env add FIREBASE_PRIVATE_KEY preview < temp_fb_key_clean.txt`, { stdio: 'inherit' });
        console.log("Adding to development...");
        execSync(`npx vercel env add FIREBASE_PRIVATE_KEY development < temp_fb_key_clean.txt`, { stdio: 'inherit' });
        
        console.log("Done!");
    } catch (e) {
        console.error("Failed:", e.message);
    }
    
    fs.unlinkSync('temp_fb_key_clean.txt');
} else {
    console.error("Could not find FIREBASE_PRIVATE_KEY in .env.vercel.test");
}
