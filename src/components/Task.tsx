// There could be tasks with different types, like a progress type.
export type TaskData = {
    name: string;
    completed: number;
    required: number;
}


export default function Task({ task, asterisk } : { task: TaskData, asterisk?: boolean }) {
    const finishedTask = task.completed >= task.required
    return (
        <div className={`task ${finishedTask ? "task-completed" : ""}`}>
            <span className="task-progress">
                {
                    finishedTask ? 
                    "✅" : 
                    `${task.completed} / ${task.required}`
                }
            </span>

            <span className="task-title">
                {task.name + (asterisk ? "*" : "")}
            </span>
        </div>
    )
}