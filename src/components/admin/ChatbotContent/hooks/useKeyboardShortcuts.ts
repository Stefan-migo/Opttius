import { useEffect } from "react";

interface UseKeyboardShortcutsProps {
  showSettings: boolean;
  showHistory: boolean;
  setShowSettings: (show: boolean) => void;
  setShowHistory: (show: boolean) => void;
  handleNewSession: () => void;
}

export function useKeyboardShortcuts({
  showSettings,
  showHistory,
  setShowSettings,
  setShowHistory,
  handleNewSession,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

      if (ctrlKey && e.key === "k") {
        e.preventDefault();
        handleNewSession();
      } else if (ctrlKey && e.key === "/") {
        e.preventDefault();
        setShowSettings(!showSettings);
      } else if (ctrlKey && e.key === "h") {
        e.preventDefault();
        setShowHistory(!showHistory);
      } else if (e.key === "Escape") {
        if (showSettings) setShowSettings(false);
        if (showHistory) setShowHistory(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSettings, showHistory, setShowSettings, setShowHistory, handleNewSession]);
}