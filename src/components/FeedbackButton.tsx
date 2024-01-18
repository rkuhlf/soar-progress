export const feedbackURL = "https://docs.google.com/forms/d/e/1FAIpQLSf0cw-Pi3xI7EnKPMLalRMk2nGRwNZQNQB0el2rAK5g_OK9vQ/viewform?usp=sf_link";


export default function FeedbackButton() {
    return (
        <a className="feedback-button" target="_blank" href={feedbackURL}>Give Feedback</a>
    )
}