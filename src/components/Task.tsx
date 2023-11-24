// There could be tasks with different types, like a progress type.
export type TaskData = {
    name: string;
    completed: number;
    required: number;
}


export default function Task({ task } : { task: TaskData }) {
    return (
        <div className={`task ${task.completed ? "task-completed" : ""}`}>
            <span className="task-progress">
                {
                    task.completed >= task.required ? 
                    "✅" : 
                    `${task.required} / ${task.completed}`
                }
            </span>

            <span className="task-title">
                {task.name}
            </span>
        </div>
    )
}