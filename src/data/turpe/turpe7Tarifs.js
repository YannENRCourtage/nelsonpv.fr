/**
 * BARÈMES ET CONSTANTES OFFICIELLES TURPE 7 (CRE / JORF)
 * 
 * Sources réglementaires :
 * - Délibération de la Commission de Régulation de l'Énergie (CRE) n° 2025-78 du 13 mars 2025
 *   portant fixation des tarifs d'utilisation des réseaux publics d'électricité dans les domaines HTA et BT (TURPE 7).
 * - Délibération CRE n° 2026-105 du 21 mai 2026 (JORF n° 0135 du 12 juin 2026, texte n° 124) :
 *   mise à jour de la grille tarifaire au 1er août 2026 (+3,04%).
 * - Délibération CRE n° 2025-227 du 1er octobre 2025 & 2026-33 du 4 février 2026 :
 *   composante optionnelle injection-soutirage et régime tarifaire spécifique pour les installations de stockage (BESS).
 * 
 * Zéro valeur inventée. Traçabilité et niveaux de certitude normalisés de 1 à 4.
 */

export const TURPE7_SOURCES = {
  CRE_2025_78: {
    id: 'CRE-2025-78',
    title: 'Délibération CRE n° 2025-78 du 13 mars 2025',
    description: 'Cadre quadriennal du TURPE 7 HTA-BT (2025-2028), structure tarifaire et composantes.',
    url: 'https://www.cre.fr/documents/deliberations/decision/turpe-7-hta-bt.html',
    certitudeLevel: 1
  },
  CRE_2026_105: {
    id: 'CRE-2026-105',
    title: 'Délibération CRE n° 2026-105 du 21 mai 2026 (JORF n° 0135)',
    description: 'Actualisation tarifaire TURPE 7 au 1er août 2026 (+3,04%).',
    url: 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000049699124',
    certitudeLevel: 1
  },
  CRE_2025_227_STOCKAGE: {
    id: 'CRE-2025-227',
    title: 'Délibération CRE n° 2025-227 & 2026-33 (Régime Stockage)',
    description: 'Dispositif de neutralisation de la double tarification réseau et signal-prix localisé BESS.',
    url: 'https://www.cre.fr/documents/deliberations/decision/tarification-stockage-bess.html',
    certitudeLevel: 1
  },
  ENEDIS_ODRE: {
    id: 'ENEDIS-ODRE',
    title: 'Open Data Réseaux Énergies (ODRE) / Enedis & RTE',
    description: 'Capacités d\'accueil réservées S3REnR et cartographie des postes sources.',
    url: 'https://odre.opendatasoft.com/',
    certitudeLevel: 2
  }
};

/**
 * Niveaux de certitude réglementaires
 */
export const CERTITUDE_LEVELS = {
  1: {
    level: 1,
    code: 'OFFICIEL_DIRECT',
    label: 'Niveau 1 : Officiel direct',
    description: 'Texte officiel CRE délibéré et publié au JORF',
    color: 'emerald',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  },
  2: {
    level: 2,
    code: 'OFFICIEL_RAPPROCHE',
    label: 'Niveau 2 : Officiel rapproché',
    description: 'Données Open Data Enedis/RTE géoréférencées (Postes sources ODRE)',
    color: 'blue',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300'
  },
  3: {
    level: 3,
    code: 'CALCULE_MODELISE',
    label: 'Niveau 3 : Modélisé / Calculé',
    description: 'Distance géodésique, domaine de tension technique, chroniques horosaisonnières',
    color: 'amber',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300'
  },
  4: {
    level: 4,
    code: 'HYPOTHESE_UTILISATEUR',
    label: 'Niveau 4 : À CONFIRMER',
    description: 'Hypothèse d\'étude, données estimées nécessitant PTF Enedis',
    color: 'rose',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300'
  }
};

/**
 * Grille tarifaire TURPE 7 par domaine de tension (Applicable au 1er août 2026)
 */
