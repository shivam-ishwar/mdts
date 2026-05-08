import React, { useEffect, useState } from "react";
import "../styles/sign-in.css";
import { useNavigate } from "react-router-dom";
import { db } from "../Utils/dataStorege.ts";
import { ToastContainer } from "react-toastify";
import { notify } from "../Utils/ToastNotify.tsx";
import { v4 as uuidv4 } from "uuid";
import { Form, Input, Button, Row, Col, Modal } from "antd";
import { GoogleOutlined, AppleOutlined, EyeInvisibleOutlined, EyeOutlined } from "@ant-design/icons";
const TermsAndConditionsContent: React.FC = () => (
    <div>
        <h3>Terms & Conditions for Mining Management Tracking System</h3>
        <p>
            Welcome to our Mining Management Tracking System. By signing in or signing
            up, you agree to comply with and be bound by the following terms and
            conditions of use. Please review them carefully.
        </p>

        <h4>1. System Usage</h4>
        <p>
            The system is provided solely for the purpose of managing, tracking, and
            optimizing mining operations, including resource allocation, activity
            logging, and compliance reporting. Any unauthorized use or misuse of the
            platform is strictly prohibited.
        </p>

        <h4>2. Data Privacy</h4>
        <p>
            All operational data, including location, personnel, and production
            metrics, submitted to the system will be kept confidential and used only
            for internal management, system improvement, and regulatory compliance as
            required by law. We employ industry-standard security measures to protect
            your data.
        </p>

        <h4>3. User Responsibility</h4>
        <p>
            You are responsible for maintaining the confidentiality of your account
            password and for all activities that occur under your account. You agree
            to immediately notify us of any unauthorized use of your password or
            account or any other breach of security.
        </p>

        <h4>4. Limitation of Liability</h4>
        <p>
            The company is not liable for any direct, indirect, incidental, special,
            consequential, or exemplary damages, including but not limited to damages
            for loss of profits, goodwill, data, or other intangible losses resulting
            from the use or the inability to use the system.
        </p>

        <p>
            <strong>
                This is a brief summary. The full terms can be requested from the
                support team.
            </strong>
        </p>
    </div>
);

