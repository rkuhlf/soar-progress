import { useState } from "react";
import { useLoginContext } from "./LoginProvider";
import type { TaskData } from "./Task";
import Task from "./Task";


export type ProfileData = {
    name: string,
    email: string,
};

/** This is the component that renders all of the information about the progress. */
export default function Profile() {
    const { profile, logOut } = useLoginContext();

    const [tasks, setTasks] = useState<TaskData[]>([
        {
            name: "Mental health thing",
            completed: false
        },
        {
            name: "Step 2",
            completed: true
        }
    ]);

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
                    tasks.map((task: TaskData) => <Task task={task} />)
                }
            </div>

            <button onClick={() => logOut()}>
                Log out ✌️
            </button>
        </>
    )
}