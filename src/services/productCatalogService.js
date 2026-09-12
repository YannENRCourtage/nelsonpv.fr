// Service de gestion du catalogue matériel solaire et dimensionnement automatique de devis

export const PRODUCT_CATEGORIES = [
    { id: 'module', label: 'Modules Photovoltaïques', icon: 'Sun' },
    { id: 'inverter', label: 'Onduleurs & Micro-onduleurs', icon: 'Zap' },
    { id: 'battery', label: 'Stockage & Batteries', icon: 'BatteryCharging' },
    { id: 'mounting', label: 'Systèmes de Fixation', icon: 'Layers' },
    { id: 'electrical', label: 'Matériel Électrique & Coffrets', icon: 'Cpu' },
    { id: 'service', label: 'Prestations & Raccordement', icon: 'Wrench' }
];

export const DEFAULT_PRODUCT_CATALOG = [
    // 1. MODULES PHOTOVOLTAÏQUES
    {
        id: 'cat-mod-01',
        ref: 'TSM-440NEG9R.28',
        marque: 'Trina Solar',
        modele: 'Vertex S+ 440W Biverre N-Type',
        category: 'module',
        puissanceWc: 440,
        prixUnitaireHt: 98.00,
        tauxTva: 20.0,
        unite: 'U',
        garantieAnnees: 25,
        ficheTechniqueUrl: 'https://static.trinasolar.com/sites/default/files/Datasheet_VertexS+_NEG9R.28_FR.pdf',
        caracteristiques: {
            rendement: '22.0%',
            technologie: 'Biverre N-Type TopCon',
            dimensions: '1762 × 1134 × 30 mm',
            poidsKg: 21.0,
            garantiePerformance: '30 ans (87.4%)'
        },
        description: 'Panneau solaire bi-verre haute performance N-Type, résistance mécanique renforcée et excellente tenue aux hautes températures.',
        isActive: true
    },
    {
        id: 'cat-mod-02',
        ref: 'TSM-500NEG18R.28',
        marque: 'Trina Solar',
        modele: 'Vertex S+ 500W Biverre N-Type',
        category: 'module',
        puissanceWc: 500,
        prixUnitaireHt: 115.00,
        tauxTva: 20.0,
        unite: 'U',
        garantieAnnees: 25,
        ficheTechniqueUrl: 'https://static.trinasolar.com/sites/default/files/Datasheet_VertexS+_NEG18R.28_FR.pdf',
        caracteristiques: {
            rendement: '22.5%',
            technologie: 'Biverre N-Type TopCon',
            dimensions: '1961 × 1134 × 30 mm',
            poidsKg: 23.5,
            garantiePerformance: '30 ans (87.4%)'
        },
        description: 'Module idéal pour grandes toitures résidentielles et tertiaires, maximisant la puissance au m².',
        isActive: true
    },
    {
        id: 'cat-mod-03',
        ref: 'DS-FLASH-500',
        marque: 'DualSun',
        modele: 'FLASH 500W Half-Cut Black',
        category: 'module',
        puissanceWc: 500,
        prixUnitaireHt: 135.00,
        tauxTva: 20.0,
        unite: 'U',
        garantieAnnees: 30,
        ficheTechniqueUrl: 'https://dualsun.com/wp-content/uploads/2023/11/Fiche-technique-DualSun-FLASH-500-Half-Cut-Black.pdf',
        caracteristiques: {
            rendement: '22.2%',
            technologie: 'Monocristallin PERC / TopCon Full Black',
            dimensions: '1950 × 1134 × 30 mm',
            poidsKg: 24.0,
            conception: 'Conçu en France (Marseille)'
        },
        description: 'Panneau solaire premium tout noir haute élégance, conçu en France avec garantie constructeur 30 ans.',
        isActive: true
    },
    {
        id: 'cat-mod-04',
        ref: 'MB-390-BLACK',
        marque: 'Meyer Burger',
        modele: 'Black 390W HJT Heterojunction',
        category: 'module',
        puissanceWc: 390,
        prixUnitaireHt: 145.00,
        tauxTva: 20.0,
        unite: 'U',
        garantieAnnees: 25,
        ficheTechniqueUrl: 'https://www.meyerburger.com/fileadmin/user_upload/Downloads/Datasheets/Meyer_Burger_Black_datasheet_fr.pdf',
        caracteristiques: {
            rendement: '21.5%',
            technologie: 'Hétérojonction (HJT) SmartWire',
            dimensions: '1767 × 1041 × 35 mm',
            poidsKg: 19.7,
            fabrication: 'Fabriqué en Allemagne / Suisse'
        },
        description: 'Cellules à hétérojonction brevetées haute sensibilité par faible ensoleillement, sans dégradation PID.',
        isActive: true
    },
    {
        id: 'cat-mod-05',
        ref: 'JAM54D41-445/LB',
        marque: 'JA Solar',
        modele: 'DeepBlue 4.0 Pro 445W Bifacial Biverre',
        category: 'module',
        puissanceWc: 445,
        prixUnitaireHt: 92.00,
        tauxTva: 20.0,
        unite: 'U',
        garantieAnnees: 25,
        ficheTechniqueUrl: 'https://www.jasolar.com/uploadfile/2023/1206/20231206035249673.pdf',
        caracteristiques: {
            rendement: '22.3%',
            technologie: 'Bifacial N-Type Bycium+',
            dimensions: '1762 × 1134 × 30 mm',
            poidsKg: 21.5
        },
        description: 'Gain bifacial face arrière jusqu\'à +25% selon l\'albédo de la toiture.',
        isActive: true
    },

    // 2. ONDULEURS & MICRO-ONDULEURS
    {
        id: 'cat-inv-01',
        ref: 'ENP-IQ8HC-72-M-INT',
        marque: 'Enphase Energy',
        modele: 'Micro-onduleur IQ8HC 384VA',
        category: 'inverter',
        puissanceWc: 384,
        prixUnitaireHt: 148.00,
        tauxTva: 20.0,
        unite: 'U',
        garantieAnnees: 25,
        ficheTechniqueUrl: 'https://enphase.com/fr-fr/download/iq8-and-iq8-microinverters-data-sheet',
        caracteristiques: {
            puissanceMaxSortie: '384 VA',
            rendementEuro: '97.2%',
            compatibilite: 'Modules 54, 60, 72 cellules jusqu\'à 540Wc',
            protection: 'IP67 / Double isolation'
        },
        description: 'Micro-onduleur dernière génération Enphase IQ8HC avec garantie 25 ans et coupure automatique intégrée.',
        isActive: true
    },
    {
        id: 'cat-inv-02',
        ref: 'SUN2000-6KTL-L1',
        marque: 'Huawei',
        modele: 'Onduleur Hybride 6kW Monophasé',
        category: 'inverter',
        puissanceWc: 6000,
        prixUnitaireHt: 1050.00,
        tauxTva: 20.0,
        unite: 'U',
        garantieAnnees: 10,
        ficheTechniqueUrl: 'https://solar.huawei.com/download?p=%2F-%2Fmedia%2FSolarV4%2Fsolar-version2%2Fregional-emea%2Ffr%2Fdownload%2FSUN2000-2-6KTL-L1.pdf',
        caracteristiques: {
            nbMppt: 2,
            rendementMax: '98.4%',
            batterieCompatible: 'Huawei LUNA2000 (5 à 30 kWh)',
            securite: 'AFCI intégrée (détection arc électrique IA)'
        },
        description: 'Onduleur hybride monophasé prêt pour batterie avec optimisation intelligente par module.',
        isActive: true
    },
    {
        id: 'cat-inv-03',
        ref: 'SUN2000-10KTL-M1',
        marque: 'Huawei',
        modele: 'Onduleur Hybride 10kW Triphasé High Current',
        category: 'inverter',
        puissanceWc: 10000,
        prixUnitaireHt: 1650.00,
        tauxTva: 20.0,
        unite: 'U',
        garantieAnnees: 10,
        ficheTechniqueUrl: 'https://solar.huawei.com/download?p=%2F-%2Fmedia%2FSolarV4%2Fsolar-version2%2Fregional-emea%2Ffr%2Fdownload%2FSUN2000-3-10KTL-M1.pdf',
        caracteristiques: {
            nbMppt: 2,
            rendementMax: '98.6%',
            courantMaxMppt: '13.5A / Entrée',
            batterieCompatible: 'Huawei LUNA2000'
        },
        description: 'Onduleur triphasé hybride haute performance compatible réseau triphasé et secours partiel.',
        isActive: true
    },
    {
        id: 'cat-inv-04',
        ref: 'SUN2000-30KTL-M3',
        marque: 'Huawei',
        modele: 'Onduleur Tertiaire 30kW Triphasé (4 MPPT)',
        category: 'inverter',
        puissanceWc: 30000,
        prixUnitaireHt: 2450.00,
        tauxTva: 20.0,
        unite: 'U',
        garantieAnnees: 10,
        ficheTechniqueUrl: 'https://solar.huawei.com/download?p=%2F-%2Fmedia%2FSolarV4%2Fsolar-version2%2Fregional-emea%2Ffr%2Fdownload%2FSUN2000-30-40KTL-M3.pdf',
        caracteristiques: {
            nbMppt: 4,
            rendementMax: '98.7%',
            protection: 'IP66 avec parafoudres DC et AC Type II'
        },
        description: 'Onduleur 30 kWc multi-MPPT pour bâtiments industriels, agricoles et ombrières de parking.',
        isActive: true
    },
    {
        id: 'cat-inv-05',
        ref: 'SUN2000-100KTL-M2',
        marque: 'Huawei',
        modele: 'Onduleur Industriel 100kW Triphasé (10 MPPT)',
        category: 'inverter',
        puissanceWc: 100000,
        prixUnitaireHt: 4950.00,
        tauxTva: 20.0,
        unite: 'U',
        garantieAnnees: 10,
        ficheTechniqueUrl: 'https://solar.huawei.com/download?p=%2F-%2Fmedia%2FSolarV4%2Fsolar-version2%2Fregional-emea%2Ffr%2Fdownload%2FSUN2000-100KTL-M2.pdf',
        caracteristiques: {
            nbMppt: 10,
            rendementMax: '98.8%',
            monitoring: 'Smart String IV Curve Diagnosis'
        },
        description: 'Onduleur industriel 100 kWc pour grandes toitures et parcs au sol.',
        isActive: true
    },
    {
        id: 'cat-inv-06',
        ref: 'SG10RT',
        marque: 'Sungrow',
        modele: 'Onduleur Réseau 10kW Triphasé',
        category: 'inverter',
        puissanceWc: 10000,
        prixUnitaireHt: 1390.00,
        tauxTva: 20.0,
        unite: 'U',
        garantieAnnees: 10,
        ficheTechniqueUrl: 'https://fra.sungrowpower.com/upload/file/20211119/FR_DS_SG5.0-12RT_Datasheet.pdf',
        caracteristiques: {
            nbMppt: 2,
            rendementEuro: '98.1%',
            communication: 'Wi-Fi / Ethernet inclus'
        },
        description: 'Onduleur de chaîne triphasé Sungrow compact et robuste, parfait pour toitures 9 à 15 kWc.',
        isActive: true
    },

    // 3. STOCKAGE & BATTERIES
    {
        id: 'cat-bat-01',
        ref: 'LUNA2000-5-E0',
        marque: 'Huawei',
        modele: 'Module Batterie LUNA2000 5kWh (LiFePO4)',
        category: 'battery',
        puissanceWc: 5000,
        prixUnitaireHt: 2200.00,
        tauxTva: 20.0,
        unite: 'U',
        garantieAnnees: 10,
        ficheTechniqueUrl: 'https://solar.huawei.com/download?p=%2F-%2Fmedia%2FSolarV4%2Fsolar-version2%2Fregional-emea%2Ffr%2Fdownload%2FLUNA2000-5-15-S0.pdf',
        caracteristiques: {
            capaciteUtile: '5.0 kWh',
            chimie: 'Lithium Fer Phosphate (LFP)',
            profondeurDecharge: '100% DOD',
            extensible: 'Jusqu\'à 30 kWh (2 tours de 15 kWh)'
        },
        description: 'Module de batterie haute sécurité avec optimiseur d\'énergie par module intégré.',
        isActive: true
    },
    {
        id: 'cat-bat-02',
        ref: 'LUNA2000-5KW-C0',
        marque: 'Huawei',
        modele: 'Module Contrôleur de Puissance BMS LUNA2000',
        category: 'battery',
        puissanceWc: 5000,
        prixUnitaireHt: 890.00,
        tauxTva: 20.0,
        unite: 'U',
        garantieAnnees: 10,
        ficheTechniqueUrl: 'https://solar.huawei.com/download?p=%2F-%2Fmedia%2FSolarV4%2Fsolar-version2%2Fregional-emea%2Ffr%2Fdownload%2FLUNA2000-5-15-S0.pdf',
        caracteristiques: {
            puissanceMaxChargeDecharge: '5 kW (2.5 kW par module batterie)',
            indiceProtection: 'IP66'
        },
        description: 'BMS contrôleur central pour système de batterie Huawei LUNA2000.',
        isActive: true
    },
    {
        id: 'cat-bat-03',
        ref: 'BYD-HVS-5.1',
        marque: 'BYD',
        modele: 'Battery-Box Premium HVS 5.1kWh Haute Tension',
        category: 'battery',
        puissanceWc: 5120,
        prixUnitaireHt: 3100.00,
        tauxTva: 20.0,
        unite: 'U',
        garantieAnnees: 10,
        ficheTechniqueUrl: 'https://www.bydbatterybox.com/uploads/downloads/20210331_BYD_Battery-Box_Premium_HVS_HVM_Datasheet_FR_V1.3-60643b9f8749b.pdf',
        caracteristiques: {
            capaciteUtile: '5.12 kWh',
            tensionNominale: '204 V',
            chimie: 'Lithium Fer Phosphate sans cobalt (LiFePO4)'
        },
        description: 'Batterie haute tension modulaire certifiée VDE 2510-50, compatible Fronius, SMA, Kostal, GoodWe.',
        isActive: true
    },

    // 4. SYSTÈMES DE FIXATION & STRUCTURES
    {
        id: 'cat-mou-01',
        ref: 'K2-SOLIDRAIL-PRO',
        marque: 'K2 Systems',
        modele: 'Système K2 SolidRail Surimposé (Tuiles / Ardoises)',
        category: 'mounting',
        prixUnitaireHt: 42.00,
        tauxTva: 20.0,
        unite: 'kWc',
        garantieAnnees: 12,
        ficheTechniqueUrl: 'https://k2-systems.com/wp-content/uploads/2022/10/k2-single-rail-system-fr.pdf',
        caracteristiques: {
            matiere: 'Aluminium anodisé et acier inoxydable A2',
            compatibilite: 'Tuiles mécaniques, canal, plates, ardoises',
            etancheite: 'Crochets réglables CrossHook 4S'
        },
        description: 'Système de fixation de référence européenne avec calcul statique certifié ETN.',
        isActive: true
    },
    {
        id: 'cat-mou-02',
        ref: 'K2-DOME-610',
        marque: 'K2 Systems',
        modele: 'Système D-Dome 6.10 Toiture Terrasse Lestée (Est-Ouest 10°)',
        category: 'mounting',
        prixUnitaireHt: 58.00,
        tauxTva: 20.0,
        unite: 'kWc',
        garantieAnnees: 12,
        ficheTechniqueUrl: 'https://k2-systems.com/wp-content/uploads/2023/02/k2-d-dome-6-system-fr.pdf',
        caracteristiques: {
            inclinaison: '10° Orientation Est-Ouest',
            pose: 'Sans perforation d\'étanchéité, avec tapis protecteurs',
            aerodynamique: 'Testé en soufflerie'
        },
        description: 'Structure autoportante sans perçage pour toits terrasses bitumineux, PVC ou EPDM.',
        isActive: true
    },
    {
        id: 'cat-mou-03',
        ref: 'DS-ROOFER-BAC',
        marque: 'Dome Solar',
        modele: 'Roofer Fixation Directe Bac Acier Trapézoïdal',
        category: 'mounting',
        prixUnitaireHt: 28.00,
        tauxTva: 20.0,
        unite: 'kWc',
        garantieAnnees: 10,
        ficheTechniqueUrl: 'https://www.dome-solar.com/medias/fiches-techniques/fiche-technique-roofer.pdf',
        caracteristiques: {
            fixation: 'Vis autoforantes avec rondelles EPDM d\'étanchéité',
            certifications: 'Enquête de Technique Nouvelle (ETN) et avis technique'
        },
        description: 'Système ultra léger et rapide pour bâtiments agricoles et industriels en bac acier.',
        isActive: true
    },
    {
        id: 'cat-mou-04',
        ref: 'TI-OMB-PK-01',
        marque: 'Technideal',
        modele: 'Structure Ombrière de Parking Métallique Bi-Pente',
        category: 'mounting',
        prixUnitaireHt: 420.00,
        tauxTva: 20.0,
        unite: 'place',
        garantieAnnees: 15,
        ficheTechniqueUrl: 'https://www.technideal.fr/docs/ombriere-parking-solaire-technideal.pdf',
        caracteristiques: {
            charpente: 'Acier galvanisé à chaud norme NF EN ISO 1461',
            recueilEaux: 'Gouttières et descentes pluviales intégrées',
            resistance: 'Calcul Eurocodes Neige & Vent (NV65)'
        },
        description: 'Ombrière solaire robuste avec réservation pour bornes de recharge IRVE.',
        isActive: true
    },

    // 5. MATÉRIEL ÉLECTRIQUE & COFFRETS
    {
        id: 'cat-elec-01',
        ref: 'COF-ACDC-6KW-MONO',
        marque: 'TechnoVolt / Solen',
        modele: 'Coffret de Protection AC/DC 3-6kW Monophasé',
        category: 'electrical',
        prixUnitaireHt: 380.00,
        tauxTva: 20.0,
        unite: 'U',
        garantieAnnees: 5,
        caracteristiques: {
            dc: 'Sectionneur DC 1000V + Parafoudre Type 2',
            ac: 'Disjoncteur différentiel 30mA Hi + Parafoudre Type 2',
            norme: 'Conforme guide UTE C15-712-1'
        },
        description: 'Coffret de protection prêt à câbler conforme aux exigences Consuel.',
        isActive: true
    },
    {
        id: 'cat-elec-02',
        ref: 'COF-ACDC-36KW-TRI',
        marque: 'TechnoVolt / Solen',
        modele: 'Coffret de Protection AC/DC 9-36kW Triphasé',
        category: 'electrical',
        prixUnitaireHt: 790.00,
        tauxTva: 20.0,
        unite: 'U',
        garantieAnnees: 5,
        caracteristiques: {
            dc: '2 entrées MPPT avec parafoudres Type 2',
            ac: 'Disjoncteur tétrapolaire + coupure d\'urgence déportée',
            norme: 'Conforme UTE C15-712-1'
        },
        description: 'Coffret triphasé tertiaire avec coupure générale d\'urgence.',
        isActive: true
    },
    {
        id: 'cat-elec-03',
        ref: 'CAB-SOL-6MM-MC4',
        marque: 'Prysmian / Top Cable',
        modele: 'Lot Câblage Solaire H1Z2Z2-K 6mm² & Connecteurs Staubli MC4',
        category: 'electrical',
        prixUnitaireHt: 140.00,
        tauxTva: 20.0,
        unite: 'forfait',
        garantieAnnees: 10,
        description: 'Câble cuivre étamé double isolation anti-UV et connecteurs originaux étanches IP68.',
        isActive: true
    },
    {
        id: 'cat-elec-04',
        ref: 'COMM-GATEWAY-01',
        marque: 'Enphase / Huawei',
        modele: 'Passerelle de Supervision & Compteur d\'Énergie Intelligent',
        category: 'electrical',
        prixUnitaireHt: 420.00,
        tauxTva: 20.0,
        unite: 'U',
        garantieAnnees: 5,
        description: 'Mesure de production et de consommation en temps réel via application mobile et portail web.',
        isActive: true
    },

    // 6. PRESTATIONS, POSE, CONSUEL & RACCORDEMENT
    {
        id: 'cat-serv-01',
        ref: 'PREST-POSE-PV',
        marque: 'ENR Courtage Énergie',
        modele: 'Pose en toiture, calepinage & fixation des modules',
        category: 'service',
        prixUnitaireHt: 180.00,
        tauxTva: 20.0,
        unite: 'kWc',
        description: 'Installation certifiée RGE QualiPV, respect des règles de l\'art, sécurisation antichute et lignes de vie.',
        isActive: true
    },
    {
        id: 'cat-serv-02',
        ref: 'PREST-ELEC-RACC',
        marque: 'ENR Courtage Énergie',
        modele: 'Câblage électrique, raccordement TGBT & mise en service',
        category: 'service',
        prixUnitaireHt: 750.00,
        tauxTva: 20.0,
        unite: 'forfait',
        description: 'Pose des coffrets, tirage de câbles, mise à la terre, essais d\'isolement et paramétrage des onduleurs.',
        isActive: true
    },
    {
        id: 'cat-serv-03',
        ref: 'PREST-ADMIN-CONSUEL',
        marque: 'ENR Courtage Énergie',
        modele: 'Dossier administratif clé en main (DP, Enedis SGE, Consuel)',
        category: 'service',
        prixUnitaireHt: 450.00,
        tauxTva: 20.0,
        unite: 'forfait',
        description: 'Gestion complète : Déclaration Préalable de Travaux en Mairie, convention de raccordement Enedis et obtention de l\'attestation de conformité Consuel Bleu/Violet.',
        isActive: true
    }
];

