import React, { createContext, useContext, useEffect, useState } from 'react';

const CheatContext = createContext(false);

const CHEAT = 'iddqd';

export function CheatProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let buf = '';
    function onKey(e: KeyboardEvent) {
      buf = (buf + e.key.toLowerCase()).slice(-CHEAT.length);
      if (buf === CHEAT) setActive(a => !a);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return <CheatContext.Provider value={active}>{children}</CheatContext.Provider>;
}

export function useCheatMode(): boolean {
  return useContext(CheatContext);
}
