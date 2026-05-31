type PasswordStrengthProps = {
    password: string;
};

function getPasswordStrength(password: string) {
    if (!password) {
        return { score: 0, label: "Add a password", tone: "auth-password-strength__bar--empty" };
    }

    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^\w\s]/.test(password)) score += 1;

    if (score <= 1) return { score, label: "Weak", tone: "auth-password-strength__bar--weak" };
    if (score === 2) return { score, label: "Fair", tone: "auth-password-strength__bar--fair" };
    if (score === 3) return { score, label: "Strong", tone: "auth-password-strength__bar--strong" };
    return { score, label: "Excellent", tone: "auth-password-strength__bar--excellent" };
}

export function AuthPasswordStrength({ password }: PasswordStrengthProps) {
    const strength = getPasswordStrength(password);

    return (
        <div className="auth-password-strength">
            <div className="auth-password-strength__header">
                <span className="auth-password-strength__label">Password strength</span>
                <span className="auth-password-strength__value">{strength.label}</span>
            </div>
            <div className="auth-password-strength__bars">
                {[0, 1, 2, 3].map((index) => (
                    <span
                        key={index}
                        className={[
                            "auth-password-strength__bar",
                            index < strength.score ? strength.tone : "auth-password-strength__bar--inactive",
                        ].join(" ")}
                    />
                ))}
            </div>
            <p className="auth-password-strength__hint">Use 8+ characters with uppercase, number, and symbol.</p>
        </div>
    );
}
