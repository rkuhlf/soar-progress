import { useEffect, useState } from 'react'
import './App.css'
import { GoogleLogin } from '@react-oauth/google';
import Profile, { type ProfileData } from './components/Profile';

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

type User = any;

import { googleLogout, useGoogleLogin } from '@react-oauth/google';

function App() {
    const [ user, setUser ] = useState<User | null>(null);
    const [ profile, setProfile ] = useState<ProfileData | null>(null);

    const login = useGoogleLogin({
        onSuccess: (codeResponse) => setUser(codeResponse),
        onError: (error) => console.log('Login Failed:', error)
    });

    useEffect(
        () => {
            if (user) {
              console.log(user);
                fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${user.access_token}`, {
                        headers: {
                            Authorization: `Bearer ${user.access_token}`,
                            Accept: 'application/json'
                        }
                    })
                    .then((res) => {
                      console.log(res);
                      return res.json();
                    })
                    .then((data: any) => {
                      setProfile({
                        name: data.name,
                        email: data.email
                      })
                    })
                    .catch((err) => console.log(err));
            }
        },
        [ user ]
    );

    // log out function to log the user out of google and set the profile array to null
    const logOut = () => {
        googleLogout();
        setProfile(null);
    };

    return (
        <div>
            
            {profile ? (
                <Profile profile={profile} />
            ) : (
                <button onClick={() => login()}>Sign in with Google 🚀 </button>
            )}
        </div>
    );
}
export default App;