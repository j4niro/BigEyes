# BigEyes - Global Temperature Viewer

Projet réalisé dans le cadre de l'UE ISI 2025-2026 à IMT Atlantique. L'application permet de visualiser les anomalies de température à la surface du globe entre 1880 et 2025, à partir des données NASA GISTEMP fournies par l'enseignant au format `tempanomaly_4x4grid.json`. L'utilisateur peut naviguer dans le temps, sélectionner des latitudes ou des zones sur la carte, regrouper plusieurs zones pour les comparer, et observer les résultats à travers plusieurs vues interactives reliées entre elles.

## Stack technique

L'application est construite avec React 19 et TypeScript, packagée par Vite. La gestion d'état centralisée repose sur Redux Toolkit (`@reduxjs/toolkit` + `react-redux`), conformément à la recommandation du sujet. Les graphes utilisent Recharts, et les icônes proviennent de `react-icons`. Le rendu de la carte et de la couche d'anomalies passe par le canvas HTML, avec une interpolation temporelle entre années consécutives pour fluidifier l'animation.

## Démarrage

À la racine du projet, installer les dépendances puis lancer le serveur de développement.

```bash
npm install
npm run dev
```

Vite expose alors l'application sur `http://localhost:5173` par défaut. Pour produire un build de production, exécuter `npm run build`, puis `npm run preview` pour servir le bundle compilé localement. La commande `npm run lint` lance ESLint sur l'ensemble du projet.

Aucune configuration supplémentaire n'est nécessaire : les données d'anomalies de température sont importées directement depuis `src/Utils/tempanomaly_4x4grid_v2.json`, et l'image de la carte (`public/earth.png`) est chargée via un thunk Redux au démarrage.

## Architecture du code

<img width="1892" height="1728" alt="Architecture" src="https://github.com/user-attachments/assets/6c276be4-0fc6-44c9-b7df-c853f209d4b7" />

L'organisation suit une séparation nette entre la couche de présentation, la logique métier et l'état global. Le dossier `src/Components` contient les composants React purement visuels : `Map` pour la carte interactive et ses contrôles de navigation, `AnomalyCanvas` pour le rendu de la couche de température, `SettingPan` pour le panneau de configuration des sélections (latitudes, zones, groupes), `GraphView` comme composant générique de vue secondaire, et `ViewList` pour la barre d'onglets qui pilote l'affichage et la disposition des vues.

Le dossier `src/Controllers` rassemble la logique métier extraite des composants. `MapController` gère les interactions sur la carte (sélection, conversions de coordonnées), `AnimationController` pilote la lecture, la pause et la vitesse de l'animation temporelle, `SettingPanController` orchestre la création et la gestion des groupes de zones, et `ViewListController` implémente le drag-and-drop pour réorganiser les vues. Les contrôleurs spécifiques aux graphes (`GraphControler`, `HeatMapControllers`, `HistogramController`, `RegressionController`) sont regroupés dans `Controllers/GraphControllers` et fournissent les données mises en forme à `GraphView` selon le type demandé.

L'état global est centralisé dans `src/Redux`. Le store combine deux slices. `DataSlice` détient les données brutes du JSON NASA et la taille de la carte, et reste essentiellement statique après le chargement initial. `GlobalSlice` porte l'ensemble de l'état d'interaction : plage d'années courante, mode de sélection (latitudes ou zones), latitudes sélectionnées, zones sélectionnées, groupes de zones, ordre des vues, et layout de l'écran (proportion entre la carte et la zone des graphes). Le découpage `mapLayout` / `viewerLayout` dans `screenLayout` permet de basculer entre une vue carte plein écran, un partage 60/40, et un mode où les graphes occupent 80 % de la hauteur.

Les `Hooks` typés (`useAppDispatch`, `useAppSelector`) centralisent l'accès au store et garantissent la cohérence de typage à travers l'application.

## Fonctionnalités implémentées

L'application couvre l'ensemble des fonctionnalités de niveau 1 du sujet, ainsi qu'une bonne partie des niveaux 2 et 3.

Côté navigation, la couche d'anomalies s'affiche en superposition semi-transparente sur la carte du monde, avec un curseur d'année qui peut être déplacé manuellement, saisi directement, ou animé. L'animation se contrôle via les boutons play, pause, retour au début, fin, et avance ou recul de dix ans. La vitesse est ajustable.

Côté sélection, l'utilisateur choisit entre le mode latitude et le mode zone via le panneau de configuration. Les latitudes sélectionnées sont matérialisées par des lignes horizontales sur la carte, et les zones par des rectangles. Les zones peuvent être supprimées individuellement, regroupées en groupes nommés et colorés, et plusieurs groupes peuvent coexister pour permettre la comparaison entre régions distinctes (typiquement Afrique + Amérique du Sud contre Europe + Amérique du Nord).

Côté vues secondaires, quatre vues sont disponibles sous la carte : un graphe d'évolution temporelle des moyennes par groupe, un histogramme par longitude pour les latitudes sélectionnées, une heatmap croisant années et latitudes, et une vue de régression pour analyser les tendances. Toutes les vues sont synchronisées avec la carte : cliquer sur une année dans un graphe met à jour l'année courante, cliquer sur une barre d'histogramme met en évidence la zone correspondante, et la barre `ViewList` permet de masquer, afficher et réordonner les vues par drag-and-drop.

## Structure des fichiers

```
BigEyes-mergev2/
├── public/                    Images statiques (carte, icônes UI)
├── src/
│   ├── App.tsx                Composant racine, orchestration du layout
│   ├── main.tsx               Point d'entrée, Provider Redux
│   ├── Components/            Composants React (Map, SettingPan, GraphView, etc.)
│   ├── Controllers/           Logique métier extraite des composants
│   │   └── GraphControllers/  Contrôleurs spécifiques par type de graphe
│   ├── Redux/
│   │   ├── Slice/             DataSlice, GlobalSlice, DataThunk
│   │   ├── Store/             Configuration du store
│   │   └── Hooks/             Hooks typés useAppDispatch / useAppSelector
│   └── Utils/                 Données JSON, chargeur d'image, palette de couleurs
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Source des données

Les données d'anomalies de température proviennent du jeu GISTEMP de la NASA, simplifié et fourni par l'enseignant sous forme d'une grille de 4° × 4° en latitude et longitude. Les valeurs représentent l'écart en degrés par rapport à la température moyenne calculée par la NASA sur la période 1951-1980. La valeur `NA` indique l'absence de mesure pour la zone et l'année concernées (cas fréquent aux pôles ou pour certains continents au XIXe siècle), et est filtrée à l'affichage.


## Auteurs

Projet réalisé en binôme dans le cadre de l'UE ISI à IMT Atlantique, par Junior BINI et Jean-Louis DJE.
