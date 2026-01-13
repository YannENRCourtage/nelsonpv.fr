import React from 'react';

const UserAvatar = ({ name, email, showName = true, photoURL = null, size = "w-8 h-8", textSize = "text-xs" }) => {
    const cleanName = (name || '').trim();

    if (!cleanName) return <span className="text-slate-400">-</span>;

    // Si photoURL est fourni, l'utiliser en priorité
    if (photoURL) {
        return (
            <div className="flex items-center gap-2" title={cleanName}>
                <div className={`${size} rounded-full overflow-hidden border border-slate-200 flex-shrink-0`}>
                    <img
                        src={photoURL}
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
