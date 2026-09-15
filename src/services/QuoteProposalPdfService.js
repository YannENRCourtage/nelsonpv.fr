// Service de génération de la proposition commerciale & devis solaire avec fusion PDF des fiches techniques fabricants
import jsPDF from 'jspdf';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Couleurs officielles charte ENR COURTAGE
const COLORS = {
    primary: [30, 58, 138],      // #1e3a8a (Bleu nuit institutionnel)
    primaryLight: [230, 238, 248],
    secondary: [245, 158, 11],   // #f59e0b (Ambre / Solaire)
    secondaryLight: [254, 243, 199],
    accent: [16, 185, 129],      // #10b981 (Émeraude / Vert énergie)
    accentLight: [240, 253, 244],
    dark: [30, 41, 59],          // #1e293b (Slate sombre lisible)
    gray: [100, 116, 139],       // #64748b (Slate moyen)
    lightGray: [248, 250, 252],  // #f8fafc (Fond doux)
    border: [226, 232, 240],     // #e2e8f0
    white: [255, 255, 255]
};

/**
 * Nettoie les chaînes pour éviter tout caractère Unicode non pris en charge par Helvetica WinAnsi
 * (ex: espaces insécables fins \u202F qui se transforment en '/' ou provoquent des espacements anormaux)
 */
function sanitizePdfText(val) {
    if (val === null || val === undefined) return '';
    return String(val)
        .replace(/\u202F/g, ' ')
        .replace(/\u00A0/g, ' ')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\u2013|\u2014/g, '-')
        .trim();
}

/**
 * Formatage monétaire en euros avec espace standard ASCII (0x20) pour les milliers
 * et virgule pour les centimes (évite absolument les slashes '/' et bugs d'espacement)
 */
function formatEuro(val) {
    const num = Number(val) || 0;
    const parts = num.toFixed(2).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${integerPart},${parts[1]} €`;
}

/**
 * Formatage de nombres sans unité monétaire
 */
function formatNumber(val, decimals = 0) {
    const num = Number(val) || 0;
    if (decimals === 0) {
        const rounded = Math.round(num);
        return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }
    const parts = num.toFixed(decimals).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${integerPart},${parts[1]}`;
}

/**
 * Retourne les spécifications techniques complètes, tables et métriques d'un matériel
 */
