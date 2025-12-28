/**
 * Simule un processus d'OCR et d'extraction de données via IA
 * @param {File[]} files - Liste des fichiers uploadés
 * @returns {Promise<Object>} - Données extraites
 */
export const simulateDataExtraction = async (files) => {
    console.log("IA Analysis started for files:", files.map(f => f.name));

    return new Promise((resolve) => {
        setTimeout(() => {
            // Simulation de données extraites intelligemment
            resolve({
                ia_date_analyse: new Date().toLocaleDateString('fr-FR'),
                ia_ref_dossier: `DOC-${Math.floor(Math.random() * 100000)}`,
                ia_numero_pdl: "09876543210987",
                ia_consommation_annuelle: "4500 kWh",
                ia_surface_toiture_detectee: "145 m²",
                ia_orientation_detectee: "Sud-Ouest",
                ia_analyse_statut: "Complet",
                ia_score_confiance: "98%"
            });
        }, 2500); // Délai réaliste de 2.5s
    });
};
