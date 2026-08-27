import * as THREE from 'three';

/**
 * generateBatitech3DSnapshot — Rendu 3D offscreen du Séchoir BatiTech®
 * Génère une capture PNG haute résolution fidèle au configurateur 3D
 * avec charpente métallique, bardage RAL 7016, toiture solaire Cogen'Air®,
 * cellules de séchage intérieures et local ventilateur extérieur avec toit à 2°.
 *
 * @param {object} params
 * @param {string} params.modelId - 'BT-3.1.15' | 'BT-6.2.15' | 'BT-8.3.15'
 * @param {number} [params.length=36] - Longueur en mètres
 * @param {number} [params.width=20] - Largeur en mètres
 * @param {number} [params.width=800] - Largeur de l'image de sortie
 * @param {number} [params.height=480] - Hauteur de l'image de sortie
 * @returns {Promise<string>} Data URL PNG
 */
export async function generateBatitech3DSnapshot({
  modelId = 'BT-6.2.15',
  length = 36,
  width = 20,
  imgWidth = 800,
  imgHeight = 480
} = {}) {
  try {
    const bLength = Number(length || (modelId === 'BT-8.3.15' ? 48 : modelId === 'BT-6.2.15' ? 36 : 18));
    const bWidth = Number(width || 20);

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
    scene.background = new THREE.Color('#f8fafc');

    // ─── Éclairage Studio & Extérieur ──────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(45, 60, 40);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.6);
    fillLight.position.set(-30, 25, -25);
    scene.add(fillLight);

    // ─── Géométrie BatiTech (AS9.2 Asymétrique) ─────────────────────────────
    const mainSlope = 15 * (Math.PI / 180);
    const rSpan = bWidth * 0.75; // 15m
    const lSpan = bWidth * 0.25; // 5m
    const apexX = -bWidth * 0.25; // -5m
    const rightEaveH = 4.0; // Sablière Sud (X = +10m)
    const ridgeH = rightEaveH + (rSpan * Math.tan(mainSlope)); // ~8.02m
    const leftEaveH = ridgeH - (lSpan * Math.tan(mainSlope)); // ~6.68m

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
      color: '#334155',
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

    const pignonGeo = new THREE.ExtrudeGeometry(pignonShape, { depth: 0.05, bevelEnabled: false });

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

    // 3. Toiture Solaire Photovoltaïque Cogen'Air® (Rampant Sud 15m et Nord 5m)
    const solarMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.2,
      metalness: 0.85
    });
    const solarFrameMat = new THREE.MeshStandardMaterial({
      color: '#0284c7',
      roughness: 0.3,
      metalness: 0.7
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
    const fanWallMat = new THREE.MeshStandardMaterial({ color: '#3f4b5b', roughness: 0.4, metalness: 0.5 });
    const fanRoofMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.3, metalness: 0.7 });
    const fanDoorMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.5, metalness: 0.4 });
    const fanHandleMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', metalness: 0.9, roughness: 0.1 });

    const roomDepth = 2.4;
    const roomHeight = 3.2;
    const roomX = (bWidth / 2) + (roomDepth / 2);
    const fanLen = bLength <= 20 ? 4.0 : (bLength <= 38 ? 8.0 : 8.0);
    const fanZ = bLength <= 20 ? -15 : -18;

    const fanGroup = new THREE.Group();
    fanGroup.position.set(roomX, 0, fanZ);

    const fanMesh = new THREE.Mesh(new THREE.BoxGeometry(roomDepth, roomHeight, fanLen), fanWallMat);
    fanMesh.position.set(0, roomHeight / 2, 0);
    fanMesh.castShadow = true;
    fanGroup.add(fanMesh);

    // Toiture inclinée à 2° vers l'avant
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
    const camera = new THREE.PerspectiveCamera(40, imgWidth / imgHeight, 0.1, 1000);
    const camDist = Math.max(bLength, bWidth) * 0.95 + 10;
    camera.position.set(bWidth * 0.95 + 14, 15, -bLength * 0.25 + camDist * 0.65);
    camera.lookAt(new THREE.Vector3(2, (ridgeH + rightEaveH) * 0.45, -bLength / 2));

    renderer.render(scene, camera);

    const dataUrl = canvas.toDataURL('image/png');

    // Nettoyage WebGL
    renderer.dispose();
    scene.clear();

    return dataUrl;
  } catch (err) {
    console.warn('Erreur rendu 3D offscreen BatiTech:', err);
    return null;
  }
}