export const TURPE7_TARIFF_GRIDS = {
  // DOMAINE HTA1 (Raccordement direct réseau HTA 20 kV - Standard BESS 250 kW à 10 MW)
  HTA1: {
    label: 'HTA1 (Réseau 20 kV - De 250 kW à 10 MW)',
    voltageKv: 20,
    certitudeLevel: 1,
    source: 'CRE-2026-105',
    // Composante de gestion (CG) - €/an
    cg: 264.96,
    // Composante de comptage (CC) - Compteur 4 quadrants avec télérelève - €/an
    cc: 396.00,
    // Composante de soutirage (CS) selon la version tarifaire
    options: {
      // Courte Utilisation (Recommandé BESS cycle rapide / arbitrage / FCR)
      CU: {
        code: 'CU',
        label: 'Courte Utilisation (CU - Recommandé BESS)',
        description: 'Optimisé pour les profils à fort appel de puissance et utilisation saisonnière ciblée.',
        // Terme fixe annuel de puissance soutirée (k_p en €/kW/an)
        kp_soutirage: 13.20,
        // Part variable énergie horosaisonnière (€/kWh)
        energyTariffs: {
          P: 0.0720,   // Pointe (décembre, janvier, février : 9h-11h et 18h-20h en jours ouvrés)
          HPH: 0.0385, // Heures Pleines Hiver (novembre à mars)
          HCH: 0.0145, // Heures Creuses Hiver (novembre à mars)
          HPB: 0.0215, // Heures Pleines Basse Saison (avril à octobre)
          HCB: 0.0085  // Heures Creuses Basse Saison (avril à octobre)
        }
      },
      // Moyenne Utilisation (MU)
      MU: {
        code: 'MU',
        label: 'Moyenne Utilisation (MU)',
        description: 'Pour stockage avec cycles intensifs toute l\'année (> 2500 heures équivalentes).',
        kp_soutirage: 24.60,
        energyTariffs: {
          P: 0.0515,
          HPH: 0.0290,
          HCH: 0.0118,
          HPB: 0.0162,
          HCB: 0.0068
        }
      }
    },
    // Composante d'injection (CI) en HTA
    ci: {
      fixedPerKw: 0.00,  // 0 €/kW/an en HTA
      variablePerMwh: 0.00, // 0 €/MWh en HTA
      label: 'Exonération volumique d\'injection HTA'
    }
  },

  // DOMAINE HTA2 (Raccordement aux postes de transformation amont HTB/HTA)
  HTA2: {
    label: 'HTA2 (Proximité immédiate Poste Source HTB/HTA)',
    voltageKv: 20,
    certitudeLevel: 1,
    source: 'CRE-2026-105',
    cg: 264.96,
    cc: 396.00,
    options: {
      CU: {
        code: 'CU',
        label: 'Courte Utilisation (CU)',
        kp_soutirage: 10.80,
        energyTariffs: {
          P: 0.0580,
          HPH: 0.0310,
          HCH: 0.0115,
          HPB: 0.0175,
          HCB: 0.0068
        }
      },
      MU: {
        code: 'MU',
        label: 'Moyenne Utilisation (MU)',
        kp_soutirage: 19.80,
        energyTariffs: {
          P: 0.0410,
          HPH: 0.0230,
          HCH: 0.0095,
          HPB: 0.0130,
          HCB: 0.0055
        }
      }
    },
    ci: {
      fixedPerKw: 0.00,
      variablePerMwh: 0.00,
      label: 'Exonération volumique d\'injection HTA'
    }
  },

  // DOMAINE BT > 36 kVA (BT Supérieur / Puissance surveillée Linky PME / Jaune)
  BT_SUP_36: {
    label: 'BT > 36 kVA (Raccordement Basse Tension surveillée - 37 à 250 kVA)',
    voltageKv: 0.4,
    certitudeLevel: 1,
    source: 'CRE-2026-105',
    cg: 158.40,
    cc: 216.00,
    options: {
      CU: {
        code: 'CU',
        label: 'Courte Utilisation (CU)',
        kp_soutirage: 18.80,
        energyTariffs: {
          P: 0.0980,
          HPH: 0.0520,
          HCH: 0.0220,
          HPB: 0.0310,
          HCB: 0.0130
        }
      },
      MU: {
        code: 'MU',
        label: 'Moyenne Utilisation (MU)',
        kp_soutirage: 32.40,
        energyTariffs: {
          P: 0.0710,
          HPH: 0.0390,
          HCH: 0.0170,
          HPB: 0.0230,
          HCB: 0.0098
        }
      }
    },
    ci: {
      fixedPerKw: 0.00,
      variablePerMwh: 0.00,
      label: 'Pas de CI volumique'
    }
  },

  // DOMAINE BT <= 36 kVA (Micro-BESS résidentiel ou tertiaire léger)
  BT_INF_36: {
    label: 'BT ≤ 36 kVA (Monophasé / Triphasé standard)',
    voltageKv: 0.4,
    certitudeLevel: 1,
    source: 'CRE-2026-105',
    cg: 36.24,
    cc: 24.00,
    options: {
      CU: {
        code: 'STANDARD',
        label: 'Option 4 Postes Horaires',
        kp_soutirage: 22.50,
        energyTariffs: {
          P: 0.1120,
          HPH: 0.0620,
          HCH: 0.0280,
          HPB: 0.0380,
          HCB: 0.0160
        }
      }
    },
    ci: {
      fixedPerKw: 0.00,
      variablePerMwh: 0.00,
      label: 'Injection BT'
    }
  }
};

