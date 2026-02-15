import { useEffect, useState } from "react";
import "../styles/profile.css";
import { Form, Input, Button, Row, Col, Select, Modal, Tooltip } from "antd";
import ManageUser from "../Components/ManageUser";
import { CameraOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { db } from "../Utils/dataStorege.ts";
import { getCurrentUser, getCurrentUserId } from "../Utils/moduleStorage";
import { userStore } from "../Utils/UserStore.ts";
import { ToastContainer } from "react-toastify";
import { notify } from "../Utils/ToastNotify.tsx";
import { v4 as uuidv4 } from "uuid";
import "react-phone-input-2/lib/style.css";
import PhoneInput from "react-phone-input-2";
import { hasPermission } from "../Utils/auth.ts";
const { Option } = Select;

const Profile = () => {
    const [formData, setFormData] = useState<any>({
        id: null as number | null,
        name: null as string | null,
        guiId: null as string | null,
        company: null as string | null,
        designation: null as string | null,
        companyType: null as string | null,
        industryType: null as string | null,
        mobile: null as string | null,
        email: null as string | null,
        whatsapp: null as string | null,
        registeredOn: null as string | null,
        profilePhoto: null as string | null,
        companyLogo: null as string | null,
        password: null as string | null,
        isTempPassword: null as boolean | null,
        role: null as string | null,
        address: null as string | null,
        city: null as string | null,
        state: null as string | null,
        country: null as string | null,
        zipCode: null as string | null,
        orgId: null as string | null,
        assignedModules: [] as {
            moduleCode: string | null;
            moduleName: string | null;
            isApplicableOnModule: boolean | null;
            responsibilitiesOnActivities: {
                activityCode: string | null;
                activityName: string | null;
                responsibilities: string[];
            }[];
        }[],
    });

    const [selectedTab, setSelectedTab] = useState("Profile Information");
    const [image, setImage] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [password, setPassword] = useState("");

    useEffect(() => {
        fillUsersData();
    }, []);

    useEffect(() => {
        if (formData.id) {
            const storedImage = formData.profilePhoto;
            if (storedImage) setImage(storedImage);
        }
    }, [formData.id]);

    const fillUsersData = async () => {
        const currentUserId = getCurrentUserId();
        const currentUser = getCurrentUser();
        let userData = currentUserId ? await db.getUserById(currentUserId) : null;

        if (!userData && currentUser?.email) {
            const allUsers = await db.getUsers();
            userData = (allUsers || []).find(
                (u: any) => String(u?.email || "").trim().toLowerCase() === String(currentUser.email || "").trim().toLowerCase()
            ) || null;
        }

        if (userData) {
            const companyData = userData?.orgId ? await db.getCompanyByGuiId(String(userData.orgId)) : null;
            const addressLine1 = userData?.address1 ?? companyData?.address1 ?? "";
            const addressLine2 = userData?.address2 ?? companyData?.address2 ?? "";
            const mergedAddress = String(userData?.address ?? `${addressLine1} ${addressLine2}`.trim() ?? "").trim();

            setFormData({
                id: userData.id || "",
                name: userData.name || "",
                guiId: userData.guiId || "",
                company: userData.company || companyData?.name || companyData?.company || "",
                designation: userData.designation || "",
                companyType: userData.companyType || companyData?.companyType || "",
                industryType: userData.industryType || companyData?.industryType || "",
                mobile: userData.mobile || "",
                email: userData.email || "",
                whatsapp: userData.whatsapp || "",
                registeredOn: userData.registeredOn || "",
                profilePhoto: userData.profilePhoto || "",
                companyLogo: userData.companyLogo || "",
                address: mergedAddress,
                city: userData.city || companyData?.city || "",
                state: userData.state || companyData?.state || "",
                country: userData.country || companyData?.country || "",
                zipCode: userData.zipCode || userData.zip || companyData?.zipCode || "",
                role: userData.role || "",
                isTempPassword: userData.isTempPassword,
                Password: userData.Password || "",
                orgId: userData.orgId || companyData?.guiId || "",
            });
            form.resetFields();
        }
    };

    const isProfileCompleted = () => {
        return (
            formData.name &&
            formData.company &&
            formData.designation &&
            formData.mobile &&
            formData.email &&
            formData.whatsapp &&
            formData.registeredOn &&
            formData.role &&
            formData.profilePhoto
        );
    };

    const handleInputChange = (e: any) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (value: any, name: any) => {
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        const currentUser = getCurrentUser();

        if (!currentUser?.email) {
            notify.error("No user found. Please log in again.");
            return;
        }

        if (currentUser.isTempPassword) {
            setIsModalOpen(true);
            return;
        }

        await proceedProfileSave(currentUser);
    };

    function getInitials(name?: string): string {
        if (!name) return "";
        const parts = name.trim().split(/\s+/);
        return parts.length > 1
            ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
            : parts[0][0]?.toUpperCase() || "";
    }

    const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = event.target.files?.[0];
            if (!file) {
                notify.error("No file selected.");
                return;
            }

            const reader = new FileReader();
            reader.onload = async (e) => {
                if (!e.target?.result) {
                    notify.error("Error reading file.");
                    return;
                }

                const base64Image = e.target.result as string;
                setImage(base64Image);

                const currentUserId = getCurrentUserId();
                const activeUser = await db.getUserById(currentUserId);
                if (!activeUser) {
                    notify.error("User not found.");
                    return;
                }

                const updatedUser = { ...activeUser, profilePhoto: base64Image };
                await db.updateUsers(currentUserId, updatedUser);

                const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
                const updatedLocalUser = { ...currentUser, profilePhoto: base64Image };
                localStorage.setItem("user", JSON.stringify(updatedLocalUser));
                userStore.setUser(updatedLocalUser);

                notify.success("Profile photo updated successfully!");
                setIsModalOpen(false);
            };

            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Error updating profile photo:", error);
            notify.error("Something went wrong. Please try again.");
        }
    };

    const showModal = () => {
        setIsModalOpen(true);
    };

    const handleCancel = () => {
        setIsModalOpen(false);
        form.resetFields();
    };

    const handlePasswordUpdate = async (values: any) => {
        const currentUser = getCurrentUser();

        if (values.oldPassword === currentUser.Password) {
            const updatedUser = {
                ...currentUser,
                password: values.newPassword,
                isTempPassword: false,
            };

            await db.updateUsers(currentUser.id, updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));
            userStore.setUser(updatedUser);

            await proceedProfileSave(updatedUser);

            setIsModalOpen(false);
        } else {
            notify.error("Current password is incorrect");
        }
    };

    const proceedProfileSave = async (currentUser: any) => {
        try {
            const users = await db.getUsers();
            const existingUser = users.find((u) => u.id === currentUser.id);

            let orgId = currentUser.orgId || formData.orgId || uuidv4();

            const updatedUser = {
                ...existingUser,
                ...formData,
                profilePhoto: existingUser?.profilePhoto || "",
                isTempPassword: false,
                orgId,
                userType: "MDTS",
            };

            await db.updateUsers(currentUser.id, updatedUser);

            localStorage.setItem("user", JSON.stringify(updatedUser));
            userStore.setUser(updatedUser);

            const existingCompany = await db.getCompanyByGuiId(orgId);

            if (formData.isTempPassword) {
                const newCompany = {
                    name: formData.company,
                    industryType: formData.industryType,
                    companyType: formData.companyType,
                    city: formData.city,
                    state: formData.state,
                    country: formData.country,
                    zipCode: formData.zipCode,
                    address: formData.address,
                    guiId: orgId,
                    userGuiIds: [currentUser.guiId],
                };
                await db.addCompany(newCompany);
            } else if (existingCompany) {
                const updatedCompany = {
                    ...existingCompany,
                    name: formData.company,
                    industryType: formData.industryType,
                    companyType: formData.companyType,
                    city: formData.city,
                    state: formData.state,
                    country: formData.country,
                    zipCode: formData.zipCode,
                    address: formData.address,
                    userGuiIds: Array.from(new Set([...(existingCompany.userGuiIds || []), currentUser.guiId])),
                };

                await db.updateCompany(existingCompany.id, updatedCompany);
            }

            notify.success("Profile updated successfully!");
            fillUsersData();
        } catch (error) {
            console.error("Error saving profile:", error);
            notify.error("Something went wrong. Please try again.");
        }
    };

    const getPasswordStrength = (password: string) => {
        if (!password) return "";
        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[\W_]/.test(password)) score++;

        if (score <= 2) return "Weak";
        if (score === 3 || score === 4) return "Medium";
        return "Strong";
    };

    const getPasswordValidationStatus = (pwd: any) => {
        return {
            length: pwd.length >= 8,
            uppercase: /[A-Z]/.test(pwd),
            lowercase: /[a-z]/.test(pwd),
            number: /\d/.test(pwd),
            specialChar: /[\W_]/.test(pwd),
        };
    };

    const renderContent = () => {
        switch (selectedTab) {
            case "Profile Information":
                return (
                    <div className="profile-card">
                        <div className="card-body">
                            <div className="profile-cover">
                                <div className="profile-item">
                                    <div className="profile-image-container">
                                        <img
                                            src={image || "https://via.placeholder.com/100"}
                                            alt={getInitials()}
                                            className="profile-image"
                                        />
                                        <div className="overlay">
                                            <label htmlFor="file-input" className="upload-icon">
                                                <CameraOutlined className="upload-icon" />
                                            </label>
                                            <input
                                                type="file"
                                                id="file-input"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                className="profile-file-input"
                                            />
                                        </div>
                                    </div>
                                </div>
                            {!formData.isTempPassword && (
                                <div className="change-password-container">
                                    <a onClick={showModal}>Change Password</a>
                                </div>
                            )}
                            </div>


                            <div className="company-registration-form">
                                <Form
                                    className={`employee-professional-form ${isProfileCompleted() ? "registration-height-without-warning" : "registration-height-with-warning"
                                        }`}
                                    layout="horizontal"
                                    labelCol={{ span: 6 }}
                                    wrapperCol={{ span: 18 }}
                                    labelAlign="left"
                                >
                                    <Row gutter={[16, 16]} className="form-row">
                                        <Col span={12}>
                                            <Form.Item
                                                label="Company Name"
                                                colon={false}
                                                rules={[{ required: true, message: "Please enter company name" }]}
                                            >
                                                <Input
                                                    name="company"
                                                    value={formData.company}
                                                    onChange={handleInputChange}
                                                    placeholder="Enter Company"
                                                    disabled={formData.role != "Admin"}
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item
                                                label="Company Type"
                                                colon={false}
                                                rules={[{ required: true, message: "Please select company type" }]}
                                            >
                                                <Select
                                                    value={formData.companyType}
                                                    onChange={(value) => handleSelectChange(value, "companyType")}
                                                    placeholder="Select Company Type"
                                                    className="profile-full-width"
                                                >
                                                    <Option value="Mining">Mining</Option>
                                                    <Option value="Construction">Construction</Option>
                                                    <Option value="Equipment Supplier">Equipment Supplier</Option>
                                                </Select>
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <Row gutter={[16, 16]} className="form-row">
                                        <Col span={12}>
                                            <Form.Item
                                                label="Industry Type"
                                                colon={false}
                                                rules={[{ required: true, message: "Please select industry type" }]}
                                            >
                                                <Select
                                                    value={formData.industryType}
                                                    onChange={(value) => handleSelectChange(value, "industryType")}
                                                    placeholder="Select Industry Type"
                                                    className="profile-full-width"
                                                >
                                                    <Option value="Coal">Coal</Option>
                                                    <Option value="Iron">Iron</Option>
                                                    <Option value="Gold">Gold</Option>
                                                </Select>
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item
                                                label="Designation"
                                                colon={false}
                                                rules={[{ required: true, message: "Please select designation" }]}
                                            >
                                                <Select
                                                    value={formData.designation}
                                                    onChange={(value) => handleSelectChange(value, "designation")}
                                                    placeholder="Select Designation"
                                                    className="profile-full-width"
                                                >
                                                    <Option value="Mining Engineer">Mining Engineer</Option>
                                                    <Option value="Geologist">Geologist</Option>
                                                    <Option value="Operations Manager">Operations Manager</Option>
                                                </Select>
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <Row gutter={[16, 16]} className="form-row">
                                        <Col span={12}>
                                            <Form.Item
                                                label="Full Name"
                                                colon={false}
                                                rules={[{ required: true, message: "Please enter name" }]}
                                            >
                                                <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="Enter Name" />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item
                                                label="Email"
                                                colon={false}
                                                rules={[{ required: true, message: "Please enter email", type: "email" }]}
                                            >
                                                <Input name="email" value={formData.email} onChange={handleInputChange} placeholder="Enter Email" disabled />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <Row gutter={[16, 16]} className="form-row">
                                        <Col span={12}>
                                            <Form.Item
                                                label="Mobile No"
                                                colon={false}
                                                validateStatus={!formData.mobile ? "error" : ""}
                                                help={!formData.mobile ? "Please enter mobile number" : ""}
                                            >
                                                <PhoneInput
                                                    country="in"
                                                    value={formData.mobile}
                                                    onChange={(phone) => setFormData({ ...formData, mobile: `+${phone}` })}
                                                    inputProps={{ name: "mobile", required: true }}
                                                    specialLabel=""
                                                    inputClass="custom-phone-input"
                                                    buttonClass="custom-phone-button"
                                                    containerClass="custom-phone-container"
                                                />
                                            </Form.Item>
                                        </Col>

                                        <Col span={12}>
                                            <Form.Item label="WhatsApp No" colon={false}>
                                                <PhoneInput
                                                    country="in"
                                                    value={formData.whatsapp}
                                                    onChange={(phone) => setFormData({ ...formData, whatsapp: `+${phone}` })}
                                                    inputProps={{ name: "whatsapp" }}
                                                    specialLabel=""
                                                    inputClass="custom-phone-input"
                                                    buttonClass="custom-phone-button"
                                                    containerClass="custom-phone-container"
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <Row gutter={[16, 16]} className="form-row">
                                        <Col span={12}>
                                            <Form.Item label="Role" colon={false} rules={[{ required: true, message: "Please select role" }]}>
                                                <Select
                                                    value={formData.role}
                                                    onChange={(value) => handleSelectChange(value, "role")}
                                                    disabled
                                                    placeholder="Select Role"
                                                    className="profile-full-width"
                                                >
                                                    <Option value="admin">Admin</Option>
                                                    <Option value="manager">Manager</Option>
                                                    <Option value="worker">Worker</Option>
                                                </Select>
                                            </Form.Item>
                                        </Col>

                                        <Col span={12}>
                                            <Form.Item label="City" colon={false}>
                                                <Input name="city" value={formData.city} onChange={handleInputChange} placeholder="Enter City" />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <Row gutter={[16, 16]} className="form-row">
                                        <Col span={12}>
                                            <Form.Item label="Address" colon={false}>
                                                <Input.TextArea
                                                    name="address"
                                                    value={formData.address}
                                                    onChange={handleInputChange}
                                                    placeholder="Enter Address"
                                                    rows={3}
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <Row gutter={[16, 16]} className="form-row">
                                        <Col span={12}>
                                            <Form.Item label="State" colon={false}>
                                                <Input name="state" value={formData.state} onChange={handleInputChange} placeholder="Enter State" />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item label="Country" colon={false}>
                                                <Input
                                                    name="country"
                                                    value={formData.country}
                                                    onChange={handleInputChange}
                                                    placeholder="Enter Country"
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item label="Zip Code" colon={false}>
                                                <Input
                                                    name="zipCode"
                                                    type="number"
                                                    value={formData.zipCode}
                                                    onChange={handleInputChange}
                                                    placeholder="Enter Zip Code"
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                </Form>
                            </div>

                            <hr />

                            <div className="button-group">
                                <Button className="profile-save-btn" onClick={handleSave}>
                                    {formData.isTempPassword ? "Save" : "Update"}
                                </Button>
                            </div>
                        </div>
                    </div>
                );

            case "Team Members":
                return <div className="profile-manage-user"><ManageUser options={{ isAddMember: true, isToolbar: true, title: "Team Members" }} /></div>;

            case "Projects":
                return <div className="card">Projects Section</div>;

            default:
                return null;
        }
    };

    return (
        <>
            <div className="main-profile">
                <div className="sidebar-menu">
                    <div className="basic-info">
                        <div className="basic-info-left">
                            <img
                                src={image || "../public/images/logos/user-profile.png"}
                                alt="Logo"
                                className="profile-image"
                            />
                        </div>

                        <div className="details">
                            <div className="profile-sidebar-name">{formData?.name || ""}</div>
                            <div className="profile-sidebar-company">{formData?.company || ""}</div>
                        </div>
                    </div>

                    <div className="sidebar-tabs">
                        {["Profile Information", "Team Members"].map((tab) => {
                            if (tab === "Team Members" && !hasPermission(formData?.role, "VIEW_TEAM_MEMBERS")) return null;

                            return (
                                <button
                                    key={tab}
                                    type="button"
                                    className={`items ${selectedTab === tab ? "active-tab" : ""}`}
                                    onClick={() => setSelectedTab(tab)}
                                >
                                    {tab}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="items-details">
                    {!isProfileCompleted() && selectedTab !== "Team Members" && (
                        <div className="profile-warning-header card-header progress-warning create-doc-heading">
                            <p className="profile-warning-text">
                                {isProfileCompleted() ? "Manage Profile" : "Please complete registration"}
                            </p>
                        </div>
                    )}

                    <div className="profile-content">{renderContent()}</div>
                </div>
            </div>

            <div className="modal-container">
                <Modal
                    title={formData.name ? "Name" : "Email"}
                    open={isModalOpen}
                    onCancel={handleCancel}
                    footer={null}
                    className="modal-container"
                >
                    <Form
                        requiredMark={false}
                        form={form}
                        layout="horizontal"
                        onFinish={handlePasswordUpdate}
                        colon={false}
                        className="profile-modal-form"
                    >
                        {!formData?.isTempPassword && (
                            <Form.Item
                                label="Old Password"
                                name="oldPassword"
                                labelCol={{ span: 8, className: "profile-label-left" }}
                                wrapperCol={{ span: 16 }}
                                rules={[{ required: true, message: "Please enter your old password!" }]}
                            >
                                <Input.Password placeholder="Enter old password" />
                            </Form.Item>
                        )}

                        <Form.Item
                            label={
                                <div className="profile-password-label">
                                    <span>New Password</span>
                                    <Tooltip
                                        placement="right"
                                        overlayClassName="profile-password-tooltip"
                                        title={
                                            (() => {
                                                const status = getPasswordValidationStatus(password);
                                                return (
                                                    <div className="profile-password-rules">
                                                        <div className={status.length ? "rule-ok" : "rule-bad"}>• At least 8 characters</div>
                                                        <div className={status.uppercase ? "rule-ok" : "rule-bad"}>• One uppercase letter</div>
                                                        <div className={status.lowercase ? "rule-ok" : "rule-bad"}>• One lowercase letter</div>
                                                        <div className={status.number ? "rule-ok" : "rule-bad"}>• One number</div>
                                                        <div className={status.specialChar ? "rule-ok" : "rule-bad"}>• One special character</div>
                                                    </div>
                                                );
                                            })()
                                        }
                                    >
                                        <InfoCircleOutlined className="profile-info-icon" />
                                    </Tooltip>
                                </div>
                            }
                            name="newPassword"
                            labelCol={{ span: 8, className: "profile-label-left" }}
                            wrapperCol={{ span: 16 }}
                            rules={[
                                { required: true, message: "Please enter a new password!" },
                                {
                                    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/,
                                    message: "Password must contain uppercase, lowercase, number, special char, and be at least 8 characters.",
                                },
                            ]}
                        >
                            <Input.Password placeholder="Enter new password" onChange={(e) => setPassword(e.target.value)} />
                        </Form.Item>

                        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.newPassword !== curr.newPassword}>
                            {({ getFieldValue }) => {
                                const strength = getPasswordStrength(getFieldValue("newPassword"));
                                return strength ? (
                                    <div className="strength-pill-wrapper">
                                        <span className={`strength-pill ${strength.toLowerCase()}`}>{strength}</span>
                                    </div>
                                ) : null;
                            }}
                        </Form.Item>

                        <Form.Item
                            label="Confirm New Password"
                            name="confirmNewPassword"
                            labelCol={{ span: 8, className: "profile-label-left" }}
                            wrapperCol={{ span: 16 }}
                            dependencies={["newPassword"]}
                            rules={[
                                { required: true, message: "Please confirm your new password!" },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue("newPassword") === value) return Promise.resolve();
                                        return Promise.reject(new Error("Passwords do not match!"));
                                    },
                                }),
                            ]}
                        >
                            <Input.Password placeholder="Confirm new password" />
                        </Form.Item>

                        <Form.Item className="profile-modal-actions">
                            <Button type="primary" className="profile-modal-save-btn" htmlType="submit">
                                Save
                            </Button>
                        </Form.Item>
                    </Form>
                </Modal>
            </div>

            <ToastContainer />
        </>
    );
};

export default Profile;
