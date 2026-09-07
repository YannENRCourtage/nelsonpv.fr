/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NELSON LOCAL BRIDGE DAEMON
 * Micro-agent local pour l'enregistrement direct et silencieux des offres PDF
 * Dossier cible : C:\Users\Utilisateur\PDF TOITURES
 * ═══════════════════════════════════════════════════════════════════════════
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 4199;
const TARGET_DIR = process.env.PDF_OUTPUT_DIR || path.join(process.env.USERPROFILE || 'C:\\Users\\Utilisateur', 'PDF TOITURES');

// Assurer l'existence du dossier de destination
function ensureTargetDir() {
  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
    console.log(`[Bridge] Dossier créé : ${TARGET_DIR}`);
  }
}

ensureTargetDir();

// Configuration CORS
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

const server = http.createServer((req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. Healthcheck
  if (req.method === 'GET' && req.url === '/health') {
    ensureTargetDir();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      version: '1.0.0',
      targetDir: TARGET_DIR,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // 2. Ouvrir le dossier dans l'Explorateur Windows
  if (req.method === 'POST' && req.url === '/api/open-folder') {
    ensureTargetDir();
    if (process.platform === 'win32') {
      exec(`explorer.exe "${TARGET_DIR}"`);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, targetDir: TARGET_DIR }));
    return;
  }

  // 3. Lister les fichiers enregistrés
  if (req.method === 'GET' && req.url === '/api/list-pdfs') {
    ensureTargetDir();
    try {
      const files = fs.readdirSync(TARGET_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ count: files.length, files, targetDir: TARGET_DIR }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 4. Enregistrement direct d'un PDF (Base64 ou binaire)
  if (req.method === 'POST' && req.url === '/api/save-pdf') {
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
      try {
        const rawBody = Buffer.concat(body).toString('utf8');
        const data = JSON.parse(rawBody);

        let { filename, base64, buffer } = data;
        if (!filename) {
          filename = `Offre_Toiture_${Date.now()}.pdf`;
        }
        if (!filename.toLowerCase().endsWith('.pdf')) {
          filename += '.pdf';
        }

        // Nettoyage du nom de fichier pour Windows
        const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '_');
        const filePath = path.join(TARGET_DIR, safeFilename);

        let pdfBuffer;
        if (base64) {
          // Si préfixé par data:application/pdf;base64,
          const cleanBase64 = base64.replace(/^data:application\/pdf;base64,/, '');
          pdfBuffer = Buffer.from(cleanBase64, 'base64');
        } else if (buffer && Array.isArray(buffer)) {
          pdfBuffer = Buffer.from(buffer);
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Contenu PDF manquant (base64 ou buffer requis)' }));
          return;
        }

        ensureTargetDir();
        fs.writeFileSync(filePath, pdfBuffer);

        console.log(`[Bridge] ✅ PDF enregistré : ${safeFilename} (${(pdfBuffer.length / 1024).toFixed(1)} Ko)`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          filename: safeFilename,
          fullPath: filePath,
          sizeBytes: pdfBuffer.length
        }));
      } catch (err) {
        console.error('[Bridge] ❌ Erreur écriture fichier:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Route non trouvée' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n══════════════════════════════════════════════════════════════════════`);
  console.log(`  🚀 NELSON LOCAL BRIDGE CONNECTÉ SUR http://127.0.0.1:${PORT}`);
  console.log(`  📁 Dossier cible : ${TARGET_DIR}`);
  console.log(`  🟢 Prêt à recevoir et enregistrer silencieusement les PDF`);
  console.log(`══════════════════════════════════════════════════════════════════════\n`);
});
