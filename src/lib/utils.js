import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

// Helper de couleurs des commerciaux / utilisateurs fidèle au CRM
export const getUserColor = (name) => {
  if (!name) return 'bg-slate-100 text-slate-600';

  const n = name.toLowerCase().trim();
  // Overrides explicites
  if (n.includes('nicolas')) return 'bg-yellow-100 text-yellow-800';
  if (n.includes('yann')) return 'bg-blue-100 text-blue-800';
  if (n.includes('jack')) return 'bg-yellow-100 text-yellow-800';
  if (n.includes('elodie')) return 'bg-pink-100 text-pink-700';

  // Palette Monday
  const colors = [
    'bg-indigo-100 text-indigo-700',
    'bg-pink-100 text-pink-700',
    'bg-amber-100 text-amber-700',
    'bg-emerald-100 text-emerald-700',
    'bg-cyan-100 text-cyan-700',
    'bg-fuchsia-100 text-fuchsia-700'
  ];
  let hash = 0;
  for (let i = 0; i < n.length; i++) {
    hash = n.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};