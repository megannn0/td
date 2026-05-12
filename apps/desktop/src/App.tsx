import React, { useEffect } from 'react';
import { SelectionProvider } from './hooks/useSelection';
import AppShell from './components/layout/AppShell';
import { useSettings } from './hooks/useSettings';

/**
 * Entry point of the desktop application. Wraps the entire UI in a
 * SelectionProvider to make navigation state available to all
 * components. The AppShell component constructs the overall layout.
 */
const App: React.FC = () => {
  // Apply the user's theme preference by toggling a class on the root
  // element.  This effect runs whenever the settings change.  Tailwind
  // can then use the ``dark`` class for dark mode styling.
  const { settings } = useSettings();

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);
  return (
    <SelectionProvider>
      <AppShell />
    </SelectionProvider>
  );
};

export default App;