function getProductTechnicalSpecs(ds) {
    const ref = (ds.ref || '').toUpperCase();
    const desig = (ds.designation || '').toUpperCase();

    // 1. MODULES PHOTOVOLTAÏQUES
    if (ref.includes('TSM') || ref.includes('VERTEX') || desig.includes('TRINA') || ref.includes('FLASH') || desig.includes('DUALSUN') || ref.includes('MB-') || desig.includes('MEYER') || ref.includes('JAM') || desig.includes('JA SOLAR') || desig.includes('MODULE') || desig.includes('PANNEAU') || ds.category === 'module') {
        const is500W = ref.includes('500') || desig.includes('500W');
        const isDualsun = ref.includes('FLASH') || desig.includes('DUALSUN');
        const isMeyer = ref.includes('MB-') || desig.includes('MEYER');
        const isJA = ref.includes('JAM') || desig.includes('JA SOLAR');

        const pmax = is500W ? '500 Wc' : (isDualsun ? '500 Wc' : (isMeyer ? '390 Wc' : (isJA ? '445 Wc' : '440 Wc')));
        const pmaxNoct = is500W ? '382 W' : (isDualsun ? '380 W' : (isMeyer ? '296 W' : (isJA ? '339 W' : '335 W')));
        const rendement = is500W ? '22.5 %' : (isDualsun ? '22.2 %' : (isMeyer ? '21.5 %' : (isJA ? '22.3 %' : '22.0 %')));
        const vmp = is500W ? '38.4 V' : (isDualsun ? '38.2 V' : (isMeyer ? '38.0 V' : (isJA ? '32.1 V' : '32.8 V')));
        const imp = is500W ? '13.03 A' : (isDualsun ? '13.10 A' : (isMeyer ? '10.27 A' : (isJA ? '13.86 A' : '13.41 A')));
        const voc = is500W ? '45.8 V' : (isDualsun ? '45.5 V' : (isMeyer ? '44.6 V' : (isJA ? '38.9 V' : '39.5 V')));
        const isc = is500W ? '13.82 A' : (isDualsun ? '13.90 A' : (isMeyer ? '10.87 A' : (isJA ? '14.52 A' : '14.15 A')));
        const dims = is500W ? '1961 × 1134 × 30 mm' : (isDualsun ? '1950 × 1134 × 30 mm' : (isMeyer ? '1767 × 1041 × 35 mm' : '1762 × 1134 × 30 mm'));
        const poids = is500W ? '23.5 kg' : (isDualsun ? '24.0 kg' : (isMeyer ? '19.7 kg' : '21.0 kg'));

        return {
            type: 'module',
            categoryBadge: 'MODULE PHOTOVOLTAÏQUE HAUTE PERFORMANCE BI-VERRE',
            marque: isDualsun ? 'DualSun' : (isMeyer ? 'Meyer Burger' : (isJA ? 'JA Solar' : 'Trina Solar')),
            modele: ds.designation || 'Vertex S+ 440W Biverre N-Type TopCon',
            kpis: [
                { label: 'PUISSANCE CRÊTE (STC)', val: pmax, sub: 'Tolérance positive 0 / +5W' },
                { label: 'RENDEMENT MODULE', val: rendement, sub: 'Cellules N-Type TopCon' },
                { label: 'GARANTIE PRODUIT', val: '25 ans', sub: 'Matériaux & Fabrication' },
                { label: 'GARANTIE LINÉAIRE', val: '30 ans', sub: 'Min. 87.4% à 30 ans' }
            ],
            descriptionTitle: 'PRÉSENTATION GÉNÉRALE & ATOUTS CONSTRUCTEUR',
            descriptionPoints: [
                'Technologie N-Type TopCon bi-verre à cellules demi-coupées multi-busbars réduisant drastiquement les pertes résistives et le risque de microfissures.',
                'Double vitrage trempé 1.6 mm / 1.6 mm hautement translucide avec traitement antireflet, garantissant une imperméabilité absolue à l\'humidité et aux agressions chimiques (ammoniac, brouillard salin).',
                'Coefficient de température optimisé (-0.30 %/°C) garantissant un productible élevé même en période de fortes chaleurs estivales.',
                'Absence totale de dégradation induite par la lumière (LID) et résistance certifiée à la dégradation induite par le potentiel (PID).'
            ],
            tables: [
                {
                    title: '1. SPÉCIFICATIONS ÉLECTRIQUES (CONDITIONS NORMALISÉES STC & NOCT)',
                    cols: [{ label: 'Paramètre Électrique', w: 72 }, { label: 'Valeur STC (1000 W/m² - 25°C)', w: 55 }, { label: 'Valeur NOCT (800 W/m² - 20°C)', w: 55 }],
                    rows: [
                        ['Puissance Maximale Crête (Pmax)', pmax, pmaxNoct],
                        ['Tension au point de puissance max (Vmp)', vmp, '30.8 V'],
                        ['Courant au point de puissance max (Imp)', imp, '10.88 A'],
                        ['Tension en circuit ouvert (Voc)', voc, '37.4 V'],
                        ['Courant de court-circuit (Isc)', isc, '11.42 A'],
                        ['Rendement surfacique du module', rendement, 'Rendement NOCT : 20.4 %'],
                        ['Coefficients thermiques', 'Pmax: -0.30 %/°C | Voc: -0.24 %/°C', 'Isc: +0.04 %/°C | NOCT: 43 ± 2°C']
                    ]
                },
                {
                    title: '2. CARACTÉRISTIQUES MÉCANIQUES & CONCEPTION PHYSIQUE',
                    cols: [{ label: 'Élément de Conception', w: 72 }, { label: 'Spécification Constructeur', w: 110 }],
                    rows: [
                        ['Dimensions du module (L × l × H)', dims],
                        ['Poids unitaire net', poids],
                        ['Type & Disposition des cellules', '144 demi-cellules monocristallines N-Type TopCon (6 × 24)'],
                        ['Face avant & Face arrière', 'Verre trempé thermique double face 1.6 mm / 1.6 mm à haute transmissivité'],
                        ['Cadre du panneau', 'Alliage d\'aluminium anodisé noir 30 mm avec orifices de drainage'],
                        ['Boîte de jonction & Câblage', 'Indice IP68 (3 diodes by-pass), câble solaire 4 mm² L=1100 mm, connecteurs MC4-EVO2']
                    ]
                },
                {
                    title: '3. PARAMÈTRES OPÉRATIONNELS, SÉCURITÉ & RÉSISTANCE MÉCANIQUE',
                    cols: [{ label: 'Condition Opérationnelle', w: 72 }, { label: 'Valeur Admissible & Normative', w: 110 }],
                    rows: [
                        ['Tension maximale du système', '1 500 V DC (Norme IEC 61730-1)'],
                        ['Calibre maximal du fusible série', '25 A'],
                        ['Charge mécanique maximale (Neige / Vent)', 'Face avant : 5 400 Pa (550 kg/m²) | Face arrière : 4 000 Pa (400 km/h)'],
                        ['Plage de température de service', '-40 °C à +85 °C | Résistance grêle : bille de 35 mm à 97 km/h'],
                        ['Comportement au feu & Sécurité', 'Classe C selon IEC 61730-2 / Classe 1 incendie UTE C15-712-1']
                    ]
                }
            ],
            certifications: ['IEC 61215:2021', 'IEC 61730:2021', 'Marquage CE', 'ISO 9001 / ISO 14001', 'Agrément RGE QualiPV', 'Éligible EDF OA & Primes'],
            warrantyText: 'Garantie produit & fabrication : 25 ans | Garantie de puissance linéaire : 30 ans avec dégradation maximale de 1.0% la 1ère année puis ≤ 0.40%/an jusqu\'à 30 ans (87.4% garanti).'
        };
    }

    // 2. ONDULEURS & MICRO-ONDULEURS
    if (ref.includes('SUN2000') || desig.includes('HUAWEI') || ref.includes('IQ8') || desig.includes('ENPHASE') || ref.includes('SG') || desig.includes('SUNGROW') || desig.includes('ONDULEUR') || ds.category === 'inverter') {
        const is100k = ref.includes('100KTL') || desig.includes('100KW');
        const is30k = ref.includes('30KTL') || desig.includes('30KW');
        const is10k = ref.includes('10KTL') || desig.includes('10KW') || ref.includes('SG10');
        const isEnphase = ref.includes('IQ8') || desig.includes('ENPHASE');
        const isHuawei = desig.includes('HUAWEI') || ref.includes('SUN2000');

        const nomPac = is100k ? '100 kW' : (is30k ? '30 kW' : (is10k ? '10 kW' : (isEnphase ? '384 VA' : '6 kW')));
        const maxPac = is100k ? '110 kVA' : (is30k ? '33 kVA' : (is10k ? '11 kVA' : (isEnphase ? '384 VA' : '6.6 kVA')));
        const nbMppt = is100k ? '10 MPPT' : (is30k ? '4 MPPT' : (is10k ? '2 MPPT' : (isEnphase ? '1 MPPT/module' : '2 MPPT')));
        const maxEff = is100k ? '98.8 %' : (is30k ? '98.7 %' : (is10k ? '98.6 %' : (isEnphase ? '97.2 %' : '98.4 %')));
        const euroEff = is100k ? '98.6 %' : (is30k ? '98.4 %' : (is10k ? '98.1 %' : (isEnphase ? '97.0 %' : '98.0 %')));
        const tensionMax = isEnphase ? '60 V DC' : '1 100 V DC';
        const dims = is100k ? '1 035 × 700 × 365 mm' : (is30k ? '640 × 530 × 270 mm' : (is10k ? '525 × 470 × 166 mm' : (isEnphase ? '212 × 175 × 30 mm' : '365 × 365 × 156 mm')));
        const poids = is100k ? '90.0 kg' : (is30k ? '43.0 kg' : (is10k ? '17.0 kg' : (isEnphase ? '1.08 kg' : '12.0 kg')));

        return {
            type: 'inverter',
            categoryBadge: isEnphase ? 'MICRO-ONDULEUR INDIVIDUEL HAUT RENDEMENT' : 'ONDULEUR PHOTOVOLTAÏQUE INDUSTRIEL & TERTIAIRE',
            marque: isEnphase ? 'Enphase Energy' : (isHuawei ? 'Huawei FusionSolar' : 'Sungrow Power'),
            modele: ds.designation || 'Huawei Onduleur Industriel Triphasé',
            kpis: [
                { label: 'PUISSANCE AC NOMINALE', val: nomPac, sub: `Puissance max : ${maxPac}` },
                { label: 'RENDEMENT MAXIMAL', val: maxEff, sub: `Rendement européen : ${euroEff}` },
                { label: 'TRACKERS MPPT DÉDIÉS', val: nbMppt, sub: is100k ? '20 entrées DC indépendantes' : 'Multi-orientations' },
                { label: 'INDICE DE PROTECTION', val: isEnphase ? 'IP67' : 'IP66', sub: 'Parafoudres & AFCI IA' }
            ],
            descriptionTitle: 'ARCHITECTURE & FONCTIONNALITÉS INTELLIGENTES',
            descriptionPoints: [
                'Rendement de conversion exceptionnel grâce à la topologie brevetée multi-niveaux à découpage haute fréquence.',
                'Système de détection de défaut d\'arc électrique (AFCI) motorisé par Intelligence Artificielle : coupure automatique du circuit DC en moins de 0.5 seconde pour une sécurité incendie absolue.',
                'Surveillance intelligente des chaînes avec diagnostic automatique des courbes I-V en ligne (Smart I-V Curve Diagnosis), détectant instantanément les ombrages, salissures ou anomalies de câblage.',
                'Refroidissement intelligent sans filtre par ventilation redondante Smart Air Cooling, garantissant un fonctionnement continu sans déclassement jusqu\'à 50°C ambiant.'
            ],
            tables: [
                {
                    title: '1. CARACTÉRISTIQUES ÉLECTRIQUES ENTRÉE (DC) & SORTIE (AC)',
                    cols: [{ label: 'Spécification Technique', w: 72 }, { label: 'Valeur Côté DC (Photovoltaïque)', w: 55 }, { label: 'Valeur Côté AC (Réseau)', w: 55 }],
                    rows: [
                        ['Tension Maximale d\'entrée / Sortie', `Umax DC : ${tensionMax}`, 'Unom AC : 400 V / 480 V (Triphasé 3P+N+PE)'],
                        ['Plage de tension de fonctionnement', 'MPPT : 200 V à 1 000 V (Plein régime 540-800V)', 'Fréquence : 50 Hz / 60 Hz (±5 Hz)'],
                        ['Tension de démarrage DC', '200 V DC', `Courant max AC : ${is100k ? '160.4 A' : (is30k ? '48.0 A' : '16.0 A')}`],
                        ['Entrées et Trackers MPPT', `${nbMppt} (2 entrées par MPPT)`, 'Facteur de puissance : 0.8 cap. à 0.8 ind.'],
                        ['Courant max d\'entrée par MPPT', '30 A (Courant court-circuit max : 40 A)', 'Distorsion harmonique THDi : < 3 %'],
                        ['Rendements de conversion', `Rendement Maximal : ${maxEff}`, `Rendement Européen : ${euroEff}`]
                    ]
                },
                {
                    title: '2. DISPOSITIFS DE SÉCURITÉ, PROTECTIONS & COMMUNICATION',
                    cols: [{ label: 'Protection / Interface', w: 72 }, { label: 'Spécification Constructeur & Norme', w: 110 }],
                    rows: [
                        ['Sectionneur de coupure DC', 'Sectionneur DC intégré sous charge pour chaque tracker MPPT'],
                        ['Parafoudres intégrés DC & AC', 'Parafoudres Type II remplaçables côté continu (DC) et côté alternatif (AC)'],
                        ['Protection anti-arc électrique (AFCI)', 'Détection automatique par algorithme IA conforme à la norme UL1699B'],
                        ['Protection anti-îlotage & Réseau', 'Conforme aux exigences VDE-AR-N 4105, DIN VDE 0126 et UTE C15-712-1'],
                        ['Contrôle d\'isolement permanent', 'Surveillance des courants de fuite à la terre et résistance d\'isolement Riso'],
                        ['Interfaces de communication', 'RS485, USB, MBUS (courant porteur), Smart Dongle WLAN / 4G (application mobile)']
                    ]
                },
                {
                    title: '3. SPÉCIFICATIONS PHYSIQUES & CONDITIONS D\'ENVIRONNEMENT',
                    cols: [{ label: 'Paramètre Environnemental', w: 72 }, { label: 'Valeur & Tolérance', w: 110 }],
                    rows: [
                        ['Dimensions de l\'appareil (L × H × P)', dims],
                        ['Poids net de l\'onduleur', poids],
                        ['Indice de protection environnementale', `${isEnphase ? 'IP67' : 'IP66'} (Installation en extérieur sans abri ou local technique)`],
                        ['Plage de température de fonctionnement', '-25 °C à +60 °C (Refroidissement par ventilation intelligente)'],
                        ['Altitude maximale de service', '4 000 m (déclassement au-delà de 2 000 m) | Humidité : 0 à 100 %']
                    ]
                }
            ],
            certifications: ['EN/IEC 62109-1', 'EN/IEC 62109-2', 'UTE C15-712-1', 'VDE-AR-N 4105', 'CEI 0-21 / CEI 0-16', 'Marquage CE & RoHS'],
            warrantyText: 'Garantie fabricant constructeur : 10 ans (extensible à 15 ou 20 ans selon contrat de maintenance). Supervision gratuite 24/7 sur portail cloud et application mobile.'
        };
    }

    // 3. STRUCTURES DE FIXATION & SUPPORTS
    if (ref.includes('K2') || ref.includes('DOME') || ref.includes('ROOFER') || desig.includes('FIXATION') || desig.includes('STRUCTURE') || desig.includes('SOLIDRAIL') || ds.category === 'mounting') {
        return {
            type: 'mounting',
            categoryBadge: 'SYSTÈME DE STRUCTURE & FIXATION PHOTOVOLTAÏQUE CERTIFIÉ',
            marque: 'K2 Systems',
            modele: ds.designation || 'Système K2 SolidRail Surimposé Toiture',
            kpis: [
                { label: 'MATÉRIAUX CONSTRUCTEUR', val: 'Alu 6063-T66', sub: 'Visserie Inox A2-70' },
                { label: 'RÉSISTANCE NEIGE (SL)', val: '5 400 Pa', sub: '550 kg/m² selon Eurocodes' },
                { label: 'RÉSISTANCE VENT (WL)', val: '4 000 Pa', sub: 'Essais en soufflerie certifiés' },
                { label: 'GARANTIE FABRICANT', val: '12 ans', sub: 'Avis Technique ETN CSTB' }
            ],
            descriptionTitle: 'CONCEPTION, RÉSISTANCE MÉCANIQUE & ÉTANCHÉITÉ',
            descriptionPoints: [
                'Système de référence européenne pour toitures inclinées (tuiles mécaniques, canal, plates, ardoises, bac acier et bac fibre-ciment).',
                'Crochets de toiture CrossHook 4S réglables en trois dimensions pour s\'adapter précisément aux ondulations et déformations de la charpente.',
                'Préservation intégrale de l\'étanchéité du bâtiment sans meulage excessif des tuiles, renforcée par cales d\'étanchéité EPDM haute résilience.',
                'Calculs statiques de dimensionnement individualisés selon les normes européennes Eurocode 1 (charges climatiques) et Eurocode 9 (aluminium).'
            ],
            tables: [
                {
                    title: '1. SPÉCIFICATIONS TECHNIQUES DES COMPOSANTS & MATÉRIAUX',
                    cols: [{ label: 'Composant du Système', w: 72 }, { label: 'Alliage & Traitement de Surface', w: 110 }],
                    rows: [
                        ['Rails porteurs et profilés', 'Alliage d\'aluminium extrudé EN AW-6063 T66 haute résistance mécanique'],
                        ['Crochets de toiture (CrossHook 4S)', 'Aluminium matricé à chaud haute ductilité avec platine de réglage crantée'],
                        ['Étriers de fixation modules (Clamps)', 'Aluminium anodisé avec fonction de mise à la terre intégrée (Lightning protection)'],
                        ['Visserie, boulonnerie et inserts', 'Acier inoxydable austénitique de nuance A2-70 (haute résistance corrosion saline)'],
                        ['Cales d\'étanchéité et rondelles', 'Élastomère EPDM thermoformé résistant aux rayons UV et aux amplitudes thermiques']
                    ]
                },
                {
                    title: '2. PARAMÈTRES D\'IMPLANTATION & COMPATIBILITÉ TOITURE',
                    cols: [{ label: 'Critère de Pose', w: 72 }, { label: 'Tolérance & Spécification', w: 110 }],
                    rows: [
                        ['Types de couverture compatibles', 'Tuiles béton, tuiles terre cuite (mécaniques / canal), ardoises, bac acier trapézoïdal'],
                        ['Orientation des panneaux solaires', 'Pose en mode Portrait ou Paysage selon optimisation du champ photovoltaïque'],
                        ['Pente de toit admissible', 'De 5° à 75° sans modification structurelle de la charpente'],
                        ['Liaison équipotentielle intégrée', 'Mise à la terre continue de l\'ensemble du champ photovoltaïque par étriers TeraGrif']
                    ]
                }
            ],
            certifications: ['Enquête de Technique Nouvelle (ETN)', 'Conforme Eurocode 1 (NF EN 1991-1-4)', 'Conforme Eurocode 9 (NF EN 1999-1-1)', 'Certificat soufflerie Wacker Ingenieure', 'Éligible Garantie Décennale SMABTP'],
            warrantyText: 'Garantie constructeur K2 Systems : 12 ans. Système certifié pour l\'obtention de la garantie décennale poseur et éligible aux critères d\'assurabilité bâtiment.'
        };
    }

    // 4. AUTRE / GÉNÉRIQUE (Batterie, Coffret électrique, Accessoires)
    return {
        type: 'equipment',
        categoryBadge: 'ÉQUIPEMENT ÉLECTRIQUE HOMOLOGUÉ & CERTIFIÉ',
        marque: ds.marque || 'Équipementier Solaire Partenaire',
        modele: ds.designation || ds.ref,
        kpis: [
            { label: 'RÉFÉRENCE UNIQUE', val: ds.ref.slice(0, 16), sub: 'Matériel homologué' },
            { label: 'SÉCURITÉ & CONFORMITÉ', val: 'Norme CE', sub: 'Conforme UTE C15-712-1' },
            { label: 'INDICE DE PROTECTION', val: 'IP65', sub: 'Usage intérieur / extérieur' },
            { label: 'GARANTIE MATÉRIEL', val: '10 ans', sub: 'Engagement fabricant' }
        ],
        descriptionTitle: 'SPÉCIFICATIONS TECHNIQUES & CERTIFICATIONS DU COMPOSANT',
        descriptionPoints: [
            ds.details || 'Composant certifié pour installation photovoltaïque raccordée au réseau électrique.',
            'Conception haute durabilité répondant aux exigences strictes de la norme UTE C15-712-1 et du guide Consuel.',
            'Matériel rigoureusement testé en laboratoire et sélectionné par ENR COURTAGE pour sa fiabilité éprouvée.'
        ],
        tables: [
            {
                title: 'SPÉCIFICATIONS DÉTAILLÉES DU MATÉRIEL',
                cols: [{ label: 'Désignation', w: 80 }, { label: 'Valeur / Spécification', w: 102 }],
                rows: [
                    ['Référence constructeur', ds.ref],
                    ['Désignation commerciale', ds.designation],
                    ['Spécifications techniques', ds.details || 'Conforme aux spécifications constructeur'],
                    ['Conformité et normes applicables', 'Directive Basse Tension 2014/35/UE, Marquage CE, UTE C15-712-1'],
                    ['Garantie constructeur', 'Garantie fabricant pièces et main-d\'œuvre selon conditions générales']
                ]
            }
        ],
        certifications: ['Marquage CE', 'Conforme UTE C15-712-1', 'Agrément Consuel', 'ISO 9001 Qualité'],
        warrantyText: 'Matériel certifié et garanti selon les engagements constructeurs officiels. Éligible aux démarches de conformité Consuel et Enedis.'
    };
}

