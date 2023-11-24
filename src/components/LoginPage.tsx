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
        <div className="login-page">
            <h1 className="title">
                Flight Plan <br />
                Progress
            </h1>
            <div className="login-form">
                <div>
                    <button className="login-button" onClick={() => popOutGoogleLogin()}>Sign in with Google 🚀 </button>
                </div>
                <label className="remember-me">
                    <input
                    type="checkbox"
                    checked={shouldRememberLogin}
                    onChange={handleCheckboxChange}
                    />
                    Remember me
                </label>
            </div>
        </div>
    );
}