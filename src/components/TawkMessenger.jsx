import { useEffect } from 'react';

/**
 * Composant pour intégrer le chat Tawk.to
 * 
 * INSTRUCTIONS POUR L'UTILISATEUR :
 * 1. Créez un compte sur https://www.tawk.to
 * 2. Récupérez votre "Direct Chat Link" ou le code du Widget.
 * 3. Remplacez l'URL ci-dessous par VOTRE lien de widget.
 *    Le lien ressemble souvent à : https://embed.tawk.to/654a123.../1hi...
 */
export default function TawkMessenger() {
    useEffect(() => {
        // Vérifie si le script est déjà là pour éviter les doublons
        if (document.getElementById('tawk-to-script')) return;

        var Tawk_API = Tawk_API || {}, Tawk_LoadStart = new Date();

        (function () {
            var s1 = document.createElement("script"), s0 = document.getElementsByTagName("script")[0];
            s1.async = true;
            s1.id = 'tawk-to-script';
            // ID fourni par l'utilisateur
            s1.src = 'https://embed.tawk.to/69500d113169ac197f3fb6e7/1jdgb62tk';
            // 👆 ----------------------------------------------------------- 👆

            s1.charset = 'UTF-8';
            s1.setAttribute('crossorigin', '*');
            s0.parentNode.insertBefore(s1, s0);
        })();
    }, []);

    return null; // Ce composant n'affiche rien visuellement (le script injecte le chat)
}
