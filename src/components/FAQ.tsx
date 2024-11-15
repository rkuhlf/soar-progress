import type { PropsWithChildren } from "react";

function Question({ children, question }: PropsWithChildren<{question: string}>) {
    return (
        <section>
            <h3>{question}</h3>
            <div>
                {children}
            </div>
        </section>
    )
}

export default function FAQ() {
    return (
        <aside className="explanations">
            <h2>FAQ</h2>
            <Question question="My events aren't showing up!">
                <p>It might take a few days for events you've completed to show up. <a target="_blank" href="mailto:gb72@rice.edu">Email Gillian</a> if if something still looks wrong after that.</p>
            </Question>

            <Question question="How can I submit service hours?">
                <p>Submit your community service hours by filling out <a target="_blank" href="https://docs.google.com/forms/d/e/1FAIpQLSeycdCUnsGJZ1vmcg49k1anCkho-oTc2mGC_JFHMWl5w5tzew/viewform">this form</a>.</p>
            </Question>

            <Question question="When are the next events?">
                <p>There's an email each week listing the Flight Plan events for that week, or you can look at the full schedule at the end of <a href="./assets/Fall 2024 Flight Plan Program.pdf" download>this pdf</a>.</p>
            </Question>
        </aside>

    )
}