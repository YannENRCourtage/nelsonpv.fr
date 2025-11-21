import React from "react";
import { useProject } from '../../contexts/ProjectContext.jsx';

export default function PhotoManager() {
  const { project, updateProject } = useProject();
  const photos = project?.photos || [];

  const onFiles = (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    Promise.all(
      list.map(
        (f) =>
          new Promise((res) => {
            const r = new FileReader();
            r.onload = () => res({ id: Date.now() + Math.random(), name: f.name, src: r.result });
            r.readAsDataURL(f);
          })
      )
    ).then((items) => updateProject({ photos: [...photos, ...items] }));
  };

  const placeOnMap = (photo) => {
    window.dispatchEvent(new CustomEvent("map:tool-request", { detail: { tool: "photo", photo } }));
  };
  
  const remove = (id) => updateProject({ photos: photos.filter((x) => x.id !== id) });

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-slate-800">Photos</h3>
        <label className="inline-flex items-center gap-2 cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
          <input type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
          Charger des photos
        </label>
      </div>

      {photos.length === 0 ? (
        <div className="text-sm text-slate-500">Aucune photo pour le moment.</div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
          {photos.map((p) => (
            <div key={p.id} className="border rounded-lg overflow-hidden relative group">
              <img src={p.src} alt={p.name} className="w-full h-28 object-cover" />
              <div className="p-2 text-xs truncate">{p.name}</div>

              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button
                  className="h-8 px-2 rounded bg-white/90 text-slate-700 text-xs border border-slate-300"
                  title="Placer sur la carte"
                  onClick={() => placeOnMap(p)}
                >
                  Placer
                </button>
                <button
                  className="h-8 px-2 rounded bg-red-50 text-red-600 text-xs border border-red-200"
                  title="Supprimer"
                  onClick={() => remove(p.id)}
                >
                  Suppr.
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}