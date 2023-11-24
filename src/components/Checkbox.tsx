import "./Checkbox.css"

export default function({checked, onChange}: {checked: boolean, onChange: () => {}}) {
    return (
        <label className="container">
            <input type="checkbox"
                    checked={checked}
                    onChange={onChange}/>
            <span className="checkmark"></span>
        </label>
    );
}