import React, { useState } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Send, CheckCircle, Download } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function CourrierEnvoiCU({ project, onClose }) {
  const [applicantLastName, setApplicantLastName] = useState(project?.lastName || project?.name || '');
  const [applicantFirstName, setApplicantFirstName] = useState(project?.firstName || '');
  const [applicantEmail, setApplicantEmail] = useState(project?.email || 'contact@enr-courtage.fr');
  const [trackingNumber, setTrackingNumber] = useState('1A 175 109 5451 9');
  const [mairieCity, setMairieCity] = useState(project?.city || project?.cadastre_commune || 'MONTAUT');
  const [mairieZip, setMairieZip] = useState(project?.zip || '24560');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGeneratePdf = async () => {
    setIsGenerating(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 Portrait
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const currentDate = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

      // Header logo / text
      page.drawText('E N R', { x: 50, y: 790, size: 24, font: fontBold, color: rgb(0.1, 0.5, 0.2) });
      page.drawText('COURTAGE ENERGIE', { x: 50, y: 775, size: 10, font: fontBold, color: rgb(0.4, 0.4, 0.4) });

      // Date & Place
      page.drawText(`À Coulounieix-Chamiers, le ${currentDate}`, { x: 340, y: 760, size: 10, font });

      // Recipient (Mairie)
      page.drawText('MAIRIE DE', { x: 340, y: 710, size: 11, font: fontBold });
      page.drawText(`Le Bourg`, { x: 340, y: 695, size: 10, font });
      page.drawText(`${mairieZip} ${mairieCity.toUpperCase()}`, { x: 340, y: 680, size: 10, font: fontBold });

      // Registered Mail Tracking Number
      page.drawText(`Courrier recommandé avec AR N° ${trackingNumber}`, { x: 50, y: 630, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

      // Subject
      page.drawText('Objet : Demande de certificat d\'urbanisme opérationnel', { x: 50, y: 590, size: 11, font: fontBold });

      // Salutation
      page.drawText('Monsieur le Maire,', { x: 50, y: 550, size: 10, font });

      // Body text
      const body1 = `Vous trouverez ci-joint les exemplaires de la demande de certificat d'urbanisme opérationnel`;
      const body2 = `pour un projet de construction sur votre commune. Vous trouverez tous ces pièces éléments suivants :`;
      page.drawText(body1, { x: 50, y: 520, size: 10, font });
      page.drawText(body2, { x: 50, y: 505, size: 10, font });

      // List of attachments
      const items = [
        `• Cerfa 16702*02`,
        `• CU1 Plan de situation`,
        `• CU2 Note descriptive du projet`,
        `• CU3 Plan du terrain`,
        `• Photo de la parcelle`
      ];
      let yPos = 475;
      items.forEach(item => {
        page.drawText(item, { x: 70, y: yPos, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
        yPos -= 18;
      });

      // Closing text
      yPos -= 15;
      page.drawText(`Je vous remercie de bien vouloir me retourner par mail à l'adresse ${applicantEmail} :`, { x: 50, y: yPos, size: 10, font });
      yPos -= 20;
      page.drawText(`> le récépissé de dépôt du certificat d'urbanisme duly complété tamponné et signé.`, { x: 70, y: yPos, size: 10, font: fontBold, color: rgb(0, 0.3, 0.7) });
      yPos -= 25;
      page.drawText(`Je reste à votre disposition pour tout renseignement complémentaire.`, { x: 50, y: yPos, size: 10, font });
      yPos -= 20;
      page.drawText(`Cordialement,`, { x: 50, y: yPos, size: 10, font });

      // Signature block
      yPos -= 45;
      const fullName = `${applicantFirstName} ${applicantLastName}`.trim() || 'Demandeur ENR Courtage';
      page.drawText(fullName, { x: 340, y: yPos, size: 11, font: fontBold });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `Courrier_Envoi_CU_${mairieCity}.pdf`;
      link.click();

      toast({ title: "Courrier CU généré !", description: "Le PDF de la lettre d'accompagnement a été téléchargé." });
      if (onClose) onClose();
    } catch (err) {
      console.error("Erreur génération courrier CU:", err);
      toast({ title: "Erreur", description: "Impossible de générer le courrier.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-4 space-y-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
        <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-base">Courrier d'envoi du CU (Mairie)</h3>
          <p className="text-xs text-slate-500">Génération automatique de la lettre d'accompagnement en recommandé AR</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Nom du demandeur</label>
          <Input value={applicantLastName} onChange={(e) => setApplicantLastName(e.target.value)} placeholder="Nom" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Prénom du demandeur</label>
          <Input value={applicantFirstName} onChange={(e) => setApplicantFirstName(e.target.value)} placeholder="Prénom" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Email pour le récépissé</label>
          <Input value={applicantEmail} onChange={(e) => setApplicantEmail(e.target.value)} placeholder="Email" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">N° Suivi Recommandé AR</label>
          <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="1A 175 109 5451 9" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Commune de la Mairie</label>
          <Input value={mairieCity} onChange={(e) => setMairieCity(e.target.value)} placeholder="Commune" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Code Postal Mairie</label>
          <Input value={mairieZip} onChange={(e) => setMairieZip(e.target.value)} placeholder="Code Postal" />
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
        {onClose && (
          <Button variant="outline" onClick={onClose} size="sm">
            Fermer
          </Button>
        )}
        <Button onClick={handleGeneratePdf} disabled={isGenerating} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
          <Download className="w-4 h-4 mr-1.5" />
          Générer la lettre (PDF)
        </Button>
      </div>
    </div>
  );
}
