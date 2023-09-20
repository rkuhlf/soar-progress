// There could be tasks with different types, like a progress type.
export type TaskData = {
    name: string;
    completed: boolean;
}


export default function Task({ task } : { task: TaskData }) {
    console.log(task);
    return (
        <div className="task">
            {task.name}
            {"" + task.completed}
        </div>
    )
}