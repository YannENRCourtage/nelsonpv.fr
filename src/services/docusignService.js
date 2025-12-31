
/**
 * Service pour interagir avec l'API DocuSign (via le backend)
 */

export const signDocument = async (pdfBlob, signerInfo, docName) => {
    // 1. Convert Blob to Base64
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onerror = () => {
            reader.abort();
            reject(new Error("Problem parsing input file."));
        };
        reader.onload = async () => {
            const base64String = reader.result.split(',')[1];

            try {
                // 2. Call Backend API
                const response = await fetch('/api/docusign/create-envelope', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        pdfBase64: base64String,
                        signerEmail: signerInfo.email,
                        signerName: signerInfo.name,
                        docName: docName
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Erreur DocuSign');
                }

                const data = await response.json();
                resolve(data.url);
            } catch (err) {
                reject(err);
            }
        };
        reader.readAsDataURL(pdfBlob);
    });
};
