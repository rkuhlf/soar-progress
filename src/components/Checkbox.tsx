import "./Checkbox.css"

export default function({checked, onChange}: {checked: boolean, onChange: () => void}) {
    return (
        <label className="container">
            <input type="checkbox"
                    checked={checked}
                    onChange={onChange}/>
            <span className="checkmark"></span>
        </label>
    );
}