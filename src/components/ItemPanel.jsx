import React, { useState, useRef, useCallback } from 'react';
    import { motion, AnimatePresence } from 'framer-motion';
    import { X, Paperclip, Send, MessageSquare, Trash2, Download, Eye, UploadCloud } from 'lucide-react';
    import { useAuth } from '@/contexts/AuthContext.jsx';
    import { Button } from '@/components/ui/button.jsx';
    import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
    import { Textarea } from '@/components/ui/textarea.jsx';
    import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.jsx";
    import { useDropzone } from 'react-dropzone';
    import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';

    const FileViewer = ({ file, isOpen, onClose }) => {
        if (!isOpen || !file) return null;

        const isImage = file.type.startsWith('image/');
        const isPDF = file.type === 'application/pdf';

        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-4xl h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>{file.name}</DialogTitle>
                    </DialogHeader>
                    <div className="h-full w-full flex items-center justify-center">
                        {isImage ? (
                            <img src={file.url} alt={file.name} className="max-h-full max-w-full object-contain" src="https://images.unsplash.com/photo-1663647235366-fbdae0050867" />
                        ) : isPDF ? (
                            <iframe src={file.url} className="h-full w-full" title={file.name}></iframe>
                        ) : (
                            <div className="text-center">
                                <p>Aperçu non disponible pour ce type de fichier.</p>
                                <a href={file.url} download={file.name} className="text-blue-600 hover:underline mt-4 inline-block">
                                    Télécharger le fichier
                                </a>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        );
    };

    const ItemPanel = ({ isOpen, item, onClose, onUpdate }) => {
      const { user } = useAuth();
      const [newComment, setNewComment] = useState('');
      const fileInputRef = useRef(null);
      const [viewingFile, setViewingFile] = useState(null);

      const onDrop = useCallback((acceptedFiles) => {
        acceptedFiles.forEach(file => handleFileSelect(file));
      }, [item, onUpdate]);

      const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: true, noKeyboard: true });

      const handleAddComment = () => {
        if (newComment.trim() === '') return;

        const comment = {
          id: `comment-${Date.now()}`,
          author: user.name,
          avatar: user.avatar,
          text: newComment,
          timestamp: new Date().toISOString(),
        };

        const updatedItem = {
          ...item,
          updates: [comment, ...(item.updates || [])],
        };
        onUpdate(updatedItem);
        setNewComment('');
      };
      
      const handleFileSelect = (file) => {
        if (!file) return;

        const newFile = {
            id: `file-${Date.now()}`,
            name: file.name,
            size: file.size,
            type: file.type,
            timestamp: new Date().toISOString(),
            url: URL.createObjectURL(file), 
        };
        
        const updatedItem = {
            ...item,
            files: [newFile, ...(item.files || [])],
        };
        onUpdate(updatedItem);
      };
      
      const handleDeleteFile = (fileId) => {
        const updatedFiles = (item.files || []).filter(f => f.id !== fileId);
        const updatedItem = { ...item, files: updatedFiles };
        onUpdate(updatedItem);
      };

      const panelVariants = {
        hidden: { x: '100%' },
        visible: { x: '0%' },
      };

      if (!item) return null;
      
      const formatTimestamp = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      }

      return (
        <AnimatePresence>
          {isOpen && (
            <>
            <motion.div
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={panelVariants}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 h-full w-full md:w-1/2 lg:w-1/3 bg-white shadow-2xl z-50 flex flex-col"
              style={{ borderLeft: '1px solid #e2e8f0' }}
              {...getRootProps()}
            >
              <input {...getInputProps()} />
              <header className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-gray-600" />
                    <h2 className="text-lg font-semibold">{item.data?.entreprise || item.data?.element || 'Détails'}</h2>
                </div>
                 <div className="flex items-center">
                    <Tabs defaultValue="updates" className="flex-shrink-0">
                      <TabsList>
                        <TabsTrigger value="updates">Mises à jour</TabsTrigger>
                        <TabsTrigger value="files">Fichiers</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <Button variant="ghost" size="icon" onClick={onClose} className="ml-4">
                      <X className="h-5 w-5" />
                    </Button>
                 </div>
              </header>
              
              <div className="flex-grow overflow-y-auto">
                <Tabs defaultValue="updates" className="flex flex-col h-full">
                  <TabsContent value="updates" className="flex-grow flex flex-col p-4">
                      <div className="flex-grow space-y-4 overflow-y-auto pr-2">
                          {(item.updates || []).map(update => (
                              <div key={update.id} className={`flex gap-3 ${update.author === user.name ? 'justify-end' : ''}`}>
                                  {update.author !== user.name && (
                                      <Avatar className="h-8 w-8">
                                          <AvatarImage src={update.avatar} alt={update.author} />
                                          <AvatarFallback>{update.author?.charAt(0).toUpperCase()}</AvatarFallback>
                                      </Avatar>
                                  )}
                                  <div className={`max-w-xs md:max-w-sm ${update.author === user.name ? 'text-right' : ''}`}>
                                      <div className={`rounded-lg px-3 py-2 ${update.author === user.name ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
                                          <p className="text-sm">{update.text}</p>
                                      </div>
                                      <span className="text-xs text-gray-500 mt-1 block">
                                          {update.author === user.name ? '' : `${update.author}, `}{formatTimestamp(update.timestamp)}
                                      </span>
                                  </div>
                                  {update.author === user.name && (
                                      <Avatar className="h-8 w-8">
                                          <AvatarImage src={update.avatar} alt={update.author} />
                                          <AvatarFallback>{update.author?.charAt(0).toUpperCase()}</AvatarFallback>
                                      </Avatar>
                                  )}
                              </div>
                          ))}
                      </div>
                  </TabsContent>
                  
                  <TabsContent value="files" className="flex-grow p-4">
                    {isDragActive ? (
                        <div className="flex items-center justify-center h-full border-2 border-dashed border-blue-500 rounded-lg bg-blue-50">
                            <div className="text-center">
                                <UploadCloud className="mx-auto h-12 w-12 text-blue-500" />
                                <p className="mt-2 text-lg font-semibold text-blue-700">Déposez les fichiers ici</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {(item.files || []).map(file => (
                                <div key={file.id} className="border p-2 rounded-md flex items-center justify-between hover:bg-gray-50">
                                    <div>
                                        <p className="font-medium text-gray-800">{file.name}</p>
                                        <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB - {formatTimestamp(file.timestamp)}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => setViewingFile(file)} title="Visualiser">
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <a href={file.url} download={file.name}>
                                            <Button variant="ghost" size="icon" title="Télécharger">
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        </a>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteFile(file.id)} title="Supprimer">
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="mt-4 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-gray-50"
                            >
                                <UploadCloud className="mx-auto h-8 w-8 text-gray-400" />
                                <p className="mt-2 text-sm text-gray-600">Glissez-déposez des fichiers ici, ou cliquez pour sélectionner</p>
                            </div>
                        </div>
                    )}
                  </TabsContent>

                  <div className="p-4 border-t bg-gray-50">
                    <div className="relative">
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Ajouter un commentaire..."
                        className="pr-20"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddComment();
                            }
                        }}
                      />
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} title="Joindre un fichier">
                          <Paperclip className="h-5 w-5" />
                        </Button>
                        <input type="file" ref={fileInputRef} onChange={(e) => handleFileSelect(e.target.files?.[0])} className="hidden" multiple />
                        <Button size="icon" onClick={handleAddComment} title="Envoyer le commentaire">
                          <Send className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Tabs>
              </div>
            </motion.div>
            <FileViewer file={viewingFile} isOpen={!!viewingFile} onClose={() => setViewingFile(null)} />
            </>
          )}
        </AnimatePresence>
      );
    };

    export default ItemPanel;