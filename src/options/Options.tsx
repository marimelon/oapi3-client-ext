import ReactDOM from 'react-dom/client'
import { AppProvider } from '../context/AppContext'
import NewApp from './components/NewApp'
import '../styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AppProvider>
    <NewApp />
  </AppProvider>
)