import { useState, useEffect, type MouseEvent } from 'react';

// Définition des props nécessaires au fonctionnement du contrôleur
export interface ViewListControllerProps {
  viewerHeight: number;
  onHeightChange: (height: number) => void;
  setLayout: (layout: "grid" | "single") => void;
}

export const useViewListController = ({ 
  viewerHeight, 
  onHeightChange, 
  setLayout 
}: ViewListControllerProps) => {
  
  const [isDragging, setIsDragging] = useState(false);

  // --- Gestion du Drag & Drop (Redimensionnement) ---
  const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      // Calcul de la nouvelle hauteur (basé sur le bas de la fenêtre)
      const newHeight = window.innerHeight - e.clientY;
      
      // Limites min (200px) et max (fenêtre - 50px)
      if (newHeight >= 200 && newHeight <= window.innerHeight - 50) {
        onHeightChange(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    // Ajout des écouteurs globaux
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Nettoyage
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onHeightChange]);

  // --- Logique des boutons de Layout ---
  
  // Passage en mode Grille (force une hauteur min si nécessaire)
  const switchToGrid = () => {
    setLayout("grid");
    if (viewerHeight < 520) {
      onHeightChange(550);
    }
  };

  // Passage en mode Ligne (réduit la hauteur si nécessaire)
  const switchToSingle = () => {
    setLayout("single");
    if (viewerHeight > 500) {
      onHeightChange(300);
    }
  };

  // On retourne les fonctions et états nécessaires à la Vue
  return {
    handleMouseDown,
    switchToGrid,
    switchToSingle,
    isDragging // Optionnel, si tu veux changer le curseur visuellement
  };
};