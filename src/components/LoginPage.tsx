import { useLoginContext } from "./LoginProvider";
import { useGoogleLogin } from "@react-oauth/google";


export default function LoginPage() {
    const { setShouldRememberLogin, shouldRememberLogin, logIn } = useLoginContext();

    const handleCheckboxChange = () => {
        setShouldRememberLogin(!shouldRememberLogin);
    };

    const popOutGoogleLogin = useGoogleLogin({
        onSuccess: logIn,
        onError: (error) => console.log('Login Failed:', error)
    });

    return (
        <div>
            <div>
                <button onClick={() => popOutGoogleLogin()}>Sign in with Google 🚀 </button>
            </div>
            <label>
                <input
                type="checkbox"
                checked={shouldRememberLogin}
                onChange={handleCheckboxChange}
                />
                Remember Me
            </label>
        </div>
    );
}