export type User = {
    access_token: string;
};

export function saveLogin(user: User) {
    localStorage.setItem("access_token", user.access_token);
}

/** Returns the saved user or null if there is no user. */
export function loadLogin(): User | null {
    const access_token = localStorage.getItem("access_token");

    if (!access_token) {
        return null;
    }

    return {
        access_token
    };
}

export function clearLogin() {
    localStorage.removeItem("access_token");
}


export function saveShouldRememberLogin(shouldRememberLogin: boolean) {
    localStorage.setItem("should_remember_login", JSON.stringify(shouldRememberLogin));
}

export function loadShouldRememberLogin(): boolean {
    const raw = localStorage.getItem("should_remember_login");

    if (!raw) {
        return false;
    }

    return JSON.parse(raw);
}