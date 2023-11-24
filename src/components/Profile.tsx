import { useEffect } from "react";
import { useLoginContext } from "./LoginProvider";
import type { TaskData } from "./Task";
import Task from "./Task";
import useSWR from "swr";
import Spinner from "./Spinner";


export type ProfileData = {
    name: string,
    email: string,
    access_token: string,
};

async function fetcher(url: string) {
    const data = await fetch(url);
    console.log(data);

    return await data.json();
}

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

    // We send the access token, because that is the thing that should be really hard to fake.
    const { data : tasks, error, isLoading } = useSWR(`/.netlify/functions/get-progress?access_token=${profile.access_token}`, fetcher);
    useEffect(() => {
        console.log(tasks, error, isLoading);
    }, [tasks, error, isLoading]);

    return (
        <>
            <h1>Hey {profile.name}!</h1>
            <h2>Here's your progress so far</h2>

            {
                isLoading ?
                    <Spinner />
                : <div className="tasks">
                {
                    tasks && tasks.map((task: TaskData) => <Task task={task} />)
                }
            </div>
            }

            <button onClick={() => logOut()}>
                Log out ✌️
            </button>
        </>
    )
}