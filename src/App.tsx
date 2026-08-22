import { AppProvider, useApp } from './store/AppContext';
import Toolbar from './components/Toolbar';
import FieldPanel from './components/FieldPanel';
import Canvas from './components/Canvas';
import PropertyPanel from './components/PropertyPanel';

function AppContent() {
  const { state } = useApp();

  return (
    <div className={`app ${state.isPrintMode ? 'print-mode' : ''}`}>
      <Toolbar />
      <div className="app-body">
        <FieldPanel />
        <Canvas />
        <PropertyPanel />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
