import React, { useEffect, useState } from "react";
import "../styles/sign-in.css";
import { useNavigate } from "react-router-dom";
import { db } from "../Utils/dataStorege.ts";
import { ToastContainer } from "react-toastify";
import { notify } from "../Utils/ToastNotify.tsx";
import { v4 as uuidv4 } from "uuid";
import { Form, Input, Button, Select, Row, Col, Modal } from "antd";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { GoogleOutlined, AppleOutlined, EyeInvisibleOutlined, EyeOutlined } from "@ant-design/icons";

const { Option } = Select;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const ZIP_REGEX = /^(\d{6}|\d{5}(-\d{4})?)$/;

const normalizeTaxId = (value?: string) => (value || "").toUpperCase().replace(/\s+/g, "").trim();

const sanitizePanInput = (value?: string) => {
    const cleaned = (value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
    let output = "";
    for (const ch of cleaned) {
        const idx = output.length;
        const needsLetter = idx < 5 || idx === 9;
        const needsDigit = idx >= 5 && idx <= 8;
        if (needsLetter && /[A-Z]/.test(ch)) output += ch;
        if (needsDigit && /[0-9]/.test(ch)) output += ch;
        if (output.length === 10) break;
    }
    return output;
};

const sanitizeGstinInput = (value?: string) => {
    const cleaned = (value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
    const rules = [
        /[0-9]/, /[0-9]/,
        /[A-Z]/, /[A-Z]/, /[A-Z]/, /[A-Z]/, /[A-Z]/,
        /[0-9]/, /[0-9]/, /[0-9]/, /[0-9]/,
        /[A-Z]/,
        /[1-9A-Z]/,
        /Z/,
        /[0-9A-Z]/,
    ];
    let output = "";
    for (const ch of cleaned) {
        const idx = output.length;
        if (idx >= rules.length) break;
        if (rules[idx].test(ch)) output += ch;
    }
    return output;
};

const sanitizeZipInput = (value?: string) => {
    const cleaned = (value || "").replace(/[^\d-]/g, "").slice(0, 10);
    const firstHyphenIndex = cleaned.indexOf("-");
    if (firstHyphenIndex === -1) return cleaned;
    const before = cleaned.slice(0, firstHyphenIndex).replace(/-/g, "");
    const after = cleaned.slice(firstHyphenIndex + 1).replace(/-/g, "");
    return `${before}-${after}`;
};

const normalizeWebsiteUrl = (value?: string) => {
    const raw = String(value ?? "")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .trim()
        .replace(/\s+/g, "");
    if (!raw) return null;

    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
        const url = new URL(normalized);
        const isHttp = url.protocol === "http:" || url.protocol === "https:";
        const hasValidDomain = url.hostname.includes(".") && !/\s/.test(url.hostname);
        return isHttp && hasValidDomain ? url.toString() : null;
    } catch {
        const fallback = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}([/?#].*)?$/i.test(raw);
        if (!fallback) return null;
        return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    }
};

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
    const [currentStep, setCurrentStep] = useState(0);
    const [form] = Form.useForm();

    const stepFieldNames = [
        ["company", "companyType", "industry", "website", "pan", "gstin", "cin", "incorpDate", "employeeCount"],
        ["country", "state", "city", "address1", "zip"],
        ["name", "designation", "email", "mobile", "password", "confirmPassword"],
    ];

    const handleNext = async () => {
        try {
            await form.validateFields(stepFieldNames[currentStep]);
            setCurrentStep((prev) => prev + 1);
        } catch (_err) {
            notify.error("Please fill in all required fields correctly.");
        }
    };

    useEffect(() => {
        if (currentStep !== 2) return;

        const names = stepFieldNames[2];
        const t = setTimeout(() => {
            form.setFields(
                names.map((name) => ({
                    name,
                    touched: false,
                    validating: false,
                    errors: [],
                    warnings: [],
                }))
            );
        }, 0);

        return () => clearTimeout(t);
    }, [currentStep, form]);


    const handlePrev = () => setCurrentStep((prev) => prev - 1);

    const handleFinish = async (values: any) => {
        try {
            const allValues = { ...form.getFieldsValue(true), ...values };
            const websiteValue = allValues.website ?? form.getFieldValue("website");
            const normalizedPan = normalizeTaxId(allValues.pan);
            const normalizedGstin = normalizeTaxId(allValues.gstin);
            const normalizedWebsite = normalizeWebsiteUrl(websiteValue);

            if (normalizedPan && !PAN_REGEX.test(normalizedPan)) {
                throw new Error("Invalid PAN format. Please enter PAN like ABCDE1234F.");
            }
            if (normalizedGstin && !GSTIN_REGEX.test(normalizedGstin)) {
                throw new Error("Invalid GSTIN format. Please enter a valid 15-character GSTIN.");
            }
            if (!normalizedWebsite) {
                throw new Error("Invalid website URL. Please enter a valid company website.");
            }
            if (normalizedPan && normalizedGstin && normalizedGstin.slice(2, 12) !== normalizedPan) {
                throw new Error("GSTIN PAN segment must match the entered PAN.");
            }

            const allUsers = await db.getUsers();
            const existingUserByEmail = (allUsers || []).find(
                (u: any) => String(u?.email || "").trim().toLowerCase() === String(allValues?.email || "").trim().toLowerCase()
            );

            const orgId = existingUserByEmail?.orgId || uuidv4();
            const nowIso = new Date().toISOString();
            const cleanAddress1 = String(allValues.address1 || "").trim();
            const cleanAddress2 = String(allValues.address2 || "").trim();
            const mergedAddress = `${cleanAddress1} ${cleanAddress2}`.trim();
            const normalizedMobile = allValues.mobile?.startsWith("+") ? allValues.mobile : `+${allValues.mobile}`;
            const userGuiId = existingUserByEmail?.guiId || uuidv4();
            const resolvedCompanyType = String(allValues.companyType || allValues.industry || "").trim();
            const resolvedIndustry = String(allValues.industry || "").trim();
            const resolvedCity = String(allValues.city || "").trim();
            const resolvedState = String(allValues.state || "").trim();
            const resolvedCountry = String(allValues.country || "").trim();
            const resolvedZip = String(allValues.zip || "").trim();
            const resolvedCompany = String(allValues.company || "").trim();

            const companyPayload = {
                id: existingUserByEmail ? undefined : Date.now(),
                guiId: orgId,
                name: resolvedCompany,
                company: resolvedCompany,
                industry: resolvedIndustry,
                industryType: resolvedIndustry,
                companyType: resolvedCompanyType,
                website: normalizedWebsite,
                pan: normalizedPan,
                gstin: normalizedGstin,
                cin: allValues.cin || "",
                incorpDate: allValues.incorpDate || "",
                employeeCount: allValues.employeeCount || "",
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
                designation: allValues.designation,
                mobile: normalizedMobile,
                email: allValues.email,
                whatsapp: normalizedMobile,
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
                website: normalizedWebsite,
                pan: normalizedPan,
                gstin: normalizedGstin,
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

    const steps = [
        {
            title: "Company Info",
            content: (
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="company" label="Company Name" rules={[{ required: true }]}>
                            <Input className="mb-10" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="companyType"
                            label="Company Type"
                            rules={[{ required: true, message: "Company type is required" }]}
                        >
                            <Select placeholder="Select company type">
                                <Select.Option value="Mining">Mining</Select.Option>
                                <Select.Option value="Construction">Construction</Select.Option>
                                <Select.Option value="Equipment Supplier">Equipment Supplier</Select.Option>
                            </Select>
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item name="industry" label="Industry Type">
                            <Input className="mb-10" />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item
                            name="website"
                            label="Company Website"
                            validateTrigger={["onBlur", "onSubmit"]}
                            rules={[
                                { required: true, message: "Company website is required" },
                                {
                                    validator: (_, value) => {
                                        if (normalizeWebsiteUrl(value)) return Promise.resolve();
                                        return Promise.reject(new Error("Enter a valid URL (e.g. https://example.com)."));
                                    },
                                },
                            ]}
                        >
                            <Input className="mb-10" placeholder="https://example.com" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="pan"
                            label="PAN"
                            validateTrigger={["onChange", "onBlur"]}
                            rules={[
                                {
                                    validator: (_, value) => {
                                        const pan = normalizeTaxId(value);
                                        if (!pan || PAN_REGEX.test(pan)) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error("Enter a valid PAN (e.g. ABCDE1234F)."));
                                    },
                                },
                            ]}
                        >
                            <Input
                                className="mb-10"
                                maxLength={10}
                                placeholder="ABCDE1234F"
                                onChange={(e) => form.setFieldsValue({ pan: sanitizePanInput(e.target.value) })}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="gstin"
                            label="GSTIN"
                            dependencies={["pan"]}
                            validateTrigger={["onChange", "onBlur"]}
                            rules={[
                                {
                                    validator: (_, value) => {
                                        const gstin = normalizeTaxId(value);
                                        if (!gstin) {
                                            return Promise.resolve();
                                        }
                                        if (!GSTIN_REGEX.test(gstin)) {
                                            return Promise.reject(new Error("Enter a valid GSTIN (15 characters)."));
                                        }
                                        const pan = normalizeTaxId(form.getFieldValue("pan"));
                                        if (pan && gstin.slice(2, 12) !== pan) {
                                            return Promise.reject(new Error("GSTIN PAN segment must match the entered PAN."));
                                        }
                                        return Promise.resolve();
                                    },
                                },
                            ]}
                        >
                            <Input
                                className="mb-10"
                                maxLength={15}
                                placeholder="22ABCDE1234F1Z5"
                                onChange={(e) => form.setFieldsValue({ gstin: sanitizeGstinInput(e.target.value) })}
                            />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item name="cin" label="CIN / Registration Number">
                            <Input className="mb-10" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="incorpDate" label="Date of Incorporation">
                            <Input type="date" />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item
                            name="employeeCount"
                            label="Number of Employees"
                        >
                            <Select
                                placeholder="Select"
                                allowClear
                            >
                                <Select.Option value="1-10">1-10</Select.Option>
                                <Select.Option value="11-50">11-50</Select.Option>
                                <Select.Option value="51-200">51-200</Select.Option>
                                <Select.Option value=">200">200+</Select.Option>
                            </Select>
                        </Form.Item>
                    </Col>

                </Row>
            ),
        },
        {
            title: "Business Address",
            content: (
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="country" label="Country" rules={[{ required: true }]}>
                            <Input className="mb-10" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="state" label="State / Province" rules={[{ required: true }]}>
                            <Input className="mb-10" />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item name="city" label="City" rules={[{ required: true }]}>
                            <Input className="mb-10" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="address1" label="Address Line 1" rules={[{ required: true }]}>
                            <Input className="mb-10" />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item name="address2" label="Address Line 2">
                            <Input className="mb-10" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="zip"
                            label="Postal / ZIP Code"
                            validateTrigger={["onChange", "onBlur"]}
                            rules={[
                                { required: true, message: "Postal / ZIP Code is required" },
                                {
                                    validator: (_, value) => {
                                        const zip = (value || "").trim();
                                        if (!zip || ZIP_REGEX.test(zip)) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error("Enter a valid ZIP code (e.g. 560001, 12345, or 12345-6789)."));
                                    },
                                },
                            ]}
                        >
                            <Input
                                className="mb-10"
                                maxLength={10}
                                placeholder="560001 / 12345 / 12345-6789"
                                onChange={(e) => form.setFieldsValue({ zip: sanitizeZipInput(e.target.value) })}
                            />
                        </Form.Item>
                    </Col>
                </Row>
            ),
        },
        {
            title: "Authorized Representative",
            content: (
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
                            <Input className="mb-10" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="designation" label="Designation" rules={[{ required: true }]}>
                            <Select placeholder="Select Designation">
                                <Option value="Mining Engineer">Mining Engineer</Option>
                                <Option value="Geologist">Geologist</Option>
                                <Option value="Operations Manager">Operations Manager</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="email" label="Official Email" rules={[{ required: true, type: "email" }]}>
                            <Input className="mb-10" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="mobile" label="Mobile Number" rules={[{ required: true }]}>
                            <PhoneInput
                                country={"in"}
                                value={form.getFieldValue("mobile")}
                                inputStyle={{ width: "100%" }}
                                specialLabel={""}
                                onChange={(phone: string) => form.setFieldsValue({ mobile: `+${phone}` })}
                            />
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
            ),
        },
    ];

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
                navigate(isProfileComplete ? "/knowledge-center" : "/profile");
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

    useEffect(() => {
        const fieldsToClear = stepFieldNames.flat().map((name) => ({ name, errors: [] as string[] }));
        form.setFields(fieldsToClear);
    }, [currentStep, form]);

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
                            <div className="step-header">
                                <div className="step-title">
                                    <span className="step-label">{steps[currentStep].title}</span>
                                </div>
                                <div className="step-lines">
                                    {steps.map((_, idx) => (
                                        <div
                                            key={idx}
                                            className={`step-line ${idx === currentStep ? "active" : ""} ${idx < currentStep ? "completed" : ""
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="form-section">
                                <Form layout="vertical" form={form} onFinish={handleFinish} validateTrigger="onSubmit">
                                    <div key={currentStep}>
                                        {steps[currentStep].content}
                                    </div>

                                    <div className="form-actions">
                                        {currentStep > 0 && <Button htmlType="button" onClick={handlePrev}>Prev</Button>}
                                        {currentStep < steps.length - 1 ? (
                                            <Button type="primary" htmlType="button" onClick={handleNext}>
                                                Next
                                            </Button>
                                        ) : (
                                            <Button type="primary" htmlType="submit">
                                                Submit
                                            </Button>
                                        )}
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
