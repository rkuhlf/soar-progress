import './App.css'
import Profile from './components/Profile';

import LoginPage from './components/LoginPage';
import { useLoginContext } from './components/LoginProvider';


function App() {
  const { profile } = useLoginContext();
  
  return (
    <div>
      {profile ? (
        <Profile />
      ) : (
        <LoginPage />
      )}
    </div>
  );
}

export default App;