/**
 * Dessine une page A4 complète et riche de Fiche Technique Fabricant & Certification
 */
function renderProductDatasheetPage(doc, ds, pageWidth, pageHeight, margin, contentWidth, COLORS) {
    doc.addPage();
    const specs = getProductTechnicalSpecs(ds);

    // 1. Bandeau supérieur Constructeur (Bleu nuit)
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 21, 'F');

    // Tag catégorie haut gauche
    doc.setFillColor(...COLORS.secondary);
    doc.roundedRect(margin, 4.5, 96, 5.5, 1, 1, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.text(specs.categoryBadge.slice(0, 56), margin + 48, 8.2, { align: 'center' });

    // Titre de la page
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.white);
    const titleText = `${specs.marque.toUpperCase()} — ${sanitizePdfText(specs.modele).slice(0, 48)}`;
    doc.text(titleText, margin, 17);

    // Tag Référence haut droite
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageWidth - margin - 58, 4, 58, 13, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(...COLORS.gray);
    doc.text('RÉF. CONSTRUCTEUR', pageWidth - margin - 29, 8, { align: 'center' });
    doc.setFontSize(7.8);
    doc.setTextColor(...COLORS.primary);
    doc.text(sanitizePdfText(ds.ref).slice(0, 22), pageWidth - margin - 29, 13.5, { align: 'center' });

    let curY = 25;

    // 2. 4 Blocs KPI Hero
    const kpiW = (contentWidth - 9) / 4;
    const kpiH = 16.5;

    specs.kpis.forEach((kpi, idx) => {
        const kX = margin + idx * (kpiW + 3);
        doc.setFillColor(idx === 0 || idx === 1 ? 240 : 248, idx === 0 || idx === 1 ? 248 : 250, idx === 0 || idx === 1 ? 255 : 252);
        doc.setDrawColor(...(idx === 0 ? COLORS.secondary : (idx === 1 ? COLORS.accent : COLORS.border)));
        doc.roundedRect(kX, curY, kpiW, kpiH, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.2);
        doc.setTextColor(...COLORS.gray);
        doc.text(kpi.label, kX + kpiW / 2, curY + 4.5, { align: 'center' });

        doc.setFontSize(9.5);
        doc.setTextColor(...(idx === 0 ? COLORS.secondary : (idx === 1 ? COLORS.accent : COLORS.primary)));
        doc.text(kpi.val, kX + kpiW / 2, curY + 10, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(...COLORS.gray);
        doc.text(kpi.sub, kX + kpiW / 2, curY + 14, { align: 'center' });
    });

    curY += kpiH + 5;

    // 3. Présentation générale & Atouts constructeur
    const descBoxH = 22;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(margin, curY, contentWidth, descBoxH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.primary);
    doc.text(specs.descriptionTitle, margin + 4, curY + 5);

    let pY = curY + 9;
    specs.descriptionPoints.slice(0, 3).forEach(pt => {
        doc.setFillColor(...COLORS.secondary);
        doc.circle(margin + 4, pY - 1, 1, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.setTextColor(...COLORS.dark);
        const wrapped = doc.splitTextToSize(pt, contentWidth - 10);
        doc.text(wrapped[0] || pt, margin + 7, pY);
        pY += 4.5;
    });

    curY += descBoxH + 4;

    // 4. Tableaux de caractéristiques
    specs.tables.forEach(tbl => {
        if (curY > 235) return;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...COLORS.primary);
        doc.text(tbl.title, margin, curY + 3.5);
        curY += 5;

        // Entête du tableau
        doc.setFillColor(...COLORS.primary);
        doc.rect(margin, curY, contentWidth, 5.5, 'F');
        doc.setTextColor(...COLORS.white);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);

        let cX = margin;
        tbl.cols.forEach(c => {
            doc.text(c.label, cX + 2.5, curY + 3.8);
            cX += c.w;
        });
        curY += 5.5;

        // Lignes du tableau
        const rowH = 4.2;
        tbl.rows.forEach((r, rIdx) => {
            const isAlt = rIdx % 2 === 1;
            doc.setFillColor(isAlt ? 248 : 255, isAlt ? 250 : 255, isAlt ? 252 : 255);
            doc.rect(margin, curY, contentWidth, rowH, 'F');

            let cellX = margin;
            r.forEach((val, cIdx) => {
                const colW = tbl.cols[cIdx]?.w || 40;
                doc.setFont('helvetica', cIdx === 0 ? 'bold' : 'normal');
                doc.setFontSize(6.5);
                doc.setTextColor(...COLORS.dark);
                const textStr = sanitizePdfText(val);
                doc.text(textStr.slice(0, 65), cellX + 2.5, curY + 3);
                cellX += colW;
            });
            curY += rowH;
        });

        curY += 3.5;
    });

    // 5. Badges de Certifications & Homologations
    if (curY < 240) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...COLORS.primary);
        doc.text('CERTIFICATIONS OFFICIELLES & NORMES D\'HOMOLOGATION', margin, curY + 3.5);
        curY += 5;

        const badgeW = (contentWidth - 10) / (specs.certifications.length || 1);
        specs.certifications.forEach((cert, idx) => {
            const bX = margin + idx * (badgeW + 2);
            doc.setFillColor(240, 253, 244);
            doc.setDrawColor(...COLORS.accent);
            doc.roundedRect(bX, curY, badgeW, 7, 1.5, 1.5, 'FD');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(5.8);
            doc.setTextColor(22, 101, 52);
            doc.text(cert, bX + badgeW / 2, curY + 4.6, { align: 'center' });
        });

        curY += 10;
    }

    // 6. Cadre Garantie constructeur & Documentation en ligne
    if (curY < 265) {
        const remainH = Math.min(20, pageHeight - 12 - curY);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...COLORS.secondary);
        doc.roundedRect(margin, curY, contentWidth, remainH, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(...COLORS.secondary);
        doc.text('ENGAGEMENTS DE GARANTIE CONSTRUCTEUR & CONFORMITÉ ENEDIS', margin + 4, curY + 4.8);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(...COLORS.dark);
        doc.text(specs.warrantyText, margin + 4, curY + 9.5);

        if (ds.url) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.4);
            doc.setTextColor(37, 99, 235);
            doc.text(`Documentation constructeur officielle en ligne : ${ds.url}`, margin + 4, curY + 14.5);
        }
    }
}