const LOCAL_STORAGE_CATALOG_KEY = 'nelson_product_catalog_custom';

/**
 * Récupère le catalogue de produits (depuis API ou LocalStorage avec fallback par défaut)
 */
export async function getProductCatalog(filters = {}) {
    try {
        const queryParams = new URLSearchParams();
        if (filters.category && filters.category !== 'all') queryParams.append('category', filters.category);
        if (filters.search) queryParams.append('search', filters.search);
        if (filters.activeOnly) queryParams.append('activeOnly', 'true');

        const res = await fetch(`/api/catalog?${queryParams.toString()}`);
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                return data;
            }
        }
    } catch (e) {
        // En cas d'erreur ou si base vide, fallback local
    }

    // Récupération locale ou défaut
    try {
        const local = localStorage.getItem(LOCAL_STORAGE_CATALOG_KEY);
        let items = local ? JSON.parse(local) : DEFAULT_PRODUCT_CATALOG;

        if (filters.category && filters.category !== 'all') {
            items = items.filter(i => i.category === filters.category);
        }
        if (filters.search) {
            const q = filters.search.toLowerCase();
            items = items.filter(i => 
                (i.ref && i.ref.toLowerCase().includes(q)) ||
                (i.marque && i.marque.toLowerCase().includes(q)) ||
                (i.modele && i.modele.toLowerCase().includes(q))
            );
        }
        if (filters.activeOnly) {
            items = items.filter(i => i.isActive !== false);
        }
        return items;
    } catch (err) {
        return DEFAULT_PRODUCT_CATALOG;
    }
}

