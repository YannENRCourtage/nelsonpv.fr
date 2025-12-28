import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';

/**
 * Génère un document Word à partir d'un template et de données
 * @param {string|File} templateSource - URL du template ou File Object
 * @param {Object} data - Données à injecter
 * @param {string} outputName - Nom du fichier de sortie
 */
export const generateDocument = async (templateSource, data, outputName = "document_genere.docx") => {
    try {
        let content;

        // Gestion: URL ou Fichier Uploadé
        if (typeof templateSource === 'string') {
            const response = await fetch(templateSource);
            if (!response.ok) throw new Error(`Impossible de charger le template: ${response.statusText}`);
            content = await response.arrayBuffer();
        } else if (templateSource instanceof File) {
            content = await templateSource.arrayBuffer();
        } else {
            throw new Error("Source du template invalide");
        }

        const zip = new PizZip(content);

        // Configuration Docxtemplater : nullGetter pour éviter les crashs sur undefined
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            nullGetter: (part) => {
                if (!part.module) return "{MANQUANT}";
                if (part.module === "rawxml") return "";
                return "";
            }
        });

        // Injection des données
        doc.render(data);

        // Génération Blob
        const out = doc.getZip().generate({
            type: "blob",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });

        // Téléchargement
        saveAs(out, outputName);
        return true;

    } catch (error) {
        console.error("Erreur génération document:", error);
        // On propage l'erreur pour la gérer dans l'UI
        if (error.properties && error.properties.errors) {
            const loopErrors = error.properties.errors.map(e => e.properties.explanation).join(' | ');
            throw new Error(`Erreur Template: ${loopErrors}`);
        }
        throw error;
    }
};
