import React from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { ProjectProvider, useProjects } from "@/contexts/ProjectContext.jsx";

/* Petite ligne de tableau */
function Row({ project }) {
  const navigate = useNavigate();
  // CORRIGÉ : Lecture des champs à la racine de 'project'
  const clientName = `${project.firstName || ''} ${project.name || ''}`.trim() || "N/A";
  const formattedDate = project.createdAt ? new Date(project.createdAt).toLocaleDateString('fr-FR') : "—";

  return (
    <tr className="border-b last:border-0 hover:bg-slate-50">
      {/* Corrigé pour utiliser project.name (qui contient 'BARBERIS' dans votre exemple) */}
      <td className="py-3 px-4">{project.name || 'Projet sans nom'}</td>
      <td className="py-3 px-4">{clientName}</td>
      <td className="py-3 px-4">{project.user || "Yann"}</td>
      <td className="py-3 px-4">{project.address}</td>
      <td className="py-3 px-4">{formattedDate}</td>
      <td className="py-3 px-4">
        <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 text-xs px-2 py-1">
          {project.status || 'En cours'}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/project/${project.id}/edit`)}>
            ✏️
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.alert("Export PDF non implémenté ici")}>
            ⬇️
          </Button>
        </div>
      </td>
    </tr>
  );
}

function DashboardInner() {
  const navigate = useNavigate();
  const { projects } = useProjects();

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold">Projets</h1>
          <p className="text-slate-500">Gérez les projets de construction et location de toitures</p>
        </div>
        <Button
          onClick={() => navigate(`/project/${Date.now()}/edit`)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          + Nouveau Projet
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4">
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <input
                placeholder="Rechercher par nom, client ou adresse..."
                className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none focus:ring focus:ring-indigo-100"
              />
            </div>
            <select className="rounded-md border border-slate-200 px-3 py-2">
              <option>Tous les statuts</option>
              <option>En cours</option>
              <option>Terminé</option>
              <option>Annulé</option>
            </select>
            <select className="rounded-md border border-slate-200 px-3 py-2">
              <option>Tous les utilisateurs</option>
              <option>Yann</option>
            </select>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="text-left py-2 px-4 font-medium">Nom du Projet</th>
                  <th className="text-left py-2 px-4 font-medium">Client</th>
                  <th className="text-left py-2 px-4 font-medium">Utilisateur</th>
                  <th className="text-left py-2 px-4 font-medium">Adresse</th>
                  <th className="text-left py-2 px-4 font-medium">Date</th>
                  <th className="text-left py-2 px-4 font-medium">Statut</th>
                  <th className="text-left py-2 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <Row key={p.id} project={p} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  return (
    <ProjectProvider>
      <DashboardInner />
    </ProjectProvider>
  );
}