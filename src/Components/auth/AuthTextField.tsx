import type { InputHTMLAttributes, ReactNode } from "react";

type AuthTextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
    hint?: string;
    icon?: ReactNode;
    rightAdornment?: ReactNode;
    hideErrorText?: boolean;
};

export function AuthTextField({
    label,
    error,
    hint,
    icon,
    rightAdornment,
    hideErrorText = true,
    className = "",
    id,
    ...inputProps
}: AuthTextFieldProps) {
    return (
        <label className="auth-text-field" htmlFor={id}>
            <span className="auth-text-field__label">{label}</span>
            <span
                className={[
                    "auth-text-field__control",
                    error
                        ? "auth-text-field__control--error"
                        : "auth-text-field__control--default",
                ].join(" ")}
            >
                {icon ? <span className="auth-text-field__icon">{icon}</span> : null}
                <input
                    id={id}
                    className={[
                        "auth-text-field__input",
                        className,
                    ].join(" ")}
                    {...inputProps}
                />
                {rightAdornment ? <span className="auth-text-field__adornment">{rightAdornment}</span> : null}
            </span>
            {error && !hideErrorText ? (
                <span aria-live="polite" className="auth-text-field__error">
                    {error}
                </span>
            ) : hint ? (
                <span className="auth-text-field__hint">{hint}</span>
            ) : null}
        </label>
    );
}
