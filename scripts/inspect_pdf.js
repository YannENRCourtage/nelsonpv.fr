import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

async function listFields() {
    try {
        const fileBuffer = fs.readFileSync('public/templates/cerfa_13404.pdf');
        const pdfDoc = await PDFDocument.load(fileBuffer);
        const form = pdfDoc.getForm();
        const fields = form.getFields();

        console.log('--- FORM FIELDS ---');
        fields.forEach(field => {
            const type = field.constructor.name;
            const name = field.getName();
            console.log(`${name} [${type}]`);
        });
    } catch (e) {
        console.error(e);
    }
}

listFields();
