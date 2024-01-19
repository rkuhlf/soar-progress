import { createContext, useContext, type PropsWithChildren } from 'react';
import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent as firebaseLog } from "firebase/analytics";
import { useLoginContext } from './LoginProvider';

interface AnalyticsContextType {
    logEvent: (name: string, description: string) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export const useAnalyticsContext = () => {
    const context = useContext(AnalyticsContext);
    if (!context) {
        throw new Error('useAnalyticsContext must be used within a AnalyticsContextProvider');
    }
    return context;
};

const firebaseConfig = {
  apiKey: "AIzaSyBc5eIuC-KHvwuQXd5JCppKczFjAIsFACA",
  authDomain: "flight-plan-progress.firebaseapp.com",
  projectId: "flight-plan-progress",
  storageBucket: "flight-plan-progress.appspot.com",
  messagingSenderId: "179170558774",
  appId: "1:179170558774:web:8539ff0a3d793f4b1f2997",
  measurementId: "G-SD2M2NYY2Q"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export default function AnalyticsProvider({ children }: PropsWithChildren<{}>) {
    const { profile } = useLoginContext();

    const logEvent = (name: string, description: string) => {
        firebaseLog(analytics, "exception", {
            description,
            name: profile?.name
        });
    }

    return (
        <AnalyticsContext.Provider value={{ logEvent }}>
            {children}
        </AnalyticsContext.Provider>
    );
};