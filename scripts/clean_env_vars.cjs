const { execSync } = require('child_process');
const fs = require('fs');

const envs = [
  { name: 'ENEDIS_CLIENT_ID', value: 'LZbBqEykwlKJelO_p2_En2pf0vYa' },
  { name: 'ENEDIS_CLIENT_SECRET', value: 'NL7NJSoL1OlNNLy4F0gXw0852gga' },
  { name: 'ENEDIS_REDIRECT_URI', value: 'https://www.nelsonpv.fr/api/enedis/callback' }
];

const targets = ['production', 'preview', 'development'];

for (const env of envs) {
  for (const target of targets) {
    try {
      console.log(`Removing ${env.name} from ${target}...`);
      execSync(`npx vercel env rm ${env.name} ${target} --yes`, { stdio: 'ignore' });
    } catch (e) {
      // Ignore errors if it doesn't exist
    }
  }
}

for (const env of envs) {
  const tempFile = `temp_${env.name}.txt`;
  fs.writeFileSync(tempFile, env.value, 'utf8'); // Clean UTF-8, no newlines

  for (const target of targets) {
    try {
      console.log(`Adding ${env.name} to ${target}...`);
      execSync(`npx vercel env add ${env.name} ${target} < ${tempFile}`, { stdio: 'inherit' });
    } catch (e) {
      console.error(`Failed to add ${env.name} to ${target}: ${e.message}`);
    }
  }
  
  fs.unlinkSync(tempFile);
}
console.log('Done cleaning env vars.');
