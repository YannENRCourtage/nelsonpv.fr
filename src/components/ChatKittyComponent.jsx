import { ChatUi } from '@chatkitty/react';
import { useAuth } from '../contexts/AuthContext';

export default function ChatKittyComponent() {
    const { user } = useAuth();

    // Use the username from the authenticated user, or a fallback for testing
    const chatUsername = user?.displayName || user?.email || 'Guest';

    if (!user) {
        return <div>Please log in to chat</div>;
    }

    return (
        <div style={{ height: '600px', width: '100%', maxWidth: '400px', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
            <ChatUi
                widgetId="E1cEwkJRmOU7Z1nZ"
                username={chatUsername}
                mode="sandbox"
            />
        </div>
    );
}
