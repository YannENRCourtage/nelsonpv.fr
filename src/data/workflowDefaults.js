export const DEFAULT_WORKFLOW_STEPS = [
  {
    id: 'mandatement_geometre',
    label: 'Mandatement Géomètre',
    type: 'mandatement',
    icon: 'MapPin',
    description: 'Division parcellaire',
    defaultDurationDays: 30,
    actions: ['Contacter géomètre', 'Validation devis', 'Réception plan de division'],
    order: 1
  },
  {
    id: 'cu',
    label: 'Certificat d\'Urbanisme CU',
    type: 'urbanisme',
    icon: 'FileText',
    description: 'Demande de CU opérationnel',
    defaultDurationDays: 60,
    actions: ['Dépôt dossier', 'Instruction mairie', 'Réception arrêté'],
    order: 2
  },
  {
    id: 'dp',
    label: 'Urbanisme DP - Déclaration Préalable',
    type: 'urbanisme',
    icon: 'FileText',
    description: 'Dossier DP complet',
    defaultDurationDays: 30,
    actions: ['Constitution dossier', 'Dépôt mairie', 'Affichage récépissé', 'Arrêté de non-opposition'],
    order: 3
  },
  {
    id: 'pc',
    label: 'Urbanisme PC - Permis de Construire',
    type: 'urbanisme',
    icon: 'FileText',
    description: 'Dossier PC complet',
    defaultDurationDays: 90,
    actions: ['Constitution dossier architecte', 'Dépôt mairie', 'Instruction', 'Arrêté de permis'],
    order: 4
  },
  {
    id: 'mandatement_notaire',
    label: 'Mandatement Notaire',
    type: 'mandatement',
    icon: 'ScrollText',
    description: 'Bail emphytéotique',
    defaultDurationDays: 60,
    actions: ['Choix notaire', 'Rédaction bail', 'Signature promesse', 'Signature acte authentique'],
    order: 5
  },
  {
    id: 'constat_huissier',
    label: 'Constat Huissier',
    type: 'mandatement',
    icon: 'Gavel',
    description: 'Affichage panneau 2 mois',
    defaultDurationDays: 60,
    actions: ['Pose panneau', '1er passage huissier', '2ème passage', '3ème passage et constat'],
    order: 6
  },
  {
    id: 'aos',
    label: 'AOS - Appel d\'Offres Simplifié',
    type: 'admin',
    icon: 'ClipboardList',
    description: 'Appel d\'Offres Simplifié',
    defaultDurationDays: 45,
    actions: ['Rédaction cahier des charges', 'Publication', 'Analyse offres', 'Sélection'],
    order: 7
  },
  {
    id: 'ao',
    label: 'AO - Appel d\'Offres',
    type: 'admin',
    icon: 'ClipboardList',
    description: 'Appel d\'Offres CRE',
    defaultDurationDays: 120,
    actions: ['Dossier candidature', 'Dépôt CRE', 'Instruction', 'Lauréat'],
    order: 8
  },
  {
    id: 'tarif_t0',
    label: 'Tarif T0',
    type: 'admin',
    icon: 'Euro',
    description: 'Obtention tarif selon puissance',
    defaultDurationDays: 15,
    actions: ['Demande contrat achat', 'Fixation tarif T0'],
    order: 9
  },
  {
    id: 'raccordement',
    label: 'Demande de Raccordement',
    type: 'raccordement',
    icon: 'Zap',
    description: 'Raccordement Enedis',
    defaultDurationDays: 90,
    actions: ['Dépôt portail Enedis', 'PTF', 'CRA', 'Paiement acompte'],
    order: 10
  },
  {
    id: 'contrat_cardi',
    label: 'Contrat CARDi',
    type: 'admin',
    icon: 'FileSignature',
    description: 'Contrat d\'Accès au Réseau Public de Distribution',
    defaultDurationDays: 30,
    actions: ['Demande CARDi', 'Signature Enedis'],
    order: 11
  },
  {
    id: 'travaux_charpente',
    label: 'Travaux Charpente',
    type: 'travaux',
    icon: 'Hammer',
    description: 'Renforcement ou création charpente',
    defaultDurationDays: 45,
    actions: ['Devis', 'Commande', 'Intervention', 'Réception'],
    order: 12
  },
  {
    id: 'travaux_pv',
    label: 'Travaux Centrale PV',
    type: 'travaux',
    icon: 'Sun',
    description: 'Installation panneaux et onduleurs',
    defaultDurationDays: 30,
    actions: ['Livraison matériel', 'Pose structures', 'Pose modules', 'Câblage', 'Consuel'],
    order: 13
  }
];

export const STEP_STATUSES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed'
};

export const PROJECT_TYPES = [
  { id: 'batterie', label: 'Batterie de stockage', icon: 'Battery' },
  { id: 'batiment_solaire', label: 'Bâtiment Solaire', icon: 'Building' },
  { id: 'ombriere', label: 'Ombrière de parking', icon: 'Car' },
  { id: 'toiture', label: 'Panneaux en toiture', icon: 'Home' }
];
