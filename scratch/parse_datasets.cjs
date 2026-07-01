const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\Utilisateur\\.gemini\\antigravity\\brain\\8a054f40-14fb-4caa-ab8a-e9cadbef3aed\\.system_generated\\steps\\245\\content.md', 'utf8');

// Find the JSON start after the markdown frontmatter separator "---"
const separator = '---\r\n'; // Note: might be \r\n or \n
let index = content.indexOf(separator);
if (index === -1) {
  index = content.indexOf('---\n');
}
if (index === -1) {
  console.log("Could not find separator");
  process.exit(1);
}
const jsonPart = content.slice(index + (content.includes('\r\n') ? 5 : 4)).trim();
try {
  const data = JSON.parse(jsonPart);
  console.log(`Count: ${data.count}`);
  data.results.forEach((r, i) => {
    console.log(`\n[${i}] Title: ${r.title}`);
    console.log(`    ID: ${r.id}`);
    console.log(`    isVirtual: ${r.isVirtual}`);
    console.log(`    virtual: ${JSON.stringify(r.virtual)}`);
  });
} catch (e) {
  console.error("Error parsing JSON:", e);
}
