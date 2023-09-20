import './App.css'
import Profile from './components/Profile';

import LoginPage from './components/LoginPage';
import { useLoginContext } from './components/LoginProvider';


function testEndpoint() {
  fetch('/.netlify/functions/hello')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Response:', data);
    })
    .catch(error => {
      console.error('Error:', error);
    });

}

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