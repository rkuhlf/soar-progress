

export type ProfileData = {
    name: string,
    email: string,
};

/** This is the component that renders all of the information about the progress. */
export default function Profile({
    profile
}: { profile: ProfileData }) {
    // TODO: set up state for tasks.

    if (!profile) {
        return (
            <div>
                Loading...
            </div>
        )
    }

    return (
        <>
            You logged in!
            <h1>Hey, {profile.name}!</h1>
            <h2>Here's your progress so far</h2>

            <div>
                {
                    // profile.tasks.map((task: TaskData) => {
                    //     return <div>

                    //     </div>
                    // })
                }
            </div>
        </>
    )
}