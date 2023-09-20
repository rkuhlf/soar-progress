import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";


export default function Bootstrapper() {
    return (
        <>
            <GoogleOAuthProvider clientId='597147782814-n1n4ca4j1ho0q688k68ukk4n1arqmtrr.apps.googleusercontent.com'>
                <App />
            </GoogleOAuthProvider>
        </>
    )
}