import App from "./App";
import LoginProvider from "./components/LoginProvider";


export default function Bootstrapper() {
    return (
        <LoginProvider>
            <App />
        </LoginProvider>
    )
}