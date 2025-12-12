/* 
  Controller ViewList

  AI Assistance : ~50% (Main Structure)

  GEMINI PROMPT : See ViewList Component for prompt
*/

// Définition des props nécessaires au fonctionnement du contrôleur
export interface ViewListControllerProps {
  onHeightChange: (height: 0|0.8|0.4) => void;
}

export const useViewListController = ({ 
  onHeightChange, 
}: ViewListControllerProps) => {

  // --- Logique des boutons de Layout ---
  
  // Passage en mode Grille (force une hauteur min si nécessaire)
  const switchToGrid = () => {
    onHeightChange(0.8);
  };

  // Passage en mode Ligne (réduit la hauteur si nécessaire)
  const switchToSingle = () => {
    onHeightChange(0.4);
  };

  // On retourne les fonctions et états nécessaires à la Vue
  return {
    switchToGrid,
    switchToSingle,
  };
};