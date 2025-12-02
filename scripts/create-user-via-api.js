// Script pour créer l'utilisateur Nicolas directement via l'API de production
// À exécuter après déploiement Vercel

async function createNicolasUser() {
    const API_URL = 'https://nelsonpv.fr/api'; // Remplacez par votre URL Vercel si différente

    const userData = {
        email: 'n.bachevalier@enr-courtage.fr',
        password: 'Nicolas30000',
        firstName: 'Nicolas',
        lastName: 'BACHEVALIER',
        phone: '',
        role: 'user',
        pageAccess: {
            crm: false,
            monday: false,
            administration: false,
            editeur: true
        }
    };

    try {
        const response = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Utilisateur créé avec succès !', data);
            alert('Utilisateur Nicolas BACHEVALIER créé avec succès !');
        } else {
            console.error('❌ Erreur:', data);
            alert(`Erreur: ${data.error || 'Erreur inconnue'}`);
        }
    } catch (error) {
        console.error('❌ Erreur réseau:', error);
        alert(`Erreur réseau: ${error.message}`);
    }
}

// Exécuter la création
createNicolasUser();
