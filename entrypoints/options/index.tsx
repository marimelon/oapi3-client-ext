import ReactDOM from 'react-dom/client'
import { AppProvider } from '../../src/context/AppContext'
import NewApp from '../../src/options/components/NewApp'
import '../../src/styles/globals.css'

// Mount React app
const root = document.getElementById('root')
if (root) {
  ReactDOM.createRoot(root).render(
    <AppProvider>
      <NewApp />
    </AppProvider>
  )
}