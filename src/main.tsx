import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import Bootstrapper from './bootstrapper';


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Bootstrapper />
  </React.StrictMode>,
)
