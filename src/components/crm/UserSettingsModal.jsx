import React, { useState, useRef, useEffect } from 'react';
import { X, Save, Upload, Camera, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { apiService } from '@/services/api';

const UserSettingsModal = ({ show, onClose, currentUser, onUpdate }) => {
    const [displayName, setDisplayName] = useState('');
    const [avatarFile, setAvatarFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (show && currentUser) {
            setDisplayName(currentUser.name || '');
            setPreviewUrl(null);
            setAvatarFile(null);
        }
    }, [show, currentUser]);

    if (!show) return null;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast({ title: "Erreur", description: "L'image ne doit pas dépasser 5 Mo.", variant: "destructive" });
                return;
            }
            setAvatarFile(file);
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);
        }
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            let photoURL = currentUser.photoURL;

            // 1. Upload Avatar if changed
            if (avatarFile) {
                photoURL = await apiService.updateUserAvatar(avatarFile);
            }

            // 2. Update Profile
            const updateData = {
                displayName: displayName,
                photoURL: photoURL
            };

            // Only update if changes exist
            if (displayName !== currentUser.name || avatarFile) {
                // Note: updateUserProfile helper in api.js should handle the firestore update
                // We might also want to update the Auth profile if possible, but Firestore is our source of truth here.
                await apiService.updateUserProfile(updateData);

                // Notify parent
                onUpdate({
                    ...currentUser,
                    name: displayName,
                    avatar: photoURL // The logical update
                });

                toast({ title: "Succès", description: "Profil mis à jour." });
                onClose();
            } else {
                onClose();
            }

        } catch (error) {
            console.error("Update profile error:", error);
            toast({ title: "Erreur", description: "Impossible de mettre à jour le profil.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900">Paramètres utilisateur</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Avatar Section */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className={`w-24 h-24 rounded-full overflow-hidden border-4 border-slate-100 shadow-inner flex items-center justify-center ${!previewUrl && !currentUser?.photoURL ? 'bg-slate-200' : 'bg-white'}`}>
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                ) : currentUser?.photoURL ? (
                                    // Check if it's a URL or initial char
                                    currentUser.photoURL.startsWith('http') ?
                                        <img src={currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" /> :
                                        <span className="text-3xl font-bold text-slate-400">{currentUser.avatar}</span>
                                ) : (
                                    <User className="w-10 h-10 text-slate-400" />
                                )}
                            </div>
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-full flex items-center justify-center transition-all">
                                <Camera className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all" />
                            </div>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                        <p className="text-xs text-slate-500">Cliquez pour changer la photo</p>
                    </div>

                    {/* Name Section */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Nom d'affichage</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Votre Nom"
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-slate-200 flex gap-3 justify-end">
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Annuler
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Enregistrement...' : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Enregistrer
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default UserSettingsModal;