/**
 * Enregistre ou modifie un produit dans le catalogue
 */
export async function saveCatalogItem(itemData) {
    try {
        const isUpdate = Boolean(itemData.id && !itemData.id.startsWith('cat-'));
        const url = isUpdate ? `/api/catalog/${itemData.id}` : '/api/catalog';
        const method = isUpdate ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemData)
        });

        if (res.ok) {
            return await res.json();
        }
    } catch (e) {
        console.warn('Sauvegarde API échouée, enregistrement local', e);
    }

    // Fallback LocalStorage
    try {
        const local = localStorage.getItem(LOCAL_STORAGE_CATALOG_KEY);
        let items = local ? JSON.parse(local) : [...DEFAULT_PRODUCT_CATALOG];
        const index = items.findIndex(i => i.id === itemData.id || i.ref === itemData.ref);

        const savedItem = {
            ...itemData,
            id: itemData.id || `custom-${Date.now()}`,
            updatedAt: new Date().toISOString()
        };

        if (index >= 0) {
            items[index] = savedItem;
        } else {
            items.push(savedItem);
        }

        localStorage.setItem(LOCAL_STORAGE_CATALOG_KEY, JSON.stringify(items));
        return savedItem;
    } catch (err) {
        return itemData;
    }
}

/**
 * Réinitialise le catalogue aux produits officiels ENR Courtage
 */