const SignInSignUp: React.FC = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const navigate = useNavigate();
    const [form] = Form.useForm();

    const handleFinish = async (values: any) => {
        try {
            const allValues = { ...form.getFieldsValue(true), ...values };

            const allUsers = await db.getUsers();
            const existingUserByEmail = (allUsers || []).find(
                (u: any) => String(u?.email || "").trim().toLowerCase() === String(allValues?.email || "").trim().toLowerCase()
            );

            const orgId = existingUserByEmail?.orgId || uuidv4();
            const nowIso = new Date().toISOString();
            const cleanAddress1 = "";
            const cleanAddress2 = "";
            const mergedAddress = `${cleanAddress1} ${cleanAddress2}`.trim();
            const userGuiId = existingUserByEmail?.guiId || uuidv4();
            const resolvedCompanyType = "";
            const resolvedIndustry = "";
            const resolvedCity = "";
            const resolvedState = "";
            const resolvedCountry = "";
            const resolvedZip = "";
            const resolvedCompany = String(allValues.company || "").trim();

            const companyPayload = {
                id: existingUserByEmail ? undefined : Date.now(),
                guiId: orgId,
                name: resolvedCompany,
                company: resolvedCompany,
                industry: resolvedIndustry,
                industryType: resolvedIndustry,
                companyType: resolvedCompanyType,
                website: "",
                pan: "",
                gstin: "",
                cin: "",
                incorpDate: "",
                employeeCount: "",
                address1: cleanAddress1,
                address2: cleanAddress2,
                address: mergedAddress,
                city: resolvedCity,
                state: resolvedState,
                country: resolvedCountry,
                zip: resolvedZip,
                zipCode: resolvedZip,
                registeredOn: nowIso,
                companyLogo: "",
            };

            const existingCompany = await db.getCompanyByGuiId(orgId);
            if (!existingCompany) {
                await db.addCompany(companyPayload);
            } else {
                await db.updateCompany(existingCompany.id, {
                    ...existingCompany,
                    ...companyPayload,
                    id: existingCompany.id,
                });
            }

            const newUser = {
                ...allValues,
                id: existingUserByEmail?.id ?? Date.now() + 1,
                guiId: userGuiId,
                name: allValues.name,
                company: resolvedCompany,
                designation: existingUserByEmail?.designation ?? "",
                mobile: existingUserByEmail?.mobile ?? "",
                email: allValues.email,
                whatsapp: existingUserByEmail?.whatsapp ?? existingUserByEmail?.mobile ?? "",
                address1: cleanAddress1,
                address2: cleanAddress2,
                address: mergedAddress,
                city: resolvedCity,
                state: resolvedState,
                country: resolvedCountry,
                zip: resolvedZip,
                zipCode: resolvedZip,
                password: allValues.password,
                Password: allValues.password,
                isTempPassword: false,
                role: "admin",
                userType: "IND",
                orgId,
                companyType: resolvedCompanyType,
                industryType: resolvedIndustry,
                website: "",
                pan: "",
                gstin: "",
                companyLogo: existingUserByEmail?.companyLogo || "",
                registeredOn: nowIso,
            };

            if (existingUserByEmail?.id != null) {
                await db.updateUsers(existingUserByEmail.id, {
                    ...existingUserByEmail,
                    ...newUser,
                    id: existingUserByEmail.id,
                });
            } else {
                await db.addUsers(newUser);
            }
            localStorage.setItem("user", JSON.stringify(newUser));
            notify.success("Registration successful!");
            setTimeout(() => navigate("/profile"), 1000);
        } catch (e: any) {
            notify.error(e?.message || "Registration failed. Please try again.");
        }
    };

    const signupFormContent = (
        <Row gutter={[16, 0]}>
            <Col span={24}>
                <Form.Item name="company" label="Company Name" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item name="email" label="Official Email" rules={[{ required: true, type: "email" }]}>
                    <Input />
                </Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item
                    name="password"
                    label="Password"
                    rules={[
                        {
                            required: true,
                            pattern: /^(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/,
                            message:
                                "Password must contain at least 1 uppercase, 1 digit, 1 special character, and be 8+ characters",
                        },
                    ]}
                >
                    <Input type="password" />
                </Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item
                    name="confirmPassword"
                    label="Confirm Password"
                    dependencies={["password"]}
                    rules={[
                        {
                            required: true,
                            validator(_, value) {
                                if (!value || value === form.getFieldValue("password")) {
                                    return Promise.resolve();
                                }
                                return Promise.reject("Passwords do not match");
                            },
                        },
                    ]}
                >
                    <Input type="password" />
                </Form.Item>
            </Col>
        </Row>
    );

    const isProfileCompleted = (user: any) => {
        return (
            user.name &&
            user.company &&
            user.mobile &&
            user.designation &&
            user.email &&
            user.whatsapp &&
            user.profilePhoto &&
            user.Password
        );
    };

    const handleLogin = async (e: React.MouseEvent) => {
        e.preventDefault();

        if (!termsAccepted) {
            return notify.error("You must accept the Terms to log in.");
        }

        try {
            validateEmail(email);

            const users = await db.getUsers();
            const user = users.find(
                (user: any) => user.email === email && (user.password === password || user.Password === password)
            );

            if (!user) {
                return notify.error("Invalid email or password. Please try again.");
            }

            localStorage.setItem("user", JSON.stringify(user));
            notify.success("Login Successful!");

            const isProfileComplete = isProfileCompleted(user);
            setTimeout(() => {
                navigate(isProfileComplete ? "/workspace-home" : "/profile");
            }, 1000);
        } catch (error: any) {
            if (error.message === "Invalid email format") {
                notify.error("Please enter a valid email address.");
            } else {
                notify.error("An unexpected error occurred during login.");
                console.error(error);
            }
        }
    };

    const validateEmail = (email: string) => {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            throw new Error("Invalid email format");
        }
    };

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const openTermsModal = (e: React.MouseEvent) => {
        e.preventDefault();
        setShowTermsModal(true);
    };

    const handleCloseTermsModal = () => {
        setShowTermsModal(false);
    };

    return (
        <div className="signup-container">
            <Modal
                title="Terms & Conditions"
                open={showTermsModal}
                onCancel={handleCloseTermsModal}
                footer={[
                    <Button key="close" type="primary" onClick={handleCloseTermsModal}>
                        Close
                    </Button>,
                ]}
                width={700}
            >
                <TermsAndConditionsContent />
            </Modal>

            <div className={isSignUp ? "signup-left signup-adjust" : "signup-left signin-adjust"}>
                <div className="vector-image">
                    <img src="/images/auths/signin.png" alt="Mining Management Illustration" />
                </div>

                <div className="promo-text">
                    <h1>Mining Simplified, Productivity Amplified</h1>
                    <p>
                        Manage your mining operations with confidence. Track activities, assign teams, and gain
                        insights — all in one platform built for mining professionals.
                    </p>
                </div>

                <div className="footer-links">
                    <div className="language">
                        <img src="https://flagcdn.com/us.svg" alt="US Flag" width="20" />
                        <span>English</span>
                    </div>
                    <div className="links">
                        <a href="#">Terms</a>
                        <a href="#">Plans</a>
                        <a href="#">Contact Us</a>
                    </div>
                </div>
            </div>

            <div className={isSignUp ? "signup-right signup-adjust" : "signup-right signin-adjust"}>
                <div className="form-card">
                    <h2>{isSignUp ? "Sign up to get started" : "Sign in to continue"}</h2>

                    {!isSignUp ? (
                        <form onSubmit={(e) => e.preventDefault()}>
                            <input
                                className="mb-20"
                                type="email"
                                placeholder="Email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <div className="password-field">
                                <input
                                    className="mb-20"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />

                                <span
                                    className="eye-toggle"
                                    onClick={() => setShowPassword((p) => !p)}
                                    role="button"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                                </span>
                            </div>

                            <div className="forgot-password-row">
                                <a href="#" onClick={(e) => e.preventDefault()}>
                                    Forgot password?
                                </a>
                            </div>

                            <div className="checkbox">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    checked={termsAccepted}
                                    onChange={(e) => setTermsAccepted(e.target.checked)}
                                />
                                <label htmlFor="terms">
                                    I accept the <a href="#" onClick={openTermsModal}>Term</a>
                                </label>
                            </div>
                            <button className="submit" onClick={handleLogin} disabled={!termsAccepted}>
                                Login
                            </button>
                        </form>
                    ) : (
                        <div className="form-body">
                            <div className="form-section">
                                <Form layout="vertical" form={form} onFinish={handleFinish} validateTrigger="onSubmit">
                                    {signupFormContent}

                                    <div className="form-actions">
                                        <Button type="primary" htmlType="submit">
                                            Sign up
                                        </Button>
                                    </div>
                                </Form>
                            </div>
                        </div>
                    )}

                    <div className="social-buttons">
                        <Button className="google" icon={<GoogleOutlined />}>
                            Sign In with Google
                        </Button>
                        <Button className="apple" icon={<AppleOutlined />}>
                            Sign In with Apple
                        </Button>
                    </div>

                    <div className="switch-auth">
                        {isSignUp ? (
                            <p className="signin-link">
                                Already have an account? <a onClick={() => setIsSignUp(false)}>Sign In</a>
                            </p>
                        ) : (
                            <p className="signin-link">
                                New here? ? <a onClick={() => setIsSignUp(true)}>Sign up</a>
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <ToastContainer />
        </div>
    );
};

export default SignInSignUp;
