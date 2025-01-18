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

function Content({data, error, isLoading}: {data: {tasks: TaskData[], year: string}, error: Error, isLoading: boolean}) {
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

    if (!data || !data.tasks) {
        return;
    }

    data.tasks.sort((a: TaskData, b: TaskData): number => {
        return a.required - b.required;
    });
     
    return <div>
        <div className="tasks">
            {
                data.tasks.map((task: TaskData) => {
                    if (data.year == "Elevate Your Expectations" && (task.name != "Community Service Hours" && task.name != "Launchpad Self-Guided Training")) {
                        return <Task task={task} asterisk />
                    }
                    return <Task task={task} />
                }
            )
            }
        </div>
        {
            data.year == "Elevate Your Expectations" && <div className="asterisk-note">
                *If you complete UNIV 212, only the Launchpad self-guided training and community service hours are required. 
            </div>
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
    const { data, error, isLoading } = useSWR(`/.netlify/functions/get-progress?access_token=${profile.access_token}`, fetcher);
    useEffect(() => {
        console.log(data, error, isLoading);
    }, [data, error, isLoading]);

    return (
        <>
            <h1>Hey {profile.name}!</h1>
            <h2>Here's your progress so far</h2>

            <Content data={data} error={error} isLoading={isLoading} />

                
            {/* <FAQ /> */}

            <button onClick={() => logOut()}>
                Log out ✌️
            </button>
        </>
    )
}