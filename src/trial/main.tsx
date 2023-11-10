import '../index.css'
import 'react-toastify/dist/ReactToastify.css';
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '../App.tsx'
import { Providers } from '../redux/provider.tsx'
import { SettingsProvider } from '../providers/SettingsProvider.tsx';

// ReactをDomに追加する
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SettingsProvider isTrialPage={true}>
      <Providers>
        <App />
      </Providers>
    </SettingsProvider>
  </React.StrictMode>,
)