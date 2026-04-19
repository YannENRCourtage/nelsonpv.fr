import { PDFDocument } from 'pdf-lib';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Service de génération de Dossier de Déclaration Préalable (DP)
 */
export async function generateDPDossier(project, plates) {
    try {
        console.log("Démarrage de la génération DP pour:", project.name);

        // 1. Charger le template Cerfa 13404
        const cerfaBuffer = await fetch('/templates/cerfa_13404.pdf').then(res => res.arrayBuffer());
        const pdfDoc = await PDFDocument.load(cerfaBuffer);
        const form = pdfDoc.getForm();

        // 2. Remplissage des champs de base
        const fieldMapping = {
            // Identité
            'topmostSubform[0].Page2[0].F1_nom[0]': project.lastName || project.name,
            'topmostSubform[0].Page2[0].F1_prenom[0]': project.firstName || '',
            'topmostSubform[0].Page2[0].F2_adresseNum[0]': project.address?.split(' ')[0] || '',
            'topmostSubform[0].Page2[0].F2_adresseVoie[0]': project.address?.split(' ').slice(1).join(' ') || '',
            'topmostSubform[0].Page2[0].F2_commune[0]': project.city || '',
            'topmostSubform[0].Page2[0].F2_cp[0]': project.zip || '',
            
            // Terrain
            'topmostSubform[0].Page3[0].F3_numSection[0]': project.cadastre_section || '',
            'topmostSubform[0].Page3[0].F3_numParcelle[0]': project.cadastre_numero || '',
            'topmostSubform[0].Page3[0].F3_surfaceParcelle[0]': project.cadastre_surface || '',
            
            // Signature (placeholder)
            'topmostSubform[0].Page16[0].F9N_nom[0]': `${project.firstName || ''} ${project.lastName || project.name}`,
            'topmostSubform[0].Page16[0].F9D_date[0]': new Date().toLocaleDateString('fr-FR'),
        };

        // Remplissage effectif
        Object.entries(fieldMapping).forEach(([name, value]) => {
            try {
                const field = form.getTextField(name);
                if (field) field.setText(String(value));
            } catch (e) {
                console.warn(`Champ non trouvé ou non supporté: ${name}`);
            }
        });

        // Marquage Nelson (Branding)
        // On peut dessiner un rectangle blanc puis le logo sur les zones "Architecte" si nécessaire
        // Par exemple sur la page 1 ou 2
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        
        // Exemple de marquage en bas de page
        firstPage.drawRectangle({
            x: 50,
            y: 20,
            width: 200,
            height: 30,
            color: { r: 1, g: 1, b: 1 }
        });
        firstPage.drawText("Dossier généré par NELSON", {
            x: 60,
            y: 30,
            size: 10,
            color: { r: 0, g: 0.26, b: 0.61 }
        });

        const cerfaFilledBytes = await pdfDoc.save();

        // 3. Création du PDF Final (Fusion)
        const finalDoc = await PDFDocument.load(cerfaFilledBytes);

        // 4. Ajout des planches (Page 2, 3, 4...)
        if (plates) {
            const plateIds = ['dp-plate-situation', 'dp-plate-masse', 'dp-plate-notice'];
            for (const id of plateIds) {
                if (plates[id]) {
                    const plateImg = await finalDoc.embedPng(plates[id]);
                    const page = finalDoc.addPage([841.89, 595.28]); // A4 Paysage
                    page.drawImage(plateImg, {
                        x: 0,
                        y: 0,
                        width: 841.89,
                        height: 595.28,
                    });
                }
            }
        }
        
        const finalPdfBytes = await finalDoc.save();
        
        // Téléchargement
        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `DP_${project.name || 'Projet'}.pdf`;
        link.click();

        return true;
    } catch (error) {
        console.error("Erreur génération DP:", error);
        throw error;
    }
}
