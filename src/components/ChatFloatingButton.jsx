import React, { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import ChatKittyComponent from './ChatKittyComponent';

export default function ChatFloatingButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            {isOpen && (
                <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
                    style={{ width: '380px', height: '600px', maxHeight: '80vh' }}>
                    <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between p-3 bg-indigo-600 text-white">
                            <h3 className="font-semibold text-sm">Messagerie</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="hover:bg-indigo-700 p-1 rounded-full text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 bg-gray-50 overflow-hidden relative">
                            <ChatKittyComponent />
                        </div>
                    </div>
                </div>
            )}

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`${isOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'
                    } text-white p-4 rounded-full shadow-lg transition-all transform hover:scale-105 duration-200 flex items-center justify-center`}
                aria-label="Ouvrir le chat"
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
            </button>
        </div>
    );
}
