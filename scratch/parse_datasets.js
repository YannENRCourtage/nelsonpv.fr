const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\Utilisateur\\.gemini\\antigravity\\brain\\8a054f40-14fb-4caa-ab8a-e9cadbef3aed\\.system_generated\\steps\\245\\content.md', 'utf8');

// Find the JSON start after the markdown frontmatter separator "---"
const separator = '---\n';
const index = content.indexOf(separator);
if (index === -1) {
  console.log("Could not find separator");
  process.exit(1);
}
const jsonPart = content.slice(index + separator.length).trim();
try {
  const data = JSON.parse(jsonPart);
  console.log(`Count: ${data.count}`);
  data.results.forEach((r, i) => {
    console.log(`\n[${i}] Title: ${r.title}`);
    console.log(`    ID: ${r.id}`);
    console.log(`    isVirtual: ${r.isVirtual}`);
    console.log(`    virtual: ${JSON.stringify(r.virtual)}`);
    console.log(`    owner: ${r.owner ? r.owner.name : 'none'}`);
  });
} catch (e) {
  console.error("Error parsing JSON:", e);
}
