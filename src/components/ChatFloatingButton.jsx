import React, { useState, Component } from 'react';
import { MessageSquare, X } from 'lucide-react';
import ChatKittyComponent from './ChatKittyComponent';

class ChatErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ChatKitty Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-full p-4 text-center text-slate-500">
                    <p>Le chat est indisponible pour le moment.</p>
                    <button
                        className="mt-2 text-indigo-600 hover:underline text-sm"
                        onClick={() => this.setState({ hasError: false })}
                    >
                        Réessayer
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

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
                            <ChatErrorBoundary>
                                <ChatKittyComponent />
                            </ChatErrorBoundary>
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
