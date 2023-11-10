import './index.css'
import 'react-toastify/dist/ReactToastify.css';
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { Providers } from './redux/provider.tsx'
import { SettingsProvider } from './providers/SettingsProvider.tsx';

// URLクエリが適切なら、localStorageを初期化する
const searchParams = new URLSearchParams(window.location.search);
const deleteTarget: string | null = searchParams.get("removeItem");
if(deleteTarget) localStorage.removeItem(deleteTarget);

// ReactをDomに追加する
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SettingsProvider isTrialPage={false}>
      <Providers>
        <App />
      </Providers>
    </SettingsProvider>
  </React.StrictMode>,
)