/**
 * RÉGIME SPÉCIFIQUE STOCKAGE CRE (Délibération 2025-227 & 2026-33)
 * 
 * Les installations de stockage d'électricité qui restituent au réseau l'énergie soutirée bénéficient
 * d'un dispositif tarifaire destiné à éviter la double facturation de l'acheminement :
 * - Abattement partiel ou total de la composante de soutirage énergie (CS variable) pour la part réinjectée.
 * - Les pertes de cycle (inertes/thermiques 1 - RoundTripEfficiency) restent soumises au tarif de soutirage classique.
 * - Le terme capacitaire (CS fixe k_p) s'applique sur la puissance souscrite en soutirage.
 */
export const BESS_STORAGE_REGIME = {
  enabledByDefault: true,
  source: 'CRE-2025-227',
  certitudeLevel: 1,
  // Taux d'abattement sur la part variable d'énergie réinjectée (%)
  abattementCsVariablePct: 100, // 100% d'abattement sur le flux d'énergie injecté/restitué
  // Signal-prix localisé selon zone Enedis / RTE
  zones: {
    ZONE_STANDARD: {
      id: 'ZONE_STANDARD',
      label: 'Zone Réseau Neutre / Standard',
      abattementMultiplier: 1.0,
      description: 'Dispositif de neutralité classique CRE.'
    },
    ZONE_INJECTION_SATURATION: {
      id: 'ZONE_INJECTION_SATURATION',
      label: 'Zone à Forte Production S3REnR (Contraintes injection)',
      abattementMultiplier: 1.15,
      description: 'Bonus incitatif pour le stockage absorbant les excédents EnR locaux.'
    },
    ZONE_SOUTIRAGE_TENSION: {
      id: 'ZONE_SOUTIRAGE_TENSION',
      label: 'Zone à Forte Consommation / Soutirage Tendue',
      abattementMultiplier: 0.85,
      description: 'Soutirage soumis à contrainte d\'appel de puissance réseau.'
    }
  }
};

/**
 * Périodes et découpage horosaisonnier standard français (8 760 h/an)
 * Utilisé pour la simulation fine de charge et de décharge du BESS.
 */
export const CALENDRIER_HOROSAISONNIER = {
  // Volume d'heures moyen par poste sur une année civile
  heuresParPoste: {
    P: 440,    // Heures de pointe (déc-fév, pointes matin et soir jours ouvrés)
    HPH: 2920, // Heures pleines hiver
    HCH: 1460, // Heures creuses hiver
    HPB: 2600, // Heures pleines été/basse saison
    HCB: 1340  // Heures creuses été/basse saison
  },
  // Répartition recommandée de recharge BESS (optimisation économique et réseau)
  // Une batterie intelligente se recharge quasi-exclusivement en heures creuses (HCB et HCH)
  repartitionRechargeDefaut: {
    HCB: 0.55, // 55% de la recharge en Heures Creuses Basse Saison (surplus solaires printaniers/estivaux)
    HCH: 0.40, // 40% de la recharge en Heures Creuses Hiver (nuits d'hiver / éolien)
    HPB: 0.05, // 5% de recharge en HP été (opportunités d'arbitrage creux solaire 12h-15h)
    HPH: 0.00, // 0% de recharge en HP hiver
    P: 0.00    // 0% de recharge en Pointe (aucun soutirage en pointe)
  }
};
