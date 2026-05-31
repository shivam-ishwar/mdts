import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    AppleOutlined,
    ArrowRightOutlined,
    BankOutlined,
    CloseOutlined,
    EyeInvisibleOutlined,
    EyeOutlined,
    GoogleOutlined,
    InfoCircleOutlined,
    LockOutlined,
    MailOutlined,
    UserOutlined,
} from "@ant-design/icons";
import { v4 as uuidv4 } from "uuid";
import { AuthPasswordStrength } from "../Components/auth/AuthPasswordStrength";
import { AuthTextField } from "../Components/auth/AuthTextField";
import "../styles/sign-in.css";
import { db } from "../Utils/dataStorege";
import ToastNotify, { notify } from "../Utils/ToastNotify";
import { userStore } from "../Utils/UserStore";

type AuthMode = "signin" | "signup";

type SignInValues = {
    email: string;
    password: string;
};

type SignUpValues = {
    company: string;
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
};

type AuthUser = {
    id?: number;
    guiId?: string;
    name?: string;
    company?: string;
    designation?: string;
    mobile?: string;
    email?: string;
    whatsapp?: string;
    profilePhoto?: string;
    password?: string;
    Password?: string;
    role?: string;
    orgId?: string;
    [key: string]: unknown;
};

type BannerState = {
    tone: "success" | "error" | "info";
    message: string;
} | null;

type ShowcaseConfig = {
    density: "compact" | "rich";
    pageIntro: {
        eyebrow: string;
        title: string;
        subtitle: string;
    };
    form: {
        eyebrow: string;
        title: string;
        description: string;
        statusLabel: string;
        statusValue: string;
        introTitle: string;
        introCopy: string;
        introBadge: string;
        cta: string;
    };
    showcase: {
        badge: string;
        floatingBadge: string;
        eyebrow: string;
        title: string;
        description: string;
        metrics: { label: string; value: string }[];
        timeline: {
            label: string;
            headline: string;
            copy: string;
            steps: { title: string; detail: string }[];
        };
        spotlight: {
            label: string;
            headline: string;
            items: { label: string; value: string }[];
        };
        benefits: {
            label: string;
            headline: string;
            items: string[];
        };
        highlight: {
            label: string;
            value: string;
            copy: string;
        };
    };
};

const TERMS_STORAGE_KEY = "authRememberedEmail";
const passwordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

const initialSignInValues: SignInValues = {
    email: "",
    password: "",
};

const initialSignUpValues: SignUpValues = {
    company: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
};

const signInFieldLabels: Record<keyof SignInValues, string> = {
    email: "Work email",
    password: "Password",
};

const signUpFieldLabels: Record<keyof SignUpValues | "terms", string> = {
    company: "Company",
    name: "Full name",
    email: "Official email",
    password: "Password",
    confirmPassword: "Confirm password",
    terms: "Terms & Conditions",
};

