import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send } from 'lucide-react';
import { addDevComment, getDevComments } from '@/services/devWorkflowService';

function getRelativeTime(dateInput) {
  if (!dateInput) return '';
  const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
  
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'À l\'instant';
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ProjectComments({ projectId, workflowId, currentUser }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchComments = async () => {
    if (!projectId || !workflowId) return;
    try {
      setInitialLoading(true);
      const data = await getDevComments(projectId, workflowId);
      const sorted = (data || []).sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
        return timeB - timeA;
      });
      setComments(sorted);
    } catch (error) {
      console.error("Erreur lors du chargement des commentaires:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [projectId, workflowId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || loading || !currentUser) return;

    try {
      setLoading(true);
      await addDevComment(projectId, workflowId, {
        text: newComment.trim(),
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.firstName || 'Utilisateur',
        userPhoto: currentUser.photoURL || null,
        createdAt: new Date()
      });
      setNewComment('');
      await fetchComments();
    } catch (error) {
      console.error("Erreur lors de l'ajout du commentaire:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col h-full">
      <div className="flex items-center mb-6">
        <MessageSquare className="w-5 h-5 text-blue-500 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Commentaires</h3>
      </div>

      <form onSubmit={handleSubmit} className="mb-6 relative">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Ajouter un commentaire..."
          className="w-full bg-gray-50 rounded-xl border border-gray-200 p-4 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[100px] transition-all"
          maxLength={1000}
        />
        <div className="absolute bottom-3 left-4 text-xs text-gray-400">
          {newComment.length}/1000
        </div>
        <button
          type="submit"
          disabled={!newComment.trim() || loading}
          className={`absolute bottom-3 right-3 p-2 rounded-lg transition-colors ${
            !newComment.trim() || loading 
              ? 'text-gray-400 bg-gray-100 cursor-not-allowed' 
              : 'text-white bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <Send className={`w-4 h-4 ${loading ? 'animate-pulse' : ''}`} />
        </button>
      </form>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {initialLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 italic">
            Aucun commentaire pour le moment
          </div>
        ) : (
          <AnimatePresence>
            {comments.map((comment) => (
              <motion.div
                key={comment.id || Math.random().toString(36)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-b border-gray-100 pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-start space-x-3">
                  {comment.userPhoto ? (
                    <img 
                      src={comment.userPhoto} 
                      alt={comment.userName} 
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {getInitial(comment.userName)}
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="font-semibold text-gray-900 text-sm">
                        {comment.userName}
                      </span>
                      <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                        {getRelativeTime(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap break-words">
                      {comment.text}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
