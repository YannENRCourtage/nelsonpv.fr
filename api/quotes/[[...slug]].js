import { prisma } from '../../src/lib/prisma.js';
import { setSecureCors } from '../common/_authMiddleware.js';

export default async function handler(req, res) {
    setSecureCors(req, res, 'GET,POST,PUT,PATCH,DELETE,OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { slug } = req.query;
    const id = slug && slug.length > 0 ? slug[0] : null;

    try {
        if (!id) {
            // LIST OR CREATE
            if (req.method === 'GET') {
                const { projectId, search } = req.query;
                const where = {};
                if (projectId) where.projectId = projectId;
                if (search) {
                    where.OR = [
                        { quoteNumber: { contains: search, mode: 'insensitive' } },
                        { clientName: { contains: search, mode: 'insensitive' } },
                        { clientEmail: { contains: search, mode: 'insensitive' } }
                    ];
                }

                const quotes = await prisma.projectQuote.findMany({
                    where,
                    orderBy: { updatedAt: 'desc' }
                });

                return res.status(200).json(quotes);
            }

            if (req.method === 'POST') {
                const data = req.body;
                if (!data.clientName) {
                    return res.status(400).json({ error: 'Le nom du client est requis' });
                }

                // Génération automatique d'un numéro de devis si absent
                const now = new Date();
                const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
                const quoteNumber = data.quoteNumber || `DEV-${yearMonth}-${Math.floor(1000 + Math.random() * 9000)}`;

                const created = await prisma.projectQuote.create({
                    data: {
                        quoteNumber,
                        projectId: data.projectId || null,
                        clientName: data.clientName,
                        clientAddress: data.clientAddress || null,
                        clientEmail: data.clientEmail || null,
                        clientPhone: data.clientPhone || null,
                        status: data.status || 'brouillon',
                        totalHtBrut: parseFloat(data.totalHtBrut || 0),
                        remiseGlobale: parseFloat(data.remiseGlobale || 0),
                        totalNetHt: parseFloat(data.totalNetHt || 0),
                        tvaDetails: data.tvaDetails || {},
                        totalTtc: parseFloat(data.totalTtc || 0),
                        sections: data.sections || [],
                        options: data.options || {},
                        commercialName: data.commercialName || null,
                        validityDays: parseInt(data.validityDays || 30)
                    }
                });

                return res.status(201).json(created);
            }

            return res.status(405).json({ error: 'Method not allowed' });
        } else {
            // GET, UPDATE, DELETE BY ID
            if (req.method === 'GET') {
                const quote = await prisma.projectQuote.findUnique({
                    where: { id }
                });
                if (!quote) return res.status(404).json({ error: 'Devis introuvable' });
                return res.status(200).json(quote);
            }

            if (req.method === 'PUT' || req.method === 'PATCH') {
                const data = req.body;
                const updated = await prisma.projectQuote.update({
                    where: { id },
                    data: {
                        ...data,
                        totalHtBrut: data.totalHtBrut !== undefined ? parseFloat(data.totalHtBrut) : undefined,
                        remiseGlobale: data.remiseGlobale !== undefined ? parseFloat(data.remiseGlobale) : undefined,
                        totalNetHt: data.totalNetHt !== undefined ? parseFloat(data.totalNetHt) : undefined,
                        totalTtc: data.totalTtc !== undefined ? parseFloat(data.totalTtc) : undefined,
                        validityDays: data.validityDays !== undefined ? parseInt(data.validityDays) : undefined
                    }
                });
                return res.status(200).json(updated);
            }

            if (req.method === 'DELETE') {
                await prisma.projectQuote.delete({
                    where: { id }
                });
                return res.status(200).json({ success: true, id });
            }

            return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Erreur API Quotes:', error);
        return res.status(500).json({ error: error.message || 'Erreur serveur interne' });
    }
}
