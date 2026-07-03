import React from 'react';

const UserAvatar = ({ name, email, showName = true, photoURL = null, size = "w-8 h-8", textSize = "text-xs" }) => {
    const cleanName = (name || '').trim();

    if (!cleanName) return <span className="text-slate-400">-</span>;

    const localAvatars = {
        'Nicolas DESAINT': '/avatars/nicolas_desaint.jpg',
        'nicolas desaint': '/avatars/nicolas_desaint.jpg',
        'Nicolas': '/avatars/nico_avatar.jpg',
        'Nico': '/avatars/nico_avatar.jpg',
        'NicolasNMD': '/avatars/nicolas_nmd_avatar.jpg',
        'Yann': '/avatars/yann.jpg',
        'yann': '/avatars/yann.jpg',
        'Véronique': '/avatars/veronique.jpg',
        'Véro': '/avatars/veronique.jpg',
        'véronique': '/avatars/veronique.jpg', // ensuring lowercase match too
        'véro': '/avatars/veronique.jpg',
        'Elodie': '/avatars/elodie.jpg',
        'Jack': '/avatars/jack.jpg',
        'Laurent': '/avatars/laurent.jpg',
        'Philippe': '/avatars/philippe.jpg',
        'Julien': '/avatars/julien.png',
        'Julien DELAGE': '/avatars/julien.png',
        'julien': '/avatars/julien.png',
        'Malick TOURE': '/avatars/malick.png',
        'malick toure': '/avatars/malick.png',
        'Malick': '/avatars/malick.png',
        'malick': '/avatars/malick.png',
        'Malick T.': '/avatars/malick.png',
        'malick t.': '/avatars/malick.png'
    };

    // Si photoURL est fourni, l'utiliser en priorité. SINON vérifier local override.
    const finalPhotoURL = photoURL || localAvatars[cleanName] || localAvatars[cleanName.toLowerCase()];

    if (finalPhotoURL) {
        return (
            <div className="flex items-center gap-2" title={cleanName}>
                <div className={`${size} rounded-full overflow-hidden border border-slate-200 flex-shrink-0`}>
                    <img
                        src={finalPhotoURL}
                        alt={cleanName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=0D8ABC&color=fff`;
                        }}
                    />
                </div>
                {showName && <span className="text-slate-900 font-medium text-sm">{cleanName}</span>}
            </div>
        );
    }

    // Fallback / Autres utilisateurs sans photo
    const initial = cleanName.charAt(0).toUpperCase();
    const colors = [
        'bg-red-100 text-red-700',
        'bg-green-100 text-green-700',
        'bg-blue-100 text-blue-700',
        'bg-yellow-100 text-yellow-700',
        'bg-purple-100 text-purple-700',
        'bg-pink-100 text-pink-700'
    ];
    // Simple hash for color consistency
    const colorIndex = cleanName.length % colors.length;
    const colorClass = colors[colorIndex];

    return (
        <div className="flex items-center gap-2" title={cleanName}>
            <div className={`${size} rounded-full flex items-center justify-center ${textSize} font-bold ${colorClass} flex-shrink-0`}>
                {initial}
            </div>
            {showName && <span className="text-slate-900 font-medium text-sm">{cleanName}</span>}
        </div>
    );
};

export default UserAvatar;
