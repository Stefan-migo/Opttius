"use client";

import { createContext, ReactNode, useContext } from "react";

interface LikeContextType {
  likedProducts: string[];
  toggleLike: (productId: string) => void;
  isLiked: (productId: string) => boolean;
  isLoading: boolean;
}

const LikeContext = createContext<LikeContextType | undefined>(undefined);

export function LikeProvider({ children }: { children: ReactNode }) {
  const likedProducts: string[] = [];

  const toggleLike = (productId: string) => {
    // Stub implementation
    console.log("Like toggled for product:", productId);
  };

  const isLiked = (productId: string) => {
    return likedProducts.includes(productId);
  };

  return (
    <LikeContext.Provider
      value={{ likedProducts, toggleLike, isLiked, isLoading: false }}
    >
      {children}
    </LikeContext.Provider>
  );
}

export function useLike() {
  const context = useContext(LikeContext);
  if (context === undefined) {
    throw new Error("useLike must be used within a LikeProvider");
  }
  return context;
}
