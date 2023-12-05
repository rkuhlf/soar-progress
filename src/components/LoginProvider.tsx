
import { GoogleOAuthProvider, googleLogout } from '@react-oauth/google';
import { createContext, useContext, useState, type PropsWithChildren, useEffect } from 'react';
import { clearLogin, loadLogin, loadShouldRememberLogin, saveLogin, saveShouldRememberLogin, type User } from '../lib/loginMemory';
import type { ProfileData } from './Profile';

// We don't actually need the user auth details to be exposed. You have to use logIn or logOut
// to affect the user.
interface LoginContextType {
    logIn: (user: User) => void;
    logOut: () => void;
    profile: ProfileData | null;
    shouldRememberLogin: boolean;
    setShouldRememberLogin: Function;
}

const LoginContext = createContext<LoginContextType | undefined>(undefined);

export const useLoginContext = () => {
    const context = useContext(LoginContext);
    if (!context) {
        throw new Error('useLoginContext must be used within a LoginContextProvider');
    }
    return context;
};

export default function LoginProvider({ children }: PropsWithChildren<{}>) {
    const [shouldRememberLogin, setShouldRememberLogin] = useState<boolean>(loadShouldRememberLogin());
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [user, setUser] = useState<User | null>(null);

    const logIn = (user: User) => {
        setUser(user);

        if (shouldRememberLogin) {
            saveLogin(user);
        }
    }

    const logOut = () => {
        googleLogout();
        setProfile(null);

        clearLogin();
    };


    useEffect(() => {
        // Whenever we get to the login page, we want to check if we have already remembered the login.
        const savedLogin = loadLogin();

        if (savedLogin) {
            logIn(savedLogin);
        }
    }, []);

    // When the user changes, we go to Google to get what their profile is.
    useEffect(
        () => {
            if (user) {
                fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${user.access_token}`, {
                    headers: {
                        Authorization: `Bearer ${user.access_token}`,
                        Accept: 'application/json'
                    }
                })
                    .then((res) => {
                        return res.json();
                    })
                    .then((data: any) => {
                        if (data.error) {
                            throw new Error(JSON.stringify(data.error));
                        }
                        setProfile({
                            name: data.given_name,
                            email: data.email,
                            access_token: user.access_token,
                        })
                    })
                    .catch((err) => {
                        console.log("Couldn't figure out who this user is.")
                        console.log(err);
                    });
            }
        },
        [user]
    );

    useEffect(() => {
        saveShouldRememberLogin(shouldRememberLogin);
    }, [shouldRememberLogin])

    return (
        <GoogleOAuthProvider clientId='597147782814-n1n4ca4j1ho0q688k68ukk4n1arqmtrr.apps.googleusercontent.com'>
            <LoginContext.Provider value={{ profile, logIn, logOut, shouldRememberLogin, setShouldRememberLogin }}>
                {children}
            </LoginContext.Provider>
        </GoogleOAuthProvider>
    );
};