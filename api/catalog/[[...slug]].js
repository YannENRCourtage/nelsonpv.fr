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
            // LIST / CREATE
            if (req.method === 'GET') {
                const { category, search, activeOnly } = req.query;
                const where = {};

                if (category && category !== 'all') {
                    where.category = category;
                }
                if (activeOnly === 'true') {
                    where.isActive = true;
                }
                if (search) {
                    where.OR = [
                        { ref: { contains: search, mode: 'insensitive' } },
                        { marque: { contains: search, mode: 'insensitive' } },
                        { modele: { contains: search, mode: 'insensitive' } },
                        { description: { contains: search, mode: 'insensitive' } }
                    ];
                }

                const items = await prisma.productCatalogItem.findMany({
                    where,
                    orderBy: [{ category: 'asc' }, { marque: 'asc' }, { modele: 'asc' }]
                });

                return res.status(200).json(items);
            }

            if (req.method === 'POST') {
                const data = req.body;
                if (!data.ref || !data.marque || !data.modele || data.prixUnitaireHt === undefined) {
                    return res.status(400).json({ error: 'Champs obligatoires manquants (ref, marque, modele, prixUnitaireHt)' });
                }

                const created = await prisma.productCatalogItem.create({
                    data: {
                        ref: data.ref,
                        marque: data.marque,
                        modele: data.modele,
                        category: data.category || 'module',
                        puissanceWc: data.puissanceWc ? parseFloat(data.puissanceWc) : null,
                        prixUnitaireHt: parseFloat(data.prixUnitaireHt),
                        tauxTva: data.tauxTva !== undefined ? parseFloat(data.tauxTva) : 20.0,
                        ficheTechniqueUrl: data.ficheTechniqueUrl || null,
                        unite: data.unite || 'U',
                        garantieAnnees: data.garantieAnnees ? parseInt(data.garantieAnnees) : null,
                        caracteristiques: data.caracteristiques || null,
                        description: data.description || null,
                        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true
                    }
                });

                return res.status(201).json(created);
            }

            return res.status(405).json({ error: 'Method not allowed' });
        } else {
            // ITEM BY ID
            if (req.method === 'GET') {
                const item = await prisma.productCatalogItem.findUnique({
                    where: { id }
                });
                if (!item) return res.status(404).json({ error: 'Produit introuvable' });
                return res.status(200).json(item);
            }

            if (req.method === 'PUT' || req.method === 'PATCH') {
                const data = req.body;
                const updated = await prisma.productCatalogItem.update({
                    where: { id },
                    data: {
                        ...data,
                        puissanceWc: data.puissanceWc !== undefined ? (data.puissanceWc ? parseFloat(data.puissanceWc) : null) : undefined,
                        prixUnitaireHt: data.prixUnitaireHt !== undefined ? parseFloat(data.prixUnitaireHt) : undefined,
                        tauxTva: data.tauxTva !== undefined ? parseFloat(data.tauxTva) : undefined,
                        garantieAnnees: data.garantieAnnees !== undefined ? (data.garantieAnnees ? parseInt(data.garantieAnnees) : null) : undefined
                    }
                });
                return res.status(200).json(updated);
            }

            if (req.method === 'DELETE') {
                await prisma.productCatalogItem.delete({
                    where: { id }
                });
                return res.status(200).json({ success: true, id });
            }

            return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Erreur API Catalog:', error);
        return res.status(500).json({ error: error.message || 'Erreur serveur interne' });
    }
}
