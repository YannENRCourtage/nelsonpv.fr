# Instructions pour intégrer les Postes ENEDIS HTA/BT

## 📥 Étape 1 : Télécharger le fichier GeoJSON

Le fichier des postes de distribution publique ENEDIS est disponible sur le portail Open Data d'ENEDIS :

### Option A : Téléchargement direct
1. Visitez : https://data.enedis.fr/explore/dataset/postes-de-distribution-publique-postes-htabt/
2. Cliquez sur "Exporter" en haut à droite
3. Sélectionnez le format **GeoJSON**
4. Téléchargez le fichier

### Option B : API directe
Vous pouvez aussi utiliser l'URL API directe :
```
https://data.enedis.fr/api/explore/v2.1/catalog/datasets/postes-de-distribution-publique-postes-htabt/exports/geojson
```

## 📁 Étape 2 : Placer le fichier dans votre projet

1. **Renommez** le fichier téléchargé en : `postes-de-distribution-publique-postes-htabt.geojson`
2. **Placez-le** dans le dossier `public` de votre projet :
   ```
   c:/Users/Utilisateur/Documents/ENR COURTAGE ENERGIE/SITES INTERNET/NELSON/20112025 V2/public/
   ```

## ✅ Étape 3 : Vérification

Une fois le fichier placé, le chemin complet devrait être :
```
c:/Users/Utilisateur/Documents/ENR COURTAGE ENERGIE/SITES INTERNET/NELSON/20112025 V2/public/postes-de-distribution-publique-postes-htabt.geojson
```

## 🗺️ Étape 4 : Utilisation dans l'application

Le fichier sera automatiquement chargé lorsque vous activerez la couche **"Postes HTA/BT"** dans le panneau des calques :

1. Ouvrez votre application (localhost:3000)
2. Dans le panneau "Fonds de carte & Calques" (coin inférieur droit)
3. Cherchez la section **"Réseau électrique ENEDIS"**
4. Activez le switch **"Postes HTA/BT"**
5. Les postes apparaîtront comme des points jaunes/orange sur la carte 🟡

## 🎨 Apparence des postes

Les postes ENEDIS s'affichent avec :
- **Icône** : Point rond jaune/orange de 12px
- **Info-bulle** : Au clic, affiche le nom, type et puissance du poste

## ⚠️ Note importante

Si le fichier est volumineux (plusieurs Mo), le chargement peut prendre quelques secondes la première fois que vous activez la couche. Une optimisation possible serait de filtrer les données par département ou région.

## 🔧 Dépannage

Si les postes n'apparaissent pas :
1. Vérifiez que le fichier est bien dans `/public/`
2. Vérifiez le nom exact du fichier
3. Ouvrez la console du navigateur (F12) pour voir les erreurs éventuelles
4. Assurez-vous que votre serveur de développement est bien démarré (`npm run dev`)

## 📊 Données disponibles

Le GeoJSON ENEDIS contient généralement :
- Nom du poste
- Type de poste (HTA/BT)
- Puissance installée
- Coordonnées géographiques
- Code commune
- Et d'autres attributs techniques