/**
 * Génère le document PDF :
 * - Si onlyQuote = true : génère uniquement le Devis officiel chiffré (avec entête, coordonnées, lignes, récap, échéancier, bon pour accord, signature)
 * - Si onlyQuote = false : génère la Proposition Commerciale complète 3 pages + fiches techniques constructeurs intégrées
 */
export async function generateQuoteProposalPdf({
    project = {},
    quoteData = {},
    energyTarifs = {},
    onlyQuote = false,
    onProgress = () => {}
}) {
    onProgress({ 
        step: 1, 
        percent: 15, 
        message: onlyQuote 
            ? "Génération du Devis officiel au format PDF..." 
            : "Génération de l'offre commerciale et de l'étude technico-économique..." 
    });

    // Initialisation jsPDF A4 Portrait
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2);

    // Données client et devis
    const rawClientName = quoteData.clientName || `${project.firstName || ''} ${project.name || 'Client'}`.trim() || 'Client';
    const clientName = sanitizePdfText(rawClientName);
    const clientAddress = sanitizePdfText(quoteData.clientAddress || project.address || '');
    const clientZipCity = sanitizePdfText(`${quoteData.clientZip || project.zip || ''} ${quoteData.clientCity || project.city || ''}`.trim());
    const clientPhone = sanitizePdfText(quoteData.clientPhone || project.phone || '');
    const clientEmail = sanitizePdfText(quoteData.clientEmail || project.email || '');
    const prm = sanitizePdfText(project.enedisPrm || project.pdl || '');
    const quoteNumber = sanitizePdfText(quoteData.quoteNumber || `DEV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    const dateStr = new Date().toLocaleDateString('fr-FR');
    const validityDays = quoteData.validityDays || 30;

    // Données techniques
    const rawPower = quoteData.powerKwc || project.projectSize || project.kwc || project.puissanceKwc || project.puissance || 9.0;
    const powerKwc = parseFloat(String(rawPower).replace(',', '.').replace(/[^0-9.]/g, '')) || 9.0;
    const annualProductionKwh = Math.round(powerKwc * (parseFloat(project.solarYieldRoof1 || 1150) || 1150));
    const autoConsomPercent = quoteData.autoConsomPercent || 70;
    const autoConsomKwh = Math.round(annualProductionKwh * (autoConsomPercent / 100));
    const surplusKwh = annualProductionKwh - autoConsomKwh;

    // Tarifs énergie
    const trvKwh = energyTarifs.trvBase || 0.2516;
    const tarifRachatKwh = energyTarifs.tarifAchatRetenu || 0.1269;
    const primeAuto = energyTarifs.primeTotal || (powerKwc <= 3 ? 900 : (powerKwc <= 9 ? 2070 : 0));

    // Économies financières annuelles estimées
    const econoFactureAn = Math.round(autoConsomKwh * trvKwh);
    const revenuVenteAn = Math.round(surplusKwh * tarifRachatKwh);
    const gainTotalAn1 = econoFactureAn + revenuVenteAn;
    const gain20Ans = Math.round((gainTotalAn1 * 20 * 1.02) + primeAuto);
    const co2Tonnes20Ans = ((annualProductionKwh * 20 * 0.21) / 1000).toFixed(1);

    // =========================================================================
    // CALCUL DES TOTAUX DU DEVIS
    // =========================================================================
    const sections = quoteData.sections || [];
    let totalHtBrut = 0;
    const tvaBases = { 20: 0, 10: 0, 5.5: 0, 0: 0 };

    sections.forEach(sec => {
        (sec.lines || []).forEach(line => {
            const qty = parseFloat(line.quantite || 1);
            const pu = parseFloat(line.prixUnitaireHt || 0);
            const rem = parseFloat(line.remisePourcent || 0);
            const lineHt = qty * pu * (1 - rem / 100);
            const tvaRate = parseFloat(line.tauxTva !== undefined ? line.tauxTva : (powerKwc <= 3 ? 10 : 20));

            totalHtBrut += qty * pu;
            if (tvaBases[tvaRate] !== undefined) {
                tvaBases[tvaRate] += lineHt;
            } else {
                tvaBases[20] = (tvaBases[20] || 0) + lineHt;
            }
        });
    });

    const remiseGlobale = parseFloat(quoteData.remiseGlobale || 0);
    const sumGrossLines = Object.values(tvaBases).reduce((a, b) => a + b, 0);
    const totalNetHt = Math.max(0, sumGrossLines - remiseGlobale);

    // Ventilation exacte de la TVA
    let totalTva = 0;
    const tvaLines = [];
    const discountRatio = sumGrossLines > 0 ? (totalNetHt / sumGrossLines) : 1;

    [20, 10, 5.5].forEach(rate => {
        const grossBase = tvaBases[rate] || 0;
        if (grossBase > 0) {
            const netBase = grossBase * discountRatio;
            const montant = netBase * (rate / 100);
            totalTva += montant;
            tvaLines.push({ rate, base: netBase, montant });
        }
    });

    const totalTtc = totalNetHt + totalTva;
    const resteACharge = Math.max(0, totalTtc - primeAuto);

    // Colonnes du tableau de devis
    const devisCols = [
        { label: 'Réf.', w: 25 },
        { label: 'Désignation & Spécifications techniques', w: 85 },
        { label: 'Qté', w: 14, align: 'right' },
        { label: 'P.U. HT', w: 18, align: 'right' },
        { label: 'Rem.', w: 11, align: 'right' },
        { label: 'Total HT', w: 19, align: 'right' },
        { label: 'TVA', w: 10, align: 'right' }
    ];

    // =========================================================================
    // CAS 1 : EXPORT OFFRE COMPLÈTE (PROPOSITION 3 PAGES + FICHES)
    // =========================================================================
    if (!onlyQuote) {
        // ---------------------------------------------------------------------
        // PAGE 1 : PAGE DE GARDE & PRÉSENTATION
        // ---------------------------------------------------------------------
        doc.setFillColor(...COLORS.primary);
        doc.rect(0, 0, pageWidth, 38, 'F');

        doc.setTextColor(...COLORS.white);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('ENR COURTAGE', margin, 17);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.text("Bureau d'Études & Solutions Solaires Clé en Main", margin, 24);
        doc.setFontSize(8.5);
        doc.text('contact@enr-courtage.fr | www.enr-courtage.fr', margin, 30);

        // Tag Devis
        doc.setFillColor(...COLORS.secondary);
        doc.roundedRect(pageWidth - margin - 56, 10, 56, 18, 2, 2, 'F');
        doc.setTextColor(...COLORS.white);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.text('OFFRE & ÉTUDE SOLAIRE', pageWidth - margin - 28, 17.5, { align: 'center' });
        doc.setFontSize(8.5);
        doc.text(quoteNumber, pageWidth - margin - 28, 23.5, { align: 'center' });

        // Titre
        let curY = 48;
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.text('PROPOSITION COMMERCIALE & TECHNIQUE', margin, curY);

        curY += 6.5;
        doc.setTextColor(...COLORS.secondary);
        doc.setFontSize(11);
        doc.text(`Centrale Solaire Photovoltaïque ${formatNumber(powerKwc, 1)} kWc en Autoconsommation`, margin, curY);

        // Encadrés Émetteur & Destinataire
        curY += 9;
        const boxWidth = (contentWidth - 6) / 2;
        const boxHeight = 36;

        // Émetteur (fond blanc, sans mention ÉMETTEUR / EXPERT SOLAIRE)
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...COLORS.border);
        doc.roundedRect(margin, curY, boxWidth, boxHeight, 2.5, 2.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.dark);
        doc.text('ENR COURTAGE', margin + 5, curY + 8);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.2);
        doc.text("Bureau d'Études & Solutions Solaires Photovoltaïques", margin + 5, curY + 14.5);
        doc.text('Garantie Décennale & Certification RGE QualiPV', margin + 5, curY + 20);
        doc.text('contact@enr-courtage.fr • www.enr-courtage.fr', margin + 5, curY + 25.5);
        doc.text(`Conseiller : ${sanitizePdfText(quoteData.commercialName || 'Pôle Ingénierie Solaire')}`, margin + 5, curY + 31);

        // Destinataire / Client (fond blanc et police sombre)
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...COLORS.border);
        doc.roundedRect(margin + boxWidth + 6, curY, boxWidth, boxHeight, 2.5, 2.5, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...COLORS.dark);
        doc.text('CLIENT / DESTINATAIRE', margin + boxWidth + 11, curY + 8);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(...COLORS.dark);
        doc.text(clientName, margin + boxWidth + 11, curY + 14.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.2);
        if (clientAddress) doc.text(clientAddress, margin + boxWidth + 11, curY + 20);
        if (clientZipCity) doc.text(clientZipCity, margin + boxWidth + 11, curY + 25.5);
        const contactLine = [clientPhone, clientEmail].filter(Boolean).join(' • ');
        if (contactLine) doc.text(contactLine, margin + boxWidth + 11, curY + 31);

        // Métadonnées
        curY += boxHeight + 6;
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, curY, contentWidth, 9, 2, 2, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.gray);
        doc.text(`Date d'émission : ${dateStr}`, margin + 5, curY + 6);
        doc.text(`Durée de validité : ${validityDays} jours`, margin + 65, curY + 6);
        if (prm) doc.text(`Point Livraison (PRM Enedis) : ${prm}`, margin + 120, curY + 6);

        // Cartes KPIs
        curY += 15;
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('SYNTHÈSE CLÉ EN MAIN DE VOTRE INSTALLATION', margin, curY);

        curY += 5;
        const kpiWidth = (contentWidth - 9) / 4;
        const kpiHeight = 21;

        const kpis = [
            { label: 'Puissance Crête', val: `${formatNumber(powerKwc, 1)} kWc`, sub: `${quoteData.nbPanels || Math.round(powerKwc * 2.3)} modules bi-verre` },
            { label: 'Production Annuelle', val: `${formatNumber(annualProductionKwh)} kWh/an`, sub: `Productible ~${Math.round(annualProductionKwh / powerKwc)} kWh/kWc` },
            { label: 'Autoconsommation', val: `${autoConsomPercent}%`, sub: `Surplus racheté EDF OA` },
            { label: 'Gain Estimé 20 ans', val: formatEuro(gain20Ans), sub: `Économies & primes` }
        ];

        kpis.forEach((kpi, idx) => {
            const kX = margin + idx * (kpiWidth + 3);
            doc.setFillColor(idx === 3 ? 240 : 248, idx === 3 ? 253 : 250, idx === 3 ? 244 : 252);
            doc.setDrawColor(...(idx === 3 ? COLORS.accent : COLORS.border));
            doc.roundedRect(kX, curY, kpiWidth, kpiHeight, 2, 2, 'FD');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(...COLORS.gray);
            doc.text(kpi.label.toUpperCase(), kX + kpiWidth / 2, curY + 5.5, { align: 'center' });

            doc.setFontSize(10.5);
            doc.setTextColor(...(idx === 3 ? COLORS.accent : COLORS.primary));
            doc.text(kpi.val, kX + kpiWidth / 2, curY + 12.5, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.8);
            doc.setTextColor(...COLORS.gray);
            doc.text(kpi.sub, kX + kpiWidth / 2, curY + 17.5, { align: 'center' });
        });

        // Engagements
        curY += kpiHeight + 11;
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('NOTRE ENGAGEMENT DE QUALITÉ & SERVICE', margin, curY);

        curY += 5;
        doc.setFillColor(...COLORS.lightGray);
        doc.roundedRect(margin, curY, contentWidth, 58, 2.5, 2.5, 'F');

        const points = [
            { title: 'Matériel Haute Performance Certifié', desc: 'Modules biverre dernière génération (rendement > 22%), garantis 25 à 30 ans avec dégradation minimale.' },
            { title: 'Sécurité et Conformité Normative', desc: 'Conformité stricte au guide UTE C15-712-1, parafoudres Type 2, protection différentielle et coupure pompier.' },
            { title: 'Démarches Administratives 100% Incluses', desc: 'Prise en charge intégrale : Déclaration Préalable en Mairie, Raccordement Enedis et conformité Consuel.' },
            { title: 'Valorisation Énergétique Optimisée', desc: `Vente du surplus garantie 20 ans au tarif réglementé EDF OA (${formatNumber(tarifRachatKwh, 4)} €/kWh) et prime versée.` },
            { title: 'Supervision Digitale en Temps Réel', desc: 'Application smartphone gratuite pour suivre en direct votre production solaire, autoconsommation et gains.' }
        ];

        let pY = curY + 7;
        points.forEach((pt) => {
            doc.setFillColor(...COLORS.secondary);
            doc.circle(margin + 5, pY - 1.2, 1.5, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(...COLORS.dark);
            doc.text(pt.title, margin + 10, pY);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(...COLORS.gray);
            doc.text(pt.desc, margin + 10, pY + 4);
            pY += 10;
        });

        // Footer Page 1
        doc.setFontSize(7.5);
        doc.setTextColor(...COLORS.gray);
        doc.text('Page 1 / 3 — Proposition Commerciale & Présentation', margin, pageHeight - 8);
        doc.text('ENR COURTAGE — Tous droits réservés', pageWidth - margin, pageHeight - 8, { align: 'right' });

        // ---------------------------------------------------------------------
        // PAGE 2 : ÉTUDE TECHNICO-ÉCONOMIQUE & BILAN DE RENTABILITÉ
        // ---------------------------------------------------------------------
        doc.addPage();

        doc.setFillColor(...COLORS.primary);
        doc.rect(0, 0, pageWidth, 18, 'F');
        doc.setTextColor(...COLORS.white);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('ÉTUDE TECHNICO-ÉCONOMIQUE & RENTABILITÉ FINANCIÈRE', margin, 11.5);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text(`Projet : ${clientName} — ${formatNumber(powerKwc, 1)} kWc`, pageWidth - margin, 11.5, { align: 'right' });

        curY = 27;

        // Section 1 : Répartition
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.text("1. PRODUCTION ET VALORISATION DE L'ÉNERGIE (ANNÉE 1)", margin, curY);

        curY += 5;
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, curY, contentWidth, 34, 2.5, 2.5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...COLORS.dark);
        doc.text('Énergie solaire produite par an :', margin + 5, curY + 8);
        doc.setFont('helvetica', 'normal');
        doc.text(`${formatNumber(annualProductionKwh)} kWh/an`, margin + 75, curY + 8);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.accent);
        doc.text('Part autoconsommée directement :', margin + 5, curY + 15);
        doc.setFont('helvetica', 'normal');
        doc.text(`${autoConsomPercent}% soit ${formatNumber(autoConsomKwh)} kWh/an valorisés au TRV (${formatNumber(trvKwh, 4)} €/kWh)`, margin + 75, curY + 15);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.secondary);
        doc.text('Surplus réinjecté sur le réseau :', margin + 5, curY + 22);
        doc.setFont('helvetica', 'normal');
        doc.text(`${100 - autoConsomPercent}% soit ${formatNumber(surplusKwh)} kWh/an rachetés par EDF OA (${formatNumber(tarifRachatKwh, 4)} €/kWh)`, margin + 75, curY + 22);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.primary);
        doc.text('Gains énergétiques annuels (Année 1) :', margin + 5, curY + 29);
        doc.text(`${formatEuro(gainTotalAn1)} / an`, margin + 75, curY + 29);

        // Section 2 : Tableau prévisionnel
        curY += 40;
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.text('2. PLAN FINANCIER & RETOUR SUR INVESTISSEMENT SUR 30 ANS', margin, curY);

        curY += 5;
        const thCols = [
            { label: 'Horizon', w: 25 },
            { label: 'Économies Facture', w: 36 },
            { label: 'Revenus EDF OA', w: 36 },
            { label: "Prime d'État", w: 32 },
            { label: 'Gains Cumulés', w: contentWidth - 129 }
        ];

        doc.setFillColor(...COLORS.primary);
        doc.rect(margin, curY, contentWidth, 6, 'F');
        doc.setTextColor(...COLORS.white);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);

        let colX = margin;
        thCols.forEach(col => {
            doc.text(col.label, colX + 3, curY + 4.2);
            colX += col.w;
        });

        curY += 6;
        const horizons = [
            { an: 'Année 1', mult: 1, prime: primeAuto },
            { an: 'Année 2', mult: 2, prime: primeAuto },
            { an: 'Année 3', mult: 3, prime: primeAuto },
            { an: 'Année 4', mult: 4, prime: primeAuto },
            { an: 'Année 5', mult: 5, prime: primeAuto },
            { an: 'Année 10', mult: 10, prime: primeAuto },
            { an: 'Année 15', mult: 15, prime: primeAuto },
            { an: 'Année 20', mult: 20, prime: primeAuto },
            { an: 'Année 25', mult: 25, prime: primeAuto },
            { an: 'Année 30', mult: 30, prime: primeAuto }
        ];

        const rowHeight = 4.9;
        horizons.forEach((h, i) => {
            const isOdd = i % 2 === 1;
            doc.setFillColor(isOdd ? 248 : 255, isOdd ? 250 : 255, isOdd ? 252 : 255);
            doc.rect(margin, curY, contentWidth, rowHeight, 'F');

            // Économies sur facture indexées (inflation moyenne énergie 2%/an)
            const factor = h.mult * (1 + 0.02 * ((h.mult - 1) / 2));
            const ecoFact = Math.round(econoFactureAn * factor);
            // Revenus EDF OA sur 20 ans de contrat garanti, puis valorisation marché
            const revOa = Math.round(revenuVenteAn * Math.min(h.mult, 20) + (h.mult > 20 ? (h.mult - 20) * (revenuVenteAn * 0.7) : 0));
            const gainsCumules = ecoFact + revOa + h.prime;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.2);
            doc.setTextColor(...COLORS.dark);

            let cellX = margin;
            doc.setFont('helvetica', 'bold');
            doc.text(h.an, cellX + 3, curY + 3.6);
            cellX += thCols[0].w;

            doc.setFont('helvetica', 'normal');
            doc.text(formatEuro(ecoFact), cellX + 3, curY + 3.6);
            cellX += thCols[1].w;

            doc.text(formatEuro(revOa), cellX + 3, curY + 3.6);
            cellX += thCols[2].w;

            doc.text(formatEuro(h.prime), cellX + 3, curY + 3.6);
            cellX += thCols[3].w;

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...COLORS.accent);
            doc.text(formatEuro(gainsCumules), cellX + 3, curY + 3.6);

            curY += rowHeight;
        });

        // Section 3 : Bilan Carbone
        curY += 12;
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.text('3. IMPACT ENVIRONNEMENTAL & DÉCARBONATION', margin, curY);

        curY += 5;
        doc.setFillColor(240, 253, 244);
        doc.setDrawColor(...COLORS.accent);
        doc.roundedRect(margin, curY, contentWidth, 21, 2.5, 2.5, 'FD');

        doc.setTextColor(22, 101, 52);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Centrale Éco-Responsable & Énergie 100% Verte', margin + 5, curY + 7);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.8);
        doc.text(`En produisant votre électricité photovoltaïque, vous évitez le rejet d'environ ${co2Tonnes20Ans} tonnes de CO2`, margin + 5, curY + 12.5);
        doc.text(`sur 20 ans, soit l'équivalent de ${(annualProductionKwh * 0.15).toFixed(0)} arbres plantés ou ${(annualProductionKwh * 0.8).toFixed(0)} km parcourus en véhicule électrique.`, margin + 5, curY + 17);

        // Section 4 : Aides d'État
        curY += 28;
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.text("4. TARIFS D'ACHAT EDF OA & SUBVENTIONS D'ÉTAT", margin, curY);

        curY += 5;
        doc.setFillColor(...COLORS.lightGray);
        doc.roundedRect(margin, curY, contentWidth, 30, 2.5, 2.5, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.8);
        doc.setTextColor(...COLORS.dark);

        const aideLines = [
            `• Arrêté Tarifaire S21 : Contrat d'achat garanti par l'État sur 20 ans, indexé annuellement sur l'inflation.`,
            `• Tarif d'achat du surplus : ${formatNumber(tarifRachatKwh, 4)} €/kWh injecté sur le réseau de distribution Enedis.`,
            primeAuto > 0 
                ? `• Prime à l'autoconsommation : ${formatEuro(primeAuto)} allouée par l'État et versée par EDF OA.`
                : `• Installations tertiaires > 100 kWc : Valorisation optimisée en vente totale ou contrat de gré à gré (PPA).`,
            `• Économies sur la facture : Chaque kWh autoconsommé remplace un kWh acheté au tarif TRV (${formatNumber(trvKwh, 4)} €/kWh).`
        ];

        let aideY = curY + 7;
        aideLines.forEach(al => {
            doc.text(al, margin + 5, aideY);
            aideY += 5.5;
        });

        // Footer Page 2
        doc.setFontSize(7.5);
        doc.setTextColor(...COLORS.gray);
        doc.text('Page 2 / 3 — Étude Technico-Économique & Rentabilité', margin, pageHeight - 8);
        doc.text('ENR COURTAGE — Tous droits réservés', pageWidth - margin, pageHeight - 8, { align: 'right' });

        // Passer à la page 3 pour le Devis chiffré
        doc.addPage();
    }

    // =========================================================================
    // PAGE DE DEVIS OFFICIEL (PAGE 1 si onlyQuote, ou PAGE 3 si offre complète)
    // =========================================================================
    const devisPageTitle = onlyQuote 
        ? `DEVIS CHIFFRÉ OFFICIEL N° ${quoteNumber}` 
        : `DEVIS CHIFFRÉ DÉTAILLÉ N° ${quoteNumber}`;

    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 18, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(devisPageTitle, margin, 11.5);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date : ${dateStr} — Validité ${validityDays} jours`, pageWidth - margin, 11.5, { align: 'right' });

    // Cartouche Émetteur & Destinataire au-dessus du tableau (Devis 1 page et Page 3 du dossier complet)
    const boxWidth = (contentWidth - 6) / 2;
    const boxH = 28;

    // Émetteur (gauche) : fond blanc, sans mention ÉMETTEUR / EXPERT SOLAIRE
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(margin, curY, boxWidth, boxH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.dark);
    doc.text('ENR COURTAGE', margin + 4, curY + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(...COLORS.dark);
    doc.text('Conseil & Ingénierie Photovoltaïque • RGE QualiPV', margin + 4, curY + 12);
    doc.text('contact@enr-courtage.fr • www.enr-courtage.fr', margin + 4, curY + 17);
    doc.text(`Conseiller : ${sanitizePdfText(quoteData.commercialName || 'Pôle Ingénierie Solaire')}`, margin + 4, curY + 22.5);

    // Client / Destinataire (droite) : fond blanc et police sombre
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(margin + boxWidth + 6, curY, boxWidth, boxH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.dark);
    doc.text('CLIENT / DESTINATAIRE', margin + boxWidth + 10, curY + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.dark);
    doc.text(clientName, margin + boxWidth + 10, curY + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    if (clientAddress) doc.text(clientAddress, margin + boxWidth + 10, curY + 17);
    const cliInfo = [clientZipCity, clientPhone, prm ? `PRM: ${prm}` : ''].filter(Boolean).join(' • ');
    if (cliInfo) doc.text(cliInfo, margin + boxWidth + 10, curY + 22.5);

    curY += boxH + 5;

    // Entête du tableau de devis
    doc.setFillColor(...COLORS.primary);
    doc.rect(margin, curY, contentWidth, 6.5, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);

    let headerX = margin;
    devisCols.forEach(col => {
        const textX = col.align === 'right' ? headerX + col.w - 2 : headerX + 2;
        doc.text(col.label, textX, curY + 4.5, { align: col.align || 'left' });
        headerX += col.w;
    });

    curY += 6.5;

    // Lignes de devis
    const lineHeight = 6.2;
    const sectionHeaderHeight = 4.8;

    sections.forEach(sec => {
        // Vérification saut de page
        if (curY > 260) {
            doc.addPage();
            doc.setFillColor(...COLORS.primary);
            doc.rect(0, 0, pageWidth, 14, 'F');
            doc.setTextColor(...COLORS.white);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9.5);
            doc.text(`DEVIS N° ${quoteNumber} (SUITE)`, margin, 9.5);
            curY = 20;

            // Répétition entête colonnes
            doc.setFillColor(...COLORS.primary);
            doc.rect(margin, curY, contentWidth, 6.5, 'F');
            doc.setTextColor(...COLORS.white);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.2);
            headerX = margin;
            devisCols.forEach(col => {
                const textX = col.align === 'right' ? headerX + col.w - 2 : headerX + 2;
                doc.text(col.label, textX, curY + 4.5, { align: col.align || 'left' });
                headerX += col.w;
            });
            curY += 6.5;
        }

        // Ligne de titre de section
        doc.setFillColor(...COLORS.primaryLight);
        doc.rect(margin, curY, contentWidth, sectionHeaderHeight, 'F');
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text(sanitizePdfText(sec.title || 'Prestations'), margin + 2, curY + 3.5);
        curY += sectionHeaderHeight;

        (sec.lines || []).forEach((line, lIdx) => {
            // Vérification saut de page avant impression de ligne
            if (curY > 260) {
                doc.addPage();
                doc.setFillColor(...COLORS.primary);
                doc.rect(0, 0, pageWidth, 14, 'F');
                doc.setTextColor(...COLORS.white);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9.5);
                doc.text(`DEVIS N° ${quoteNumber} (SUITE)`, margin, 9.5);
                curY = 20;

                doc.setFillColor(...COLORS.primary);
                doc.rect(margin, curY, contentWidth, 6.5, 'F');
                doc.setTextColor(...COLORS.white);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.2);
                headerX = margin;
                devisCols.forEach(col => {
                    const textX = col.align === 'right' ? headerX + col.w - 2 : headerX + 2;
                    doc.text(col.label, textX, curY + 4.5, { align: col.align || 'left' });
                    headerX += col.w;
                });
                curY += 6.5;
            }

            const qty = parseFloat(line.quantite || 1);
            const pu = parseFloat(line.prixUnitaireHt || 0);
            const rem = parseFloat(line.remisePourcent || 0);
            const lineHt = qty * pu * (1 - rem / 100);
            const tvaRate = parseFloat(line.tauxTva !== undefined ? line.tauxTva : (powerKwc <= 3 ? 10 : 20));

            const isAlt = lIdx % 2 === 1;
            doc.setFillColor(isAlt ? 250 : 255, isAlt ? 250 : 255, isAlt ? 252 : 255);
            doc.rect(margin, curY, contentWidth, lineHeight, 'F');

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.2);
            doc.setTextColor(...COLORS.dark);

            let cellX = margin;
            // Réf
            doc.setFont('helvetica', 'bold');
            doc.text(sanitizePdfText(line.ref || '').slice(0, 16), cellX + 2, curY + 4.2);
            cellX += devisCols[0].w;

            // Désignation
            doc.setFont('helvetica', 'normal');
            const desig = sanitizePdfText(line.designation || '').slice(0, 56);
            doc.text(desig, cellX + 2, curY + 4.2);
            cellX += devisCols[1].w;

            // Qté
            doc.text(`${formatNumber(qty)} ${sanitizePdfText(line.unite || 'U')}`, cellX + devisCols[2].w - 2, curY + 4.2, { align: 'right' });
            cellX += devisCols[2].w;

            // P.U. HT
            doc.text(formatEuro(pu), cellX + devisCols[3].w - 2, curY + 4.2, { align: 'right' });
            cellX += devisCols[3].w;

            // Remise
            doc.text(rem > 0 ? `${rem}%` : '-', cellX + devisCols[4].w - 2, curY + 4.2, { align: 'right' });
            cellX += devisCols[4].w;

            // Total HT
            doc.setFont('helvetica', 'bold');
            doc.text(formatEuro(lineHt), cellX + devisCols[5].w - 2, curY + 4.2, { align: 'right' });
            cellX += devisCols[5].w;

            // TVA
            doc.setFont('helvetica', 'normal');
            doc.text(`${tvaRate}%`, cellX + devisCols[6].w - 2, curY + 4.2, { align: 'right' });

            curY += lineHeight;
        });
    });

    // =========================================================================
    // RÉCAPITULATIF FINANCIER & BON POUR ACCORD
    // =========================================================================
    const requiredBottomSpace = 84;
    if (curY + requiredBottomSpace > (pageHeight - 12)) {
        doc.addPage();
        doc.setFillColor(...COLORS.primary);
        doc.rect(0, 0, pageWidth, 14, 'F');
        doc.setTextColor(...COLORS.white);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.text(`DEVIS N° ${quoteNumber} — RÉCAPITULATIF & SIGNATURE`, margin, 9.5);
        curY = 22;
    } else {
        curY += 5;
    }

    const recapY = curY;
    const leftWidth = 98;
    const rightWidth = contentWidth - leftWidth - 5;
    const recapBoxHeight = 44;

    // Colonne gauche : Ventilation TVA & Modalités de règlement
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(margin, recapY, leftWidth, recapBoxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.primary);
    doc.text('VENTILATION DE LA TVA', margin + 4, recapY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...COLORS.dark);
    let tvaY = recapY + 11;
    tvaLines.forEach(tl => {
        doc.text(`TVA ${tl.rate}% sur base ${formatEuro(tl.base)} :`, margin + 4, tvaY);
        doc.text(formatEuro(tl.montant), margin + leftWidth - 4, tvaY, { align: 'right' });
        tvaY += 5;
    });

    doc.setFont('helvetica', 'bold');
    doc.text('ÉCHÉANCIER DE RÈGLEMENT :', margin + 4, recapY + 25);
    doc.setFont('helvetica', 'normal');
    doc.text('• 30% à la signature du bon de commande', margin + 4, recapY + 30.5);
    doc.text('• 60% à la livraison du matériel sur site', margin + 4, recapY + 35.5);
    doc.text('• 10% à la mise en service & passage Consuel', margin + 4, recapY + 40.5);

    // Colonne droite : Totaux financiers
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin + leftWidth + 5, recapY, rightWidth, recapBoxHeight, 2, 2, 'FD');

    let totY = recapY + 7;
    const rX = margin + leftWidth + 9;
    const rValX = margin + contentWidth - 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.dark);

    doc.text('Total Brut HT :', rX, totY);
    doc.text(formatEuro(totalHtBrut), rValX, totY, { align: 'right' });
    totY += 5.5;

    if (remiseGlobale > 0) {
        doc.setTextColor(220, 38, 38);
        doc.text('Remise commerciale :', rX, totY);
        doc.text(`- ${formatEuro(remiseGlobale)}`, rValX, totY, { align: 'right' });
        totY += 5.5;
    }

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text('Total Net HT :', rX, totY);
    doc.text(formatEuro(totalNetHt), rValX, totY, { align: 'right' });
    totY += 5.5;

    doc.setFont('helvetica', 'normal');
    doc.text('Montant total TVA :', rX, totY);
    doc.text(formatEuro(totalTva), rValX, totY, { align: 'right' });
    totY += 7;

    // Total TTC mis en valeur
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin + leftWidth + 7, totY - 4, rightWidth - 4, 11, 2, 2, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('TOTAL TTC :', rX, totY + 3.5);
    doc.setFontSize(10.5);
    doc.text(formatEuro(totalTtc), rValX - 2, totY + 3.5, { align: 'right' });

    // Prime et reste à charge (si prime applicable)
    if (primeAuto > 0) {
        totY += 12;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(22, 101, 52);
        doc.text(`Prime EDF OA déductible : - ${formatEuro(primeAuto)}`, rX, totY);
        doc.text(`Reste à charge réel : ${formatEuro(resteACharge)}`, rValX, totY, { align: 'right' });
    }

    // Cadre Bon pour Accord & Signature
    curY = recapY + recapBoxHeight + 5;
    const signBoxH = 31;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, curY, contentWidth, signBoxH, 2.5, 2.5, 'FD');

    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('BON POUR ACCORD & COMMANDE FERME', margin + 5, curY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...COLORS.dark);
    doc.text('Mention manuscrite obligatoire : « Bon pour accord et acceptation sans réserve du devis »', margin + 5, curY + 11.5);
    doc.text('Fait à : ................................................................ Le : ...... / ...... / 2026', margin + 5, curY + 17);
    doc.text('Nom et qualité du signataire : ................................................................', margin + 5, curY + 22.5);

    // Boîte de signature
    doc.setDrawColor(...COLORS.border);
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.rect(margin + contentWidth - 62, curY + 5, 58, 22);
    doc.setLineDashPattern([], 0);
    doc.setFontSize(6.8);
    doc.setTextColor(...COLORS.gray);
    doc.text('Cachet & Signature du client', margin + contentWidth - 33, curY + 9, { align: 'center' });

    // Mentions légales
    curY += signBoxH + 3.5;
    doc.setFontSize(6.2);
    doc.setTextColor(...COLORS.gray);
    doc.text("Conditions : Devis soumis aux conditions générales de vente ENR COURTAGE. Garantie décennale souscrite auprès d'une compagnie habilitée.", margin, curY);
    doc.text("ENR COURTAGE — Bureau d'Études & Solutions Solaires Photovoltaïques — RGE QualiPV", margin, curY + 3.2);

    // =========================================================================
    // ÉTAPE 2 : GÉNÉRATION DES FICHES TECHNIQUES FABRICANTS PLEINE PAGE (SI NON ONLY QUOTE)
    // =========================================================================
    let datasheetsCount = 0;

    if (!onlyQuote) {
        const datasheetsToAppend = [];
        sections.forEach(sec => {
            (sec.lines || []).forEach(line => {
                const isRelevantEquipment = line.includeDatasheet || Boolean(line.ficheTechniqueUrl) || 
                    ['TSM', 'SUN2000', 'K2', 'FLASH', 'MB-', 'JAM', 'IQ8', 'SG10', 'LUNA', 'BYD', 'COF'].some(code => (line.ref || '').toUpperCase().includes(code));
                
                if (isRelevantEquipment) {
                    if (!datasheetsToAppend.some(d => d.ref === line.ref)) {
                        datasheetsToAppend.push({
                            ref: sanitizePdfText(line.ref),
                            designation: sanitizePdfText(line.designation),
                            url: line.ficheTechniqueUrl || '',
                            details: sanitizePdfText(line.details),
                            quantite: line.quantite,
                            category: line.category
                        });
                    }
                }
            });
        });

        datasheetsCount = datasheetsToAppend.length;

        datasheetsToAppend.forEach((ds, idx) => {
            const progressPercent = 50 + Math.round(((idx + 1) / (datasheetsCount || 1)) * 45);
            onProgress({
                step: 3,
                percent: progressPercent,
                message: `Génération de la fiche technique fabricant : ${ds.ref}...`
            });

            // Génération de la fiche technique complète vectorielle
            renderProductDatasheetPage(doc, ds, pageWidth, pageHeight, margin, contentWidth, COLORS);
        });
    }

    // =========================================================================
    // ÉTAPE 3 : PIED DE PAGE SYNCHRONISÉ SUR TOUTES LES PAGES (1 à N)
    // =========================================================================
    const totalPagesCount = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPagesCount; p++) {
        doc.setPage(p);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...COLORS.gray);
        const footerLabel = onlyQuote 
            ? `Page ${p} / ${totalPagesCount} — Devis Officiel Chiffré` 
            : (p === 1 ? `Page 1 / ${totalPagesCount} — Proposition Commerciale & Présentation` 
               : (p === 2 ? `Page 2 / ${totalPagesCount} — Étude Technico-Économique & Rentabilité (30 ans)` 
                  : (p === 3 ? `Page 3 / ${totalPagesCount} — Devis Chiffré Détaillé & Bon pour accord`
                     : `Page ${p} / ${totalPagesCount} — Fiche Technique Fabricant & Certification Officielle`)));
        doc.text(footerLabel, margin, pageHeight - 8);
        doc.text('ENR COURTAGE — Tous droits réservés', pageWidth - margin, pageHeight - 8, { align: 'right' });
    }

    onProgress({ step: 4, percent: 98, message: "Finalisation du document PDF..." });

    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);

    // Nom de fichier adapté
    const clientSlug = clientName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
    const fileName = onlyQuote 
        ? `Devis_${quoteNumber}_${clientSlug}.pdf`
        : `Proposition_Commerciale_Devis_${quoteNumber}_${clientSlug}.pdf`;

    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onProgress({ step: 5, percent: 100, message: "Document PDF généré et téléchargé avec succès !" });

    return {
        success: true,
        fileName,
        pdfUrl,
        blob: pdfBlob,
        datasheetsAppended: datasheetsCount
    };
}
