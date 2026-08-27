import * as THREE from 'three';

/**
 * generateBatitech3DSnapshot — Rendu 3D offscreen ultra-fidèle du Séchoir BatiTech®
 * avec cotations précises projetées (longueur, largeur, faîtage, sablière Sud, sablière Nord)
 *
 * @param {object} params
 * @param {string} params.modelId - 'BT-3.1.15' | 'BT-6.2.15' | 'BT-8.3.15'
 * @param {number} [params.length=36] - Longueur en mètres
 * @param {number} [params.width=20] - Largeur en mètres
 * @param {number} [params.imgWidth=1200] - Largeur de l'image de sortie
 * @param {number} [params.imgHeight=720] - Hauteur de l'image de sortie
 * @param {boolean} [params.showDimensions=true] - Afficher les cotations
 * @returns {Promise<string>} Data URL PNG
 */
export async function generateBatitech3DSnapshot({
  modelId = 'BT-6.2.15',
  length = 36,
  width = 20,
  imgWidth = 1200,
  imgHeight = 720,
  showDimensions = true
} = {}) {
  try {
    const bLength = Number(length || (modelId === 'BT-8.3.15' ? 48 : modelId === 'BT-6.2.15' ? 36 : 18));
    const bWidth = Number(width || 20);
    const kwcVal = modelId === 'BT-8.3.15' ? '83.8 kWc' : (modelId === 'BT-6.2.15' ? '63.30 kWc' : '30.15 kWc');
    const surfaceVal = `${bLength * bWidth} m²`;

    const canvas = document.createElement('canvas');
    canvas.width = imgWidth;
    canvas.height = imgHeight;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: true
    });
    renderer.setSize(imgWidth, imgHeight);
    renderer.setPixelRatio(2);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f1f5f9');

    // ─── Éclairage Studio & Extérieur ──────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(50, 65, 45);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xbae6fd, 0.7);
    fillLight.position.set(-40, 30, -30);
    scene.add(fillLight);

    // ─── Géométrie BatiTech (AS9.2 Asymétrique) ─────────────────────────────
    const mainSlope = 15 * (Math.PI / 180);
    const rSpan = bWidth * 0.75; // 15m
    const lSpan = bWidth * 0.25; // 5m
    const apexX = -bWidth * 0.25; // -5m
    const rightEaveH = 4.0; // Sablière Sud (X = +10m)
    const ridgeH = 8.40; // Faîtage
    const leftEaveH = 7.40; // Sablière Nord

    const group = new THREE.Group();

    // 1. Dalle béton au sol
    const slabGeo = new THREE.BoxGeometry(bWidth + 4, 0.2, bLength + 4);
    const slabMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.9 });
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.position.set(0, -0.1, -bLength / 2);
    slab.receiveShadow = true;
    group.add(slab);

    // 2. Bardage Métallique Anthracite RAL 7016 (3 faces : Sud, Est, Ouest)
    const metalMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.35,
      metalness: 0.65,
      side: THREE.DoubleSide
    });

    // Pignons Est & Ouest (décalés de 10cm vers l'extérieur)
    const pignonShape = new THREE.Shape();
    pignonShape.moveTo(-bWidth / 2, 0);
    pignonShape.lineTo(bWidth / 2, 0);
    pignonShape.lineTo(bWidth / 2, rightEaveH);
    pignonShape.lineTo(apexX, ridgeH);
    pignonShape.lineTo(-bWidth / 2, leftEaveH);
    pignonShape.closePath();

    const pignonGeo = new THREE.ExtrudeGeometry(pignonShape, { depth: 0.06, bevelEnabled: false });

    // Pignon Est (avant)
    const pignonEst = new THREE.Mesh(pignonGeo, metalMat);
    pignonEst.position.set(0, 0, 0.10);
    pignonEst.castShadow = true;
    group.add(pignonEst);

    // Pignon Ouest (arrière)
    const pignonOuest = new THREE.Mesh(pignonGeo, metalMat);
    pignonOuest.position.set(0, 0, -bLength - 0.10);
    pignonOuest.castShadow = true;
    group.add(pignonOuest);

    // Façade Long Pan Sud (X = +10m)
    const southGeo = new THREE.BoxGeometry(0.06, rightEaveH, bLength);
    const southCladding = new THREE.Mesh(southGeo, metalMat);
    southCladding.position.set(bWidth / 2, rightEaveH / 2, -bLength / 2);
    southCladding.castShadow = true;
    group.add(southCladding);

    // 3. Toiture Solaire Photovoltaïque Cogen'Air®
    const solarMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.18,
      metalness: 0.85
    });

    // Pan Sud (15m de rampant)
    const southRampLen = Math.sqrt(Math.pow(rSpan, 2) + Math.pow(ridgeH - rightEaveH, 2));
    const southRoofGeo = new THREE.BoxGeometry(southRampLen, 0.08, bLength + 0.4);
    const southRoof = new THREE.Mesh(southRoofGeo, solarMat);
    const southRoofCenterX = (apexX + bWidth / 2) / 2;
    const southRoofCenterY = (ridgeH + rightEaveH) / 2 + 0.04;
    southRoof.position.set(southRoofCenterX, southRoofCenterY, -bLength / 2);
    southRoof.rotation.set(0, 0, -mainSlope);
    southRoof.castShadow = true;
    group.add(southRoof);

    // Pan Nord (5m de rampant)
    const northRampLen = Math.sqrt(Math.pow(lSpan, 2) + Math.pow(ridgeH - leftEaveH, 2));
    const northRoofGeo = new THREE.BoxGeometry(northRampLen, 0.08, bLength + 0.4);
    const northRoof = new THREE.Mesh(northRoofGeo, metalMat);
    const northRoofCenterX = (-bWidth / 2 + apexX) / 2;
    const northRoofCenterY = (leftEaveH + ridgeH) / 2 + 0.04;
    northRoof.position.set(northRoofCenterX, northRoofCenterY, -bLength / 2);
    northRoof.rotation.set(0, 0, mainSlope);
    northRoof.castShadow = true;
    group.add(northRoof);

    // 4. Locaux Ventilateurs Extérieurs devant la façade Sud
    const fanWallMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.4, metalness: 0.5 });
    const fanRoofMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.3, metalness: 0.7 });
    const fanDoorMat = new THREE.MeshStandardMaterial({ color: '#020617', roughness: 0.5, metalness: 0.4 });
    const fanHandleMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', metalness: 0.9, roughness: 0.1 });

    const roomDepth = 2.4;
    const roomHeight = 3.2;
    const roomX = (bWidth / 2) + (roomDepth / 2);
    const fanLen = bLength <= 20 ? 4.0 : 8.0;
    const fanZ = -bLength / 2;

    const fanGroup = new THREE.Group();
    fanGroup.position.set(roomX, 0, fanZ);

    const fanMesh = new THREE.Mesh(new THREE.BoxGeometry(roomDepth, roomHeight, fanLen), fanWallMat);
    fanMesh.position.set(0, roomHeight / 2, 0);
    fanMesh.castShadow = true;
    fanGroup.add(fanMesh);

    // Toiture inclinée à 2° vers l'avant (X)
    const fanRoof = new THREE.Mesh(new THREE.BoxGeometry(roomDepth + 0.3, 0.08, fanLen + 0.3), fanRoofMat);
    fanRoof.position.set(0, roomHeight + 0.06, 0);
    fanRoof.rotation.set(0, 0, -2 * (Math.PI / 180));
    fanRoof.castShadow = true;
    fanGroup.add(fanRoof);

    // Portes techniques fermées
    const door1 = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.1), fanDoorMat);
    door1.position.set(roomDepth / 2 + 0.01, 1.05, fanLen >= 8 ? 1.8 : 0);
    fanGroup.add(door1);

    const handle1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.03), fanHandleMat);
    handle1.position.set(roomDepth / 2 + 0.02, 1.05, (fanLen >= 8 ? 1.8 : 0) + 0.35);
    fanGroup.add(handle1);

    if (fanLen >= 8) {
      const door2 = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.1), fanDoorMat);
      door2.position.set(roomDepth / 2 + 0.01, 1.05, -1.8);
      fanGroup.add(door2);

      const handle2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.03), fanHandleMat);
      handle2.position.set(roomDepth / 2 + 0.02, 1.05, -1.8 + 0.35);
      fanGroup.add(handle2);
    }
    group.add(fanGroup);

    // 5. Structure Portiques Métalliques IPE
    const frameMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.4, metalness: 0.8 });
    const bayCount = Math.round(bLength / 6);
    for (let i = 0; i <= bayCount; i++) {
      const zP = -i * 6;
      // Poteau Sud
      const postSud = new THREE.Mesh(new THREE.BoxGeometry(0.25, rightEaveH, 0.25), frameMat);
      postSud.position.set(bWidth / 2 - 0.15, rightEaveH / 2, zP);
      group.add(postSud);
      // Poteau Nord
      const postNord = new THREE.Mesh(new THREE.BoxGeometry(0.25, leftEaveH, 0.25), frameMat);
      postNord.position.set(-bWidth / 2 + 0.15, leftEaveH / 2, zP);
      group.add(postNord);
    }

    scene.add(group);

    // ─── Caméra 3D & Cadrage Professionnel ───────────────────────────────────
    const camera = new THREE.PerspectiveCamera(38, imgWidth / imgHeight, 0.1, 1000);
    const camDist = Math.max(bLength, bWidth) * 0.95 + 12;
    camera.position.set(bWidth * 0.90 + 13, 14, -bLength * 0.25 + camDist * 0.65);
    camera.lookAt(new THREE.Vector3(1.5, (ridgeH + rightEaveH) * 0.45, -bLength / 2));
    camera.updateMatrixWorld();

    renderer.render(scene, camera);

    // ─── 2D OVERLAY POUR COTATIONS ET BADGES TECHNIQUES ──────────────────────
    const outCanvas = document.createElement('canvas');
    outCanvas.width = imgWidth;
    outCanvas.height = imgHeight;
    const ctx = outCanvas.getContext('2d');

    // 1. Dessiner le rendu 3D
    ctx.drawImage(canvas, 0, 0);

    // 2. Helper de projection 3D vers 2D
    const project = (x, y, z) => {
      const v = new THREE.Vector3(x, y, z);
      v.project(camera);
      return {
        x: ((v.x + 1) / 2) * imgWidth,
        y: ((-v.y + 1) / 2) * imgHeight
      };
    };

    if (showDimensions) {
      ctx.strokeStyle = '#0f172a';
      ctx.fillStyle = '#0f172a';
      ctx.lineWidth = 2.5;

      // Fonction pour tracer une ligne de cotation avec embouts et texte
      const drawDim = (p1, p2, label, offsetPx = { x: 0, y: 0 }) => {
        const x1 = p1.x + offsetPx.x;
        const y1 = p1.y + offsetPx.y;
        const x2 = p2.x + offsetPx.x;
        const y2 = p2.y + offsetPx.y;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Flèches / embouts
        const cap = 7;
        ctx.beginPath();
        ctx.arc(x1, y1, 4, 0, Math.PI * 2);
        ctx.arc(x2, y2, 4, 0, Math.PI * 2);
        ctx.fill();

        // Texte de cotation avec fond blanc lisible
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        ctx.font = 'bold 20px Montserrat, Arial, sans-serif';
        const txtW = ctx.measureText(label).width;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(midX - txtW / 2 - 8, midY - 14, txtW + 16, 26);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(midX - txtW / 2 - 8, midY - 14, txtW + 16, 26);

        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, midX, midY);
      };

      // 1. Cotation Sablière Sud (4.00 m)
      const pSudBas = project(bWidth / 2 + 0.8, 0, 0.2);
      const pSudHaut = project(bWidth / 2 + 0.8, rightEaveH, 0.2);
      drawDim(pSudBas, pSudHaut, '4.00 m');

      // 2. Cotation Faîtage (8.40 m) — légèrement en extérieur
      const pFaitBas = project(apexX - 0.8, 0, 0.8);
      const pFaitHaut = project(apexX - 0.8, ridgeH, 0.8);
      drawDim(pFaitBas, pFaitHaut, '8.40 m');

      // 3. Cotation Sablière Nord (7.40 m)
      const pNordBas = project(-bWidth / 2 - 0.8, 0, 0.2);
      const pNordHaut = project(-bWidth / 2 - 0.8, leftEaveH, 0.2);
      drawDim(pNordBas, pNordHaut, '7.40 m');

      // 4. Cotation Largeur Pignon (20.00 m)
      const pLargG = project(-bWidth / 2, 0, 2.8);
      const pLargD = project(bWidth / 2, 0, 2.8);
      drawDim(pLargG, pLargD, `${bWidth}.00 m`);

      // 5. Cotation Longueur Façade (36.00 m / 48.00 m / 18.00 m)
      const pLongAv = project(bWidth / 2 + roomDepth + 1.2, 0, 0);
      const pLongAr = project(bWidth / 2 + roomDepth + 1.2, 0, -bLength);
      drawDim(pLongAv, pLongAr, `${bLength}.00 m`);
    }

    // ─── BADGES OFFICIELS EN HAUT À GAUCHE (Image 5) ────────────────────────
    // Badge 1 : Dimensions & Surface
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(24, 24, 320, 48, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = '900 20px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${bLength}.00m × ${bWidth}.00m — ${surfaceVal}`, 42, 48);

    // Badge 2 : Puissance Solaire
    ctx.fillStyle = '#fffbeb';
    ctx.strokeStyle = '#fde68a';
    ctx.beginPath();
    ctx.roundRect(24, 82, 180, 40, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#d97706';
    ctx.font = 'bold 18px Montserrat, Arial, sans-serif';
    ctx.fillText(`⚡ ${kwcVal}`, 40, 102);

    const finalDataUrl = outCanvas.toDataURL('image/png');

    // Nettoyage WebGL
    renderer.dispose();
    scene.clear();

    return finalDataUrl;
  } catch (err) {
    console.warn('Erreur rendu 3D offscreen BatiTech:', err);
    return null;
  }
}
