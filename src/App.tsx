import './App.css'
import Profile from './components/Profile';

import LoginPage from './components/LoginPage';
import { useLoginContext } from './components/LoginProvider';
import FeedbackButton from './components/FeedbackButton';


function App() {
  const { profile } = useLoginContext();
  
  return (
    <div>
        {profile ? (
          <Profile />
        ) : (
          <LoginPage />
        )}

      <FeedbackButton />
    </div>
  );
}

export default App;