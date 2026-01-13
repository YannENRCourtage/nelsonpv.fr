import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ContactModal = ({ show, onClose, editingContact, setEditingContact, onSave, contacts }) => {
    if (!show || !editingContact) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
                    <h3 className="text-xl font-bold text-slate-900">
                        {editingContact.name ? 'Modifier le contact' : 'Nouveau contact'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Nom complet</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={editingContact.name}
                                onChange={(e) => setEditingContact(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Jean Dupont"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Entreprise</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={editingContact.company}
                                onChange={(e) => setEditingContact(prev => ({ ...prev, company: e.target.value }))}
                                placeholder="Ma Société SAS"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                            <input
                                type="email"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={editingContact.email}
                                onChange={(e) => setEditingContact(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="jean@exemple.fr"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Téléphone</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={editingContact.phone}
                                onChange={(e) => setEditingContact(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="+33 6 12 34 56 78"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Ville</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={editingContact.city}
                                onChange={(e) => setEditingContact(prev => ({ ...prev, city: e.target.value }))}
                                placeholder="Paris"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Statut</label>
                            <select
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={editingContact.status}
                                onChange={(e) => setEditingContact(prev => ({ ...prev, status: e.target.value }))}
                            >
                                <option value="Prospect">Prospect</option>
                                <option value="Client">Client</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-200 flex gap-3 justify-end">
                    <Button
                        variant="outline"
                        onClick={onClose}
                    >
                        Annuler
                    </Button>
                    <Button
                        onClick={onSave}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ContactModal;
