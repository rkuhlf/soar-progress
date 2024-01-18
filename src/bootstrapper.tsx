import App from "./App";
import AnalyticsProvider from "./components/AnalyticsProvider";
import LoginProvider from "./components/LoginProvider";


export default function Bootstrapper() {
    return (
        <LoginProvider>
            <AnalyticsProvider>
                <App />
            </AnalyticsProvider>
        </LoginProvider>
    )
}