export function resetCatalogToDefaults() {
    localStorage.removeItem(LOCAL_STORAGE_CATALOG_KEY);
    return DEFAULT_PRODUCT_CATALOG;
}

/**
 * DIMENSIONNEMENT INTELLIGENT DE DEVIS :
 * Génère automatiquement la structure complète des lignes de devis pour un projet donné
 */
export function generateDefaultQuoteLines(project = {}) {
    // 1. Détermination de la puissance cible (kWc)
    let powerKwc = 9.0;
    if (project.projectSize) {
        const parsed = parseFloat(String(project.projectSize).replace(/[^0-9.]/g, ''));
        if (!isNaN(parsed) && parsed > 0) powerKwc = parsed;
    } else if (project.puissanceKwc) {
        powerKwc = parseFloat(project.puissanceKwc) || 9.0;
    }

    // Taux de TVA : Résidentiel ≤ 3kWc = 10%, sinon 20%
    const defaultTvaRate = powerKwc <= 3.0 ? 10.0 : 20.0;

    // 2. Choix du module (Trina 440W par défaut)
    const moduleItem = DEFAULT_PRODUCT_CATALOG.find(i => i.ref === 'TSM-440NEG9R.28') || DEFAULT_PRODUCT_CATALOG[0];
    const modulePowerWc = moduleItem.puissanceWc || 440;
    const nbPanels = Math.ceil((powerKwc * 1000) / modulePowerWc);
    const realPowerKwc = Number(((nbPanels * modulePowerWc) / 1000).toFixed(2));

    // 3. Choix de l'onduleur selon la puissance
    let inverterItem;
    let nbInverters = 1;

    if (powerKwc <= 4.0) {
        // Micro-onduleurs Enphase (1 par module) ou Huawei 3-6kW
        inverterItem = DEFAULT_PRODUCT_CATALOG.find(i => i.ref === 'SUN2000-6KTL-L1');
        nbInverters = 1;
    } else if (powerKwc <= 12.0) {
        inverterItem = DEFAULT_PRODUCT_CATALOG.find(i => i.ref === 'SUN2000-10KTL-M1');
        nbInverters = 1;
    } else if (powerKwc <= 40.0) {
        inverterItem = DEFAULT_PRODUCT_CATALOG.find(i => i.ref === 'SUN2000-30KTL-M3');
        nbInverters = Math.ceil(powerKwc / 30);
    } else {
        inverterItem = DEFAULT_PRODUCT_CATALOG.find(i => i.ref === 'SUN2000-100KTL-M2');
        nbInverters = Math.max(1, Math.round(powerKwc / 100));
    }

    // 4. Choix de la structure de fixation
    const structureItem = DEFAULT_PRODUCT_CATALOG.find(i => i.ref === 'K2-SOLIDRAIL-PRO');

    // 5. Coffrets & Câblage
    const coffretRef = powerKwc <= 6.0 ? 'COF-ACDC-6KW-MONO' : 'COF-ACDC-36KW-TRI';
    const coffretItem = DEFAULT_PRODUCT_CATALOG.find(i => i.ref === coffretRef) || DEFAULT_PRODUCT_CATALOG.find(i => i.ref === 'COF-ACDC-36KW-TRI');
    const cablageItem = DEFAULT_PRODUCT_CATALOG.find(i => i.ref === 'CAB-SOL-6MM-MC4');
    const gatewayItem = DEFAULT_PRODUCT_CATALOG.find(i => i.ref === 'COMM-GATEWAY-01');

    // 6. Prestations
    const poseItem = DEFAULT_PRODUCT_CATALOG.find(i => i.ref === 'PREST-POSE-PV');
    const elecItem = DEFAULT_PRODUCT_CATALOG.find(i => i.ref === 'PREST-ELEC-RACC');
    const adminItem = DEFAULT_PRODUCT_CATALOG.find(i => i.ref === 'PREST-ADMIN-CONSUEL');

    // Construction des sections ordonnées
    const sections = [
        {
            id: 'sec-pv',
            title: '1. Générateur Photovoltaïque (Modules & Onduleurs)',
            description: 'Matériel haute performance certifié CE, IEC, avec garanties constructeurs longue durée',
            lines: [
                {
                    id: 'line-mod',
                    ref: moduleItem.ref,
                    designation: `${moduleItem.marque} ${moduleItem.modele} (${moduleItem.puissanceWc}Wc)`,
                    details: `Technologie ${moduleItem.caracteristiques?.technologie || 'TopCon'}, dimensions ${moduleItem.caracteristiques?.dimensions || ''}. Garantie produit ${moduleItem.garantieAnnees} ans.`,
                    quantite: nbPanels,
                    unite: 'U',
                    prixUnitaireHt: moduleItem.prixUnitaireHt,
                    remisePourcent: 0,
                    tauxTva: defaultTvaRate,
                    ficheTechniqueUrl: moduleItem.ficheTechniqueUrl,
                    includeDatasheet: true
                },
                {
                    id: 'line-inv',
                    ref: inverterItem.ref,
                    designation: `${inverterItem.marque} ${inverterItem.modele}`,
                    details: `Rendement maximal ${inverterItem.caracteristiques?.rendementMax || '98.5%'}, garantie ${inverterItem.garantieAnnees} ans.`,
                    quantite: nbInverters,
                    unite: 'U',
                    prixUnitaireHt: inverterItem.prixUnitaireHt,
                    remisePourcent: 0,
                    tauxTva: defaultTvaRate,
                    ficheTechniqueUrl: inverterItem.ficheTechniqueUrl,
                    includeDatasheet: true
                },
                {
                    id: 'line-mou',
                    ref: structureItem.ref,
                    designation: `${structureItem.marque} ${structureItem.modele}`,
                    details: 'Rails aluminium et étriers en inox, calcul statique de charge aux normes Eurocodes.',
                    quantite: realPowerKwc,
                    unite: 'kWc',
                    prixUnitaireHt: structureItem.prixUnitaireHt,
                    remisePourcent: 0,
                    tauxTva: defaultTvaRate,
                    ficheTechniqueUrl: structureItem.ficheTechniqueUrl,
                    includeDatasheet: true
                }
            ]
        },
        {
            id: 'sec-elec',
            title: '2. Matériel Électrique, Câblage & Supervision',
            description: 'Composants de protection conformes aux normes UTE C15-712-1',
            lines: [
                {
                    id: 'line-cof',
                    ref: coffretItem.ref,
                    designation: `${coffretItem.marque} ${coffretItem.modele}`,
                    details: 'Parafoudres DC Type 2, disjoncteur différentiel AC haute sensibilité et coupure d\'urgence.',
                    quantite: 1,
                    unite: 'U',
                    prixUnitaireHt: coffretItem.prixUnitaireHt,
                    remisePourcent: 0,
                    tauxTva: defaultTvaRate,
                    includeDatasheet: false
                },
                {
                    id: 'line-cab',
                    ref: cablageItem.ref,
                    designation: cablageItem.modele,
                    details: 'Câbles solaires blindés 6mm², cheminements sous goulotte UV et mise à la terre des châssis.',
                    quantite: 1,
                    unite: 'forfait',
                    prixUnitaireHt: cablageItem.prixUnitaireHt,
                    remisePourcent: 0,
                    tauxTva: defaultTvaRate,
                    includeDatasheet: false
                },
                {
                    id: 'line-comm',
                    ref: gatewayItem.ref,
                    designation: gatewayItem.modele,
                    details: 'Passerelle connectée Wi-Fi / 4G avec application smartphone pour suivi de la production et consommation.',
                    quantite: 1,
                    unite: 'U',
                    prixUnitaireHt: gatewayItem.prixUnitaireHt,
                    remisePourcent: 0,
                    tauxTva: defaultTvaRate,
                    includeDatasheet: false
                }
            ]
        },
        {
            id: 'sec-install',
            title: '3. Main d\'Œuvre, Installation & Raccordement',
            description: 'Intervention réalisée par nos techniciens qualifiés QualiPV',
            lines: [
                {
                    id: 'line-pose',
                    ref: poseItem.ref,
                    designation: poseItem.modele,
                    details: 'Levage, fixation surimposée de la structure, pose et câblage des panneaux solaires.',
                    quantite: realPowerKwc,
                    unite: 'kWc',
                    prixUnitaireHt: poseItem.prixUnitaireHt,
                    remisePourcent: 0,
                    tauxTva: defaultTvaRate,
                    includeDatasheet: false
                },
                {
                    id: 'line-racc',
                    ref: elecItem.ref,
                    designation: elecItem.modele,
                    details: 'Liaison au TGBT client, équilibrage des phases, tests de continuité et mise en service officielle.',
                    quantite: 1,
                    unite: 'forfait',
                    prixUnitaireHt: elecItem.prixUnitaireHt,
                    remisePourcent: 0,
                    tauxTva: defaultTvaRate,
                    includeDatasheet: false
                }
            ]
        },
        {
            id: 'sec-admin',
            title: '4. Démarches Administratives & Conformité',
            description: 'Prise en charge intégrale des formalités légales et réglementaires',
            lines: [
                {
                    id: 'line-admin',
                    ref: adminItem.ref,
                    designation: adminItem.modele,
                    details: 'Dépôt Déclaration Préalable (DP) Mairie, contrat de raccordement Enedis SGE et certificat Consuel.',
                    quantite: 1,
                    unite: 'forfait',
                    prixUnitaireHt: adminItem.prixUnitaireHt,
                    remisePourcent: 0,
                    tauxTva: defaultTvaRate,
                    includeDatasheet: false
                }
            ]
        }
    ];

    return {
        powerKwc: realPowerKwc,
        nbPanels,
        moduleRef: moduleItem.ref,
        inverterRef: inverterItem.ref,
        sections
    };
}
