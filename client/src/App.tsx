import { FolderProvider } from './contexts/FolderContext.js';
import { ToastProvider } from './contexts/ToastContext.js';
import { ToastContainer } from './components/ToastContainer.js';
import ThumbRackApp from './pages/ThumbRackApp.js';

export default function App() {
  return (
    <ToastProvider>
      <FolderProvider>
        <ThumbRackApp />
        <ToastContainer />
      </FolderProvider>
    </ToastProvider>
  );
}
