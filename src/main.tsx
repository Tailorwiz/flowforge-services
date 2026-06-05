import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { captureReferralFromUrl } from './lib/affiliate'

// Capture affiliate attribution (?ref=CODE) as early as possible.
captureReferralFromUrl();

createRoot(document.getElementById("root")!).render(<App />);
