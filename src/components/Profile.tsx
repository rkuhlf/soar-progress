import { useLoginContext } from "./LoginProvider";


export type ProfileData = {
    name: string,
    email: string,
};

/** This is the component that renders all of the information about the progress. */
export default function Profile() {
    const { profile, logOut } = useLoginContext();

    if (!profile) {
        // This should never run bc it's checked in the App, but we keep it to make TS happy.
        return (
            <div>
                Loading...
            </div>
        );
    }

    return (
        <>
            <h1>Hey {profile.name}!</h1>
            <h2>Here's your progress so far</h2>

            <div>
                {
                    // profile.tasks.map((task: TaskData) => {
                    //     return <div>

                    //     </div>
                    // })
                }
            </div>

            <button onClick={() => logOut()}>
                Log out ✌️
            </button>
        </>
    )
}