const authShowcase: Record<AuthMode, ShowcaseConfig> = {
    signin: {
        density: "compact",
        pageIntro: {
            eyebrow: "",
            title: "",
            subtitle: "",
        },
        form: {
            eyebrow: "Sign in",
            title: "Welcome back",
            description: "Access live execution signals and pick up exactly where your shift or review left off.",
            statusLabel: "",
            statusValue: "",
            introTitle: "",
            introCopy: "",
            introBadge: "",
            cta: "Enter workspace",
        },
        showcase: {
            badge: "",
            floatingBadge: "",
            eyebrow: "",
            title: "Everything important is already surfaced before your first click.",
            description: "",
            metrics: [],
            timeline: {
                label: "Review flow",
                headline: "The first five minutes stay focused on what changed.",
                copy: "",
                steps: [
                    {
                        title: "Scan the active priorities",
                        detail: "Progress drift, blockers, and commercial actions are already organized by urgency.",
                    },
                    {
                        title: "Confirm team alignment",
                        detail: "Shared visibility keeps field updates, planning assumptions, and leadership reviews in sync.",
                    },
                    {
                        title: "Move into action fast",
                        detail: "Escalations, approvals, and next steps stay linked to the underlying project context.",
                    },
                ],
            },
            spotlight: {
                label: "Workspace snapshot",
                headline: "Signals already waiting for you",
                items: [
                    { label: "Critical path health", value: "Stable" },
                    { label: "Open escalations", value: "03 items" },
                    { label: "Leadership digest", value: "Ready" },
                ],
            },
            benefits: {
                label: "Why teams return",
                headline: "High-signal access without clutter",
                items: [
                    "A concise workspace handoff between field teams, planners, and leadership reviewers.",
                    "Execution context, commercial risk, and governance controls visible in one operating layer.",
                    "Premium motion and visual depth without introducing heavy or distracting interactions.",
                ],
            },
            highlight: {
                label: "Response readiness",
                value: "< 2 min",
                copy: "Typical time to get from login to the first meaningful decision in the workspace.",
            },
        },
    },
    signup: {
        density: "rich",
        pageIntro: {
            eyebrow: "",
            title: "",
            subtitle: "",
        },
        form: {
            eyebrow: "Sign up",
            title: "Create your workspace",
            description: "",
            statusLabel: "",
            statusValue: "",
            introTitle: "",
            introCopy: "",
            introBadge: "",
            cta: "Create account",
        },
        showcase: {
            badge: "",
            floatingBadge: "",
            eyebrow: "Workspace preview",
            title: "Give every project, team, and update a cleaner place to operate from day one.",
            description: "",
            metrics: [],
            timeline: {
                label: "First week",
                headline: "Set up the workspace with less friction.",
                copy: "",
                steps: [
                    {
                        title: "Create the workspace shell",
                        detail: "Register your company and first admin.",
                    },
                    {
                        title: "Align roles and operating views",
                        detail: "Set up the core access structure.",
                    },
                    {
                        title: "Bring schedules and controls together",
                        detail: "Start with one shared operating view.",
                    },
                ],
            },
            spotlight: {
                label: "What opens next",
                headline: "Your first workspace outcomes",
                items: [
                    { label: "Admin account", value: "Provisioned" },
                    { label: "Company workspace", value: "Created" },
                    { label: "Profile completion", value: "Next step" },
                ],
            },
            benefits: {
                label: "Included from day one",
                headline: "A stronger first impression for new teams",
                items: [
                    "Role-aware visibility that can scale from one project to a multi-site delivery portfolio.",
                    "Audit-friendly records for decisions, approvals, and operational follow-through.",
                    "Shared workspace structure for planners, delivery leads, commercial teams, and reviewers from the start.",
                ],
            },
            highlight: {
                label: "Expected uplift",
                value: "1 source",
                copy: "One shared operating layer for schedule, delivery, risk, and executive oversight instead of disconnected trackers. Teams enter with clearer ownership, fewer handoff gaps, and a stronger base for future project controls.",
            },
        },
    },
};

