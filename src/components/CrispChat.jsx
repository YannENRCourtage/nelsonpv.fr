import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";

const CrispChat = () => {
    const { user } = useAuth();

    useEffect(() => {
        window.$crisp = [];
        window.CRISP_WEBSITE_ID = "ed5a51c6-56f2-4e1b-aa22-702cb0e3c620";

        (function () {
            var d = document;
            var s = d.createElement("script");

            s.src = "https://client.crisp.chat/l.js";
            s.async = 1;
            d.getElementsByTagName("head")[0].appendChild(s);
        })();
    }, []);

    // Update user data in Crisp when user logs in
    useEffect(() => {
        if (user && window.$crisp) {
            if (user.email) window.$crisp.push(["set", "user:email", [user.email]]);
            if (user.displayName) window.$crisp.push(["set", "user:nickname", [user.displayName]]);
            
            // Set avatar for Yann specifically as requested, or use photoURL for others
            const avatarUrl = (user.displayName && user.displayName.toLowerCase().includes('yann')) 
                ? '/avatars/yann_new.png' 
                : (user.photoURL || null);
            
            if (avatarUrl) {
                window.$crisp.push(["set", "user:avatar", [window.location.origin + avatarUrl]]);
            }
        }
    }, [user]);

    return null;
};

export default CrispChat;
