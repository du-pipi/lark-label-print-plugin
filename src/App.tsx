import { useState, useRef, useEffect } from 'react';
import { AppProvider } from './store/AppContext';
import Toolbar from './components/Toolbar';
import FieldPanel from './components/FieldPanel';
import Canvas from './components/Canvas';
import PropertyPanel from './components/PropertyPanel';

function AppContent() {
  const [panelWidth, setPanelWidth] = useState(260);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartW = useRef(0);

  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (e: MouseEvent) => {
      // 向左拖增大宽度
      const dx = resizeStartX.current - e.clientX;
      const newW = Math.max(180, Math.min(500, resizeStartW.current + dx));
      setPanelWidth(newW);
    };
    const handleUp = () => setIsResizing(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isResizing]);

  return (
    <div className="app">
      <Toolbar />
      <div className="app-body">
        <FieldPanel />
        <Canvas />
        {/* 拖动分隔条 */}
        <div
          className={`panel-resizer ${isResizing ? 'dragging' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault();
            resizeStartX.current = e.clientX;
            resizeStartW.current = panelWidth;
            setIsResizing(true);
          }}
        />
        <div style={{ width: panelWidth, flexShrink: 0, display: 'flex' }}>
          <PropertyPanel />
        </div>
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