function validateEmail(email: string) {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

function isProfileCompleted(user: AuthUser) {
    return Boolean(
        user.name &&
            user.company &&
            user.mobile &&
            user.designation &&
            user.email &&
            user.whatsapp &&
            user.profilePhoto &&
            (user.Password || user.password)
    );
}

function TermsAndConditionsContent() {
    return (
        <div className="auth-terms">
            <div className="auth-terms__section">
                <h3 className="auth-terms__title">Terms & Conditions</h3>
                <p className="auth-terms__body auth-terms__body--spaced">
                    By accessing MineSense, you agree to use the platform only for authorized mine development planning,
                    execution, and governance workflows.
                </p>
            </div>

            <div className="auth-terms__section">
                <h4 className="auth-terms__subtitle">1. Authorized usage</h4>
                <p className="auth-terms__body auth-terms__body--tight">
                    The platform is intended for approved operational, delivery, and leadership teams managing mine
                    development programs.
                </p>
            </div>

            <div className="auth-terms__section">
                <h4 className="auth-terms__subtitle">2. Data responsibility</h4>
                <p className="auth-terms__body auth-terms__body--tight">
                    Project, commercial, safety, and workforce data entered into the platform must be accurate and
                    handled according to your organization&apos;s policies.
                </p>
            </div>

            <div className="auth-terms__section">
                <h4 className="auth-terms__subtitle">3. Account security</h4>
                <p className="auth-terms__body auth-terms__body--tight">
                    You are responsible for protecting your credentials and reporting suspected unauthorized access
                    immediately.
                </p>
            </div>

            <div className="auth-terms__section">
                <h4 className="auth-terms__subtitle">4. Platform governance</h4>
                <p className="auth-terms__body auth-terms__body--tight">
                    MineSense maintains audit trails and access controls to support compliance, oversight, and
                    accountable decision-making.
                </p>
            </div>
        </div>
    );
}

export default function SignInSignUp() {
    const navigate = useNavigate();
    const [mode, setMode] = useState<AuthMode>("signin");
    const [signInValues, setSignInValues] = useState<SignInValues>(initialSignInValues);
    const [signUpValues, setSignUpValues] = useState<SignUpValues>(initialSignUpValues);
    const [rememberMe, setRememberMe] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showSignUpPassword, setShowSignUpPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [signInErrors, setSignInErrors] = useState<Partial<Record<keyof SignInValues, string>>>({});
    const [signUpErrors, setSignUpErrors] = useState<Partial<Record<keyof SignUpValues | "terms", string>>>({});
    const [banner, setBanner] = useState<BannerState>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
        const rememberedEmail = localStorage.getItem(TERMS_STORAGE_KEY);
        if (rememberedEmail) {
            setSignInValues((prev) => ({ ...prev, email: rememberedEmail }));
            setRememberMe(true);
        }
    }, []);

    const activeConfig = useMemo(() => authShowcase[mode], [mode]);
    const visibleMetrics = useMemo(
        () => activeConfig.showcase.metrics.filter((metric) => metric.label || metric.value),
        [activeConfig]
    );

    const applyRememberPreference = () => {
        if (rememberMe) {
            localStorage.setItem(TERMS_STORAGE_KEY, signInValues.email.trim());
        } else {
            localStorage.removeItem(TERMS_STORAGE_KEY);
        }
    };

    const validateSignIn = () => {
        const nextErrors: Partial<Record<keyof SignInValues, string>> = {};

        if (!signInValues.email.trim()) {
            nextErrors.email = "Enter your work email.";
        } else if (!validateEmail(signInValues.email.trim())) {
            nextErrors.email = "Use a valid email address.";
        }

        if (!signInValues.password) {
            nextErrors.password = "Enter your password.";
        }

        setSignInErrors(nextErrors);
        const errorKeys = Object.keys(nextErrors) as (keyof SignInValues)[];

        if (errorKeys.length) {
            notify.error(`Check required fields: ${errorKeys.map((key) => signInFieldLabels[key]).join(", ")}`);
        }

        return errorKeys.length === 0;
    };

    const validateSignUp = () => {
        const nextErrors: Partial<Record<keyof SignUpValues | "terms", string>> = {};

        if (!signUpValues.company.trim()) nextErrors.company = "Enter your company name.";
        if (!signUpValues.name.trim()) nextErrors.name = "Enter your full name.";

        if (!signUpValues.email.trim()) {
            nextErrors.email = "Enter your official email.";
        } else if (!validateEmail(signUpValues.email.trim())) {
            nextErrors.email = "Use a valid company email address.";
        }

        if (!signUpValues.password) {
            nextErrors.password = "Create a password.";
        } else if (!passwordPattern.test(signUpValues.password)) {
            nextErrors.password = "Use 8+ characters with uppercase, number, and symbol.";
        }

        if (!signUpValues.confirmPassword) {
            nextErrors.confirmPassword = "Confirm your password.";
        } else if (signUpValues.password !== signUpValues.confirmPassword) {
            nextErrors.confirmPassword = "Passwords do not match.";
        }

        if (!termsAccepted) {
            nextErrors.terms = "You must accept the terms to create an account.";
        }

        setSignUpErrors(nextErrors);
        const errorKeys = Object.keys(nextErrors) as (keyof SignUpValues | "terms")[];

        if (errorKeys.length) {
            notify.error(`Check required fields: ${errorKeys.map((key) => signUpFieldLabels[key]).join(", ")}`);
        }

        return errorKeys.length === 0;
    };

    const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setBanner(null);

        if (!validateSignIn()) return;

        try {
            setIsSubmitting(true);
            const users = (await db.getUsers()) as AuthUser[];
            const normalizedEmail = signInValues.email.trim().toLowerCase();

            const user = users.find(
                (candidate) =>
                    String(candidate?.email || "").trim().toLowerCase() === normalizedEmail &&
                    (candidate.password === signInValues.password || candidate.Password === signInValues.password)
            );

            if (!user) {
                const message = "Invalid email or password. Review your credentials and try again.";
                setBanner({ tone: "error", message });
                notify.error(message);
                return;
            }

            applyRememberPreference();
            userStore.setUser(user);

            const message = "Authentication successful. Redirecting to your workspace.";
            setBanner({ tone: "success", message });
            notify.success("Login successful.");

            window.setTimeout(() => {
                navigate(isProfileCompleted(user) ? "/workspace-home" : "/profile");
            }, 800);
        } catch (error) {
            console.error(error);
            const message = "Unable to sign you in right now. Please try again.";
            setBanner({ tone: "error", message });
            notify.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setBanner(null);

        if (!validateSignUp()) return;

        try {
            setIsSubmitting(true);

            const allUsers = (await db.getUsers()) as AuthUser[];
            const normalizedEmail = signUpValues.email.trim().toLowerCase();
            const existingUser = (allUsers || []).find(
                (candidate) => String(candidate?.email || "").trim().toLowerCase() === normalizedEmail
            );

            if (existingUser) {
                const message = "An account with this email already exists. Sign in instead.";
                setBanner({ tone: "error", message });
                notify.error(message);
                return;
            }

            const orgId = uuidv4();
            const nowIso = new Date().toISOString();
            const companyName = signUpValues.company.trim();

            await db.addCompany({
                id: Date.now(),
                guiId: orgId,
                name: companyName,
                company: companyName,
                industry: "",
                industryType: "",
                companyType: "",
                website: "",
                pan: "",
                gstin: "",
                cin: "",
                incorpDate: "",
                employeeCount: "",
                address1: "",
                address2: "",
                address: "",
                city: "",
                state: "",
                country: "",
                zip: "",
                zipCode: "",
                registeredOn: nowIso,
                companyLogo: "",
            });

            const newUser = {
                id: Date.now() + 1,
                guiId: uuidv4(),
                name: signUpValues.name.trim(),
                company: companyName,
                designation: "",
                mobile: "",
                email: normalizedEmail,
                whatsapp: "",
                address1: "",
                address2: "",
                address: "",
                city: "",
                state: "",
                country: "",
                zip: "",
                zipCode: "",
                password: signUpValues.password,
                Password: signUpValues.password,
                isTempPassword: false,
                role: "admin",
                userType: "IND",
                orgId,
                companyType: "",
                industryType: "",
                website: "",
                pan: "",
                gstin: "",
                companyLogo: "",
                registeredOn: nowIso,
            };

            await db.addUsers(newUser);
            userStore.setUser(newUser);

            const message = "Account created successfully. Let’s complete your workspace profile.";
            setBanner({ tone: "success", message });
            notify.success("Registration successful.");

            window.setTimeout(() => {
                navigate("/profile");
            }, 900);
        } catch (error: unknown) {
            console.error(error);
            const message = error instanceof Error ? error.message : "Registration failed. Please try again.";
            setBanner({ tone: "error", message });
            notify.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const socialButtons = (
        <div className="auth-form__social">
            {[
                { icon: GoogleOutlined, label: "Google", detail: "SSO placeholder" },
                { icon: AppleOutlined, label: "Apple", detail: "SSO placeholder" },
            ].map(({ icon: Icon, label, detail }) => (
                <button key={label} type="button" disabled className="auth-social-button">
                    <span className="auth-social-button__left">
                        <span className="auth-social-button__icon">
                            <Icon />
                        </span>
                        <span>
                            <span className="auth-social-button__title">Continue with {label}</span>
                            <span className="auth-social-button__detail">{detail}</span>
                        </span>
                    </span>
                    <InfoCircleOutlined />
                </button>
            ))}
        </div>
    );

    return (
        <div className="auth-shell">
            <div className="auth-shell__glow auth-shell__glow--one" />
            <div className="auth-shell__glow auth-shell__glow--two" />

            <div className="auth-shell__inner">
                {activeConfig.pageIntro.eyebrow || activeConfig.pageIntro.title || activeConfig.pageIntro.subtitle ? (
                    <header className="auth-shell__intro">
                        {activeConfig.pageIntro.eyebrow ? (
                            <p className="auth-shell__eyebrow">{activeConfig.pageIntro.eyebrow}</p>
                        ) : null}
                        {activeConfig.pageIntro.title ? <h1 className="auth-shell__title">{activeConfig.pageIntro.title}</h1> : null}
                        {activeConfig.pageIntro.subtitle ? (
                            <p className="auth-shell__subtitle">{activeConfig.pageIntro.subtitle}</p>
                        ) : null}
                    </header>
                ) : null}

                <div className="auth-grid">
                    <aside
                        className={`auth-card auth-showcase ${
                            activeConfig.density === "compact" ? "auth-showcase--compact" : "auth-showcase--rich"
                        }`}
                    >
                        <div className="auth-showcase__noise" />
                        <div className="auth-showcase__grid" />
                        <div className="auth-showcase__gradient" />
                        <div className="auth-showcase__ring" />
                        <div className="auth-showcase__line" />
                        <div className="auth-showcase__floating-orb auth-showcase__floating-orb--one" />
                        <div className="auth-showcase__floating-orb auth-showcase__floating-orb--two" />

                        <div className="auth-showcase__content">
                            <div className="auth-showcase__top auth-anim auth-anim--enter">
                                {activeConfig.showcase.badge || activeConfig.showcase.floatingBadge ? (
                                    <div className="auth-showcase__badge-row">
                                        {activeConfig.showcase.badge ? (
                                            <span className="auth-pill auth-pill--ghost">{activeConfig.showcase.badge}</span>
                                        ) : null}
                                        {activeConfig.showcase.floatingBadge ? (
                                            <span className="auth-pill auth-pill--solid">{activeConfig.showcase.floatingBadge}</span>
                                        ) : null}
                                    </div>
                                ) : null}
                                {activeConfig.showcase.eyebrow ? (
                                    <p className="auth-showcase__eyebrow">{activeConfig.showcase.eyebrow}</p>
                                ) : null}
                                <h2 className="auth-showcase__title">{activeConfig.showcase.title}</h2>
                                {activeConfig.showcase.description ? (
                                    <p className="auth-showcase__description">{activeConfig.showcase.description}</p>
                                ) : null}
                            </div>

                            {visibleMetrics.length ? (
                                <div className="auth-showcase__metrics auth-anim auth-anim--enter auth-anim--delay-1">
                                    {visibleMetrics.map((metric, index) => (
                                        <div
                                            key={`${metric.label}-${metric.value}-${index}`}
                                            className={`auth-metric auth-anim auth-anim--enter auth-anim--delay-${Math.min(index + 2, 4)}`}
                                        >
                                            <p className="auth-metric__value">{metric.value}</p>
                                            <p className="auth-metric__label">{metric.label}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : null}

                            {activeConfig.density === "compact" ? (
                                <div className="auth-showcase__compact-stack">
                                    <section className="auth-panel auth-panel--timeline auth-panel--compact auth-anim auth-anim--enter auth-anim--delay-2">
                                        <p className="auth-panel__label">{activeConfig.showcase.timeline.label}</p>
                                        <h3 className="auth-panel__headline">{activeConfig.showcase.timeline.headline}</h3>
                                        <p className="auth-panel__copy">{activeConfig.showcase.timeline.copy}</p>

                                        <div className="auth-steps auth-steps--compact">
                                            {activeConfig.showcase.timeline.steps.slice(0, 2).map((step, index) => (
                                                <div
                                                    key={step.title}
                                                    className={`auth-step auth-anim auth-anim--enter auth-anim--delay-${Math.min(index + 2, 4)}`}
                                                >
                                                    <span className="auth-step__index">0{index + 1}</span>
                                                    <div>
                                                        <p className="auth-step__title">{step.title}</p>
                                                        <p className="auth-step__detail">{step.detail}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <div className="auth-showcase__compact-bottom">
                                        <section className="auth-panel auth-panel--spotlight auth-panel--compact auth-anim auth-anim--enter auth-anim--delay-3">
                                            <p className="auth-panel__label">{activeConfig.showcase.spotlight.label}</p>
                                            <h3 className="auth-panel__headline">{activeConfig.showcase.spotlight.headline}</h3>

                                            <div className="auth-spotlight__items">
                                                {activeConfig.showcase.spotlight.items.slice(0, 2).map((item, index) => (
                                                    <div
                                                        key={item.label}
                                                        className={`auth-spotlight__item auth-anim auth-anim--enter auth-anim--delay-${Math.min(index + 3, 4)}`}
                                                    >
                                                        <span className="auth-spotlight__key">{item.label}</span>
                                                        <span className="auth-spotlight__value">{item.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        <section className="auth-panel auth-highlight auth-highlight--compact auth-anim auth-anim--enter auth-anim--delay-4">
                                            <p className="auth-panel__label">{activeConfig.showcase.highlight.label}</p>
                                            <p className="auth-highlight__value">{activeConfig.showcase.highlight.value}</p>
                                            <p className="auth-highlight__copy">{activeConfig.showcase.highlight.copy}</p>
                                        </section>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="auth-showcase__middle">
                                        <section className="auth-panel auth-panel--timeline auth-anim auth-anim--enter auth-anim--delay-2">
                                            <p className="auth-panel__label">{activeConfig.showcase.timeline.label}</p>
                                            <h3 className="auth-panel__headline">{activeConfig.showcase.timeline.headline}</h3>
                                            <p className="auth-panel__copy">{activeConfig.showcase.timeline.copy}</p>

                                            <div className="auth-steps">
                                                {activeConfig.showcase.timeline.steps.map((step, index) => (
                                                    <div
                                                        key={step.title}
                                                        className={`auth-step auth-anim auth-anim--enter auth-anim--delay-${Math.min(index + 2, 4)}`}
                                                    >
                                                        <span className="auth-step__index">0{index + 1}</span>
                                                        <div>
                                                            <p className="auth-step__title">{step.title}</p>
                                                            <p className="auth-step__detail">{step.detail}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        <section className="auth-panel auth-panel--spotlight auth-anim auth-anim--enter auth-anim--delay-3">
                                            <p className="auth-panel__label">{activeConfig.showcase.spotlight.label}</p>
                                            <h3 className="auth-panel__headline">{activeConfig.showcase.spotlight.headline}</h3>

                                            <div className="auth-spotlight__items">
                                                {activeConfig.showcase.spotlight.items.map((item, index) => (
                                                    <div
                                                        key={item.label}
                                                        className={`auth-spotlight__item auth-anim auth-anim--enter auth-anim--delay-${Math.min(index + 3, 4)}`}
                                                    >
                                                        <span className="auth-spotlight__key">{item.label}</span>
                                                        <span className="auth-spotlight__value">{item.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    </div>

                                    <div className="auth-showcase__bottom">
                                        <section className="auth-panel auth-benefits auth-anim auth-anim--enter auth-anim--delay-4">
                                            <p className="auth-panel__label">{activeConfig.showcase.benefits.label}</p>
                                            <h3 className="auth-panel__headline">{activeConfig.showcase.benefits.headline}</h3>

                                            <ul className="auth-benefits__list">
                                                {activeConfig.showcase.benefits.items.map((item, index) => (
                                                    <li
                                                        key={item}
                                                        className={`auth-benefit auth-anim auth-anim--enter auth-anim--delay-${Math.min(index + 3, 4)}`}
                                                    >
                                                        <span className="auth-benefit__dot" />
                                                        <span className="auth-benefit__text">{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </section>

                                        <section className="auth-panel auth-highlight auth-anim auth-anim--enter auth-anim--delay-4">
                                            <p className="auth-panel__label">{activeConfig.showcase.highlight.label}</p>
                                            <p className="auth-highlight__value">{activeConfig.showcase.highlight.value}</p>
                                            <p className="auth-highlight__copy">{activeConfig.showcase.highlight.copy}</p>
                                        </section>
                                    </div>
                                </>
                            )}
                        </div>
                    </aside>

                    <section className="auth-card auth-form auth-anim auth-anim--enter auth-anim--delay-1">
                        <div className="auth-form__content">
                            <div className="auth-form__header">
                                <div className="auth-form__header-copy">
                                    <p className="auth-form__eyebrow">{activeConfig.form.eyebrow}</p>
                                    <h2 className="auth-form__title">{activeConfig.form.title}</h2>
                                    {activeConfig.form.description ? (
                                        <p className="auth-form__description">{activeConfig.form.description}</p>
                                    ) : null}
                                </div>

                                {activeConfig.form.statusLabel || activeConfig.form.statusValue ? (
                                    <div className="auth-form__status">
                                        {activeConfig.form.statusLabel ? (
                                            <p className="auth-form__status-label">{activeConfig.form.statusLabel}</p>
                                        ) : null}
                                        {activeConfig.form.statusValue ? (
                                            <p className="auth-form__status-value">{activeConfig.form.statusValue}</p>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>

                            {banner ? (
                                    <div className={`auth-form__banner auth-form__banner--${banner.tone} auth-anim auth-anim--enter`}>
                                        <InfoCircleOutlined className="mt-0.5" />
                                        <span>{banner.message}</span>
                                    </div>
                                ) : null}

                            <div className="auth-form__stage">
                                {activeConfig.form.introTitle || activeConfig.form.introCopy || activeConfig.form.introBadge ? (
                                    <div className="auth-form__intro-panel">
                                        <div>
                                            {activeConfig.form.introTitle ? (
                                                <p className="auth-form__intro-title">{activeConfig.form.introTitle}</p>
                                            ) : null}
                                            {activeConfig.form.introCopy ? (
                                                <p className="auth-form__intro-copy">{activeConfig.form.introCopy}</p>
                                            ) : null}
                                        </div>
                                        {activeConfig.form.introBadge ? (
                                            <span className="auth-form__intro-badge">{activeConfig.form.introBadge}</span>
                                        ) : null}
                                    </div>
                                ) : null}

                                <div className="auth-form__body">
                                    {mode === "signin" ? (
                                            <form className="auth-form__grid auth-anim auth-anim--enter" onSubmit={handleSignIn}>
                                                <AuthTextField
                                                    autoComplete="email"
                                                    hideErrorText
                                                    icon={<MailOutlined />}
                                                    id="signin-email"
                                                    label="Work email"
                                                    placeholder="name@company.com"
                                                    type="email"
                                                    value={signInValues.email}
                                                    error={signInErrors.email}
                                                    onChange={(event) =>
                                                        setSignInValues((prev) => ({ ...prev, email: event.target.value }))
                                                    }
                                                />

                                                <AuthTextField
                                                    autoComplete="current-password"
                                                    icon={<LockOutlined />}
                                                    id="signin-password"
                                                    label="Password"
                                                    placeholder="Enter your password"
                                                    type={showPassword ? "text" : "password"}
                                                    value={signInValues.password}
                                                    error={signInErrors.password}
                                                    rightAdornment={
                                                        <button
                                                            type="button"
                                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                                            className="cursor-pointer border-0 bg-transparent p-0 text-slate-400 transition hover:text-slate-700"
                                                            onClick={() => setShowPassword((prev) => !prev)}
                                                        >
                                                            {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                                                        </button>
                                                    }
                                                    onChange={(event) =>
                                                        setSignInValues((prev) => ({ ...prev, password: event.target.value }))
                                                    }
                                                />

                                                <div className="auth-form__inline-row">
                                                    <label className="auth-form__remember">
                                                        <input
                                                            checked={rememberMe}
                                                            type="checkbox"
                                                            onChange={(event) => setRememberMe(event.target.checked)}
                                                        />
                                                        <span>Remember me</span>
                                                    </label>

                                                    <button
                                                        type="button"
                                                        className="auth-form__text-button"
                                                        onClick={() => undefined}
                                                    >
                                                        Forgot password?
                                                    </button>
                                                </div>

                                                <button className="auth-form__submit" disabled={isSubmitting} type="submit">
                                                    {isSubmitting ? (
                                                        <>
                                                            <span className="auth-form__submit-spinner" />
                                                            Authenticating...
                                                        </>
                                                    ) : (
                                                        <>
                                                            {activeConfig.form.cta}
                                                            <ArrowRightOutlined />
                                                        </>
                                                    )}
                                                </button>
                                            </form>
                                        ) : (
                                            <form className="auth-form__grid auth-anim auth-anim--enter" onSubmit={handleSignUp}>
                                                <div className="auth-form__grid">
                                                    <AuthTextField
                                                        autoComplete="organization"
                                                        icon={<BankOutlined />}
                                                        id="signup-company"
                                                        label="Company"
                                                        placeholder="Acme Mining Pvt. Ltd."
                                                        type="text"
                                                        value={signUpValues.company}
                                                        error={signUpErrors.company}
                                                        onChange={(event) =>
                                                            setSignUpValues((prev) => ({
                                                                ...prev,
                                                                company: event.target.value,
                                                            }))
                                                        }
                                                    />

                                                    <AuthTextField
                                                        autoComplete="name"
                                                        icon={<UserOutlined />}
                                                        id="signup-name"
                                                        label="Full name"
                                                        placeholder="Your full name"
                                                        type="text"
                                                        value={signUpValues.name}
                                                        error={signUpErrors.name}
                                                        onChange={(event) =>
                                                            setSignUpValues((prev) => ({ ...prev, name: event.target.value }))
                                                        }
                                                    />

                                                    <AuthTextField
                                                        autoComplete="email"
                                                        icon={<MailOutlined />}
                                                        id="signup-email"
                                                        label="Official email"
                                                        placeholder="name@company.com"
                                                        type="email"
                                                        value={signUpValues.email}
                                                        error={signUpErrors.email}
                                                        onChange={(event) =>
                                                            setSignUpValues((prev) => ({ ...prev, email: event.target.value }))
                                                        }
                                                    />

                                                    <AuthTextField
                                                        autoComplete="new-password"
                                                        icon={<LockOutlined />}
                                                        id="signup-password"
                                                        label="Password"
                                                        placeholder="Create a secure password"
                                                        type={showSignUpPassword ? "text" : "password"}
                                                        value={signUpValues.password}
                                                        error={signUpErrors.password}
                                                        rightAdornment={
                                                            <button
                                                                type="button"
                                                                aria-label={showSignUpPassword ? "Hide password" : "Show password"}
                                                                className="cursor-pointer border-0 bg-transparent p-0 text-slate-400 transition hover:text-slate-700"
                                                                onClick={() => setShowSignUpPassword((prev) => !prev)}
                                                            >
                                                                {showSignUpPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                                                            </button>
                                                        }
                                                        onChange={(event) =>
                                                            setSignUpValues((prev) => ({
                                                                ...prev,
                                                                password: event.target.value,
                                                            }))
                                                        }
                                                    />

                                                    <AuthTextField
                                                        autoComplete="new-password"
                                                        icon={<LockOutlined />}
                                                        id="signup-confirm-password"
                                                        label="Confirm password"
                                                        placeholder="Re-enter your password"
                                                        type={showConfirmPassword ? "text" : "password"}
                                                        value={signUpValues.confirmPassword}
                                                        error={signUpErrors.confirmPassword}
                                                        rightAdornment={
                                                            <button
                                                                type="button"
                                                                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                                                className="cursor-pointer border-0 bg-transparent p-0 text-slate-400 transition hover:text-slate-700"
                                                                onClick={() => setShowConfirmPassword((prev) => !prev)}
                                                            >
                                                                {showConfirmPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                                                            </button>
                                                        }
                                                        onChange={(event) =>
                                                            setSignUpValues((prev) => ({
                                                                ...prev,
                                                                confirmPassword: event.target.value,
                                                            }))
                                                        }
                                                    />
                                                </div>

                                                <div className="auth-form__strength">
                                                    <AuthPasswordStrength password={signUpValues.password} />
                                                </div>

                                                <div className="auth-form__checkbox-row">
                                                    <label className="auth-form__check">
                                                        <input
                                                            checked={termsAccepted}
                                                            type="checkbox"
                                                            onChange={(event) => setTermsAccepted(event.target.checked)}
                                                        />
                                                        <span>
                                                            I agree to the{" "}
                                                            <button
                                                                type="button"
                                                                className="auth-form__check-link"
                                                                onClick={() => setShowTerms(true)}
                                                            >
                                                                Terms & Conditions
                                                            </button>{" "}
                                                            and understand that access is governed by my organization&apos;s security
                                                            policies.
                                                        </span>
                                                    </label>
                                                </div>

                                                <button className="auth-form__submit" disabled={isSubmitting} type="submit">
                                                    {isSubmitting ? (
                                                        <>
                                                            <span className="auth-form__submit-spinner" />
                                                            Creating workspace...
                                                        </>
                                                    ) : (
                                                        <>
                                                            {activeConfig.form.cta}
                                                            <ArrowRightOutlined />
                                                        </>
                                                    )}
                                                </button>
                                            </form>
                                        )}
                                </div>

                                <div className="auth-form__footer">
                                    <div className="auth-form__divider">
                                        <span>Enterprise SSO</span>
                                    </div>
                                    {socialButtons}
                                    <p className="auth-form__switch">
                                        {mode === "signin" ? "Need a workspace?" : "Already onboarded?"}{" "}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMode(mode === "signin" ? "signup" : "signin");
                                                setBanner(null);
                                                setSignInErrors({});
                                                setSignUpErrors({});
                                            }}
                                        >
                                            {mode === "signin" ? "Create an account" : "Sign in"}
                                        </button>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            {showTerms ? (
                    <div className="auth-modal auth-anim auth-anim--fade">
                        <div className="auth-modal__card auth-anim auth-anim--modal">
                            <div className="auth-modal__header">
                                <div>
                                    <p className="auth-shell__eyebrow">Governance</p>
                                    <h3 className="auth-modal__title">Authentication terms</h3>
                                </div>
                                <button type="button" className="auth-modal__close" onClick={() => setShowTerms(false)}>
                                    <CloseOutlined />
                                </button>
                            </div>
                            <div className="auth-modal__body">
                                <TermsAndConditionsContent />
                            </div>
                        </div>
                    </div>
                ) : null}

            <ToastNotify />
        </div>
    );
}
