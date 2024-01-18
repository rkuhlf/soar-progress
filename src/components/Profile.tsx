import { useEffect } from "react";
import { useLoginContext } from "./LoginProvider";
import type { TaskData } from "./Task";
import Task from "./Task";
import useSWR from "swr";
import Spinner from "./Spinner";
import { ErrorMessages } from "../shared/errors";
import { feedbackURL } from "./FeedbackButton";
import { useAnalyticsContext } from "./AnalyticsProvider";


export type ProfileData = {
    name: string,
    email: string,
    access_token: string,
};

async function fetcher(url: string) {
    const res = await fetch(url)
 
  // If the status code is not in the range 200-299,
  // we still try to parse and throw it.
  if (!res.ok) {
    const error = new Error(await res.text());
    throw error;
  }
  
  try {
    return res.json()
  } catch {
    throw new Error(ErrorMessages.GeneralParsingError);
  }
}

function getErrorMessage(error: Error): string {
    // We have to clean it up because it adds a stack trace onto the end.
    for (const knownError of Object.values(ErrorMessages)) {
        if (error.message.includes(knownError)) {
            return knownError;
        }
    }

    return ErrorMessages.UnknownError;
}

function Content({tasks, error, isLoading}: {tasks: TaskData[], error: Error, isLoading: boolean}) {
    const { logEvent } = useAnalyticsContext();
    if (error) {
        const message = getErrorMessage(error);
        logEvent(error.name, error.message);
        
        return (
            <div className="error">
                <div className="error-title">😞 Error 😞</div>

                <div className="error-message">{message} <br />
                <a target="_blank" href={feedbackURL}>Tell us about the problem.</a></div>
            </div>
        )
    }

    if (isLoading) {
        return <Spinner />;
    }
     
    return <div className="tasks">
        {
            tasks && tasks.map((task: TaskData) => <Task task={task} />)
        }
    </div>;
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

            <Content tasks={tasks} error={error} isLoading={isLoading} />

            <button onClick={() => logOut()}>
                Log out ✌️
            </button>
        </>
    )
}