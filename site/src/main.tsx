/**
 * ScratchXR — Application entry.
 * Subsistema: EDU. Depende de: React. Usado por: index.html.
 */
import {createRoot} from 'react-dom/client';
import App from './App';
import './styles.css';
// Scratch/Three own imperative resources; avoid StrictMode's deliberate duplicate mounts.
createRoot(document.getElementById('root')!).render(<App/>);
