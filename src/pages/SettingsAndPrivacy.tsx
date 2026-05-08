import { useEffect, useState } from "react";
import { Card, Row, Col, Switch, Button, Tag, Divider, Select, Input } from "antd";
import { BellOutlined, LockOutlined, SafetyOutlined, UserOutlined, BankOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { db } from "../Utils/dataStorege";
import { getCurrentUser } from "../Utils/moduleStorage";
import { userStore } from "../Utils/UserStore";
import { notify } from "../Utils/ToastNotify";
import {
    COMPANY_TYPE_OPTIONS,
    INDUSTRY_TYPE_OPTIONS,
    OTHER_VALUE,
    parseStoredCompanyType,
    parseStoredIndustryType,
} from "../constants/companyAndIndustryOptions";
import "../styles/settings-privacy.css";

const { Option } = Select;

type SettingsPrivacy = {
    emailAlerts: boolean;
    activityReminders: boolean;
    documentAlerts: boolean;
    profileVisibleInOrg: boolean;
    showContactInOrg: boolean;
};

const defaultSettings: SettingsPrivacy = {
    emailAlerts: true,
    activityReminders: true,
    documentAlerts: true,
    profileVisibleInOrg: true,
    showContactInOrg: false,
};

const SettingsAndPrivacy = () => {
    const navigate = useNavigate();
    const [userInfo, setUserInfo] = useState<any>(null);
    const [settings, setSettings] = useState<SettingsPrivacy>(defaultSettings);
    const [saving, setSaving] = useState(false);
    const [summary, setSummary] = useState({
        projectCount: 0,
        projectsWithTimeline: 0,
        totalTimelineVersions: 0,
    });
    const [orgTypes, setOrgTypes] = useState({
        companyType: "",
        companyTypeOther: "",
        industryType: "",
        industryTypeOther: "",
    });

    useEffect(() => {
        let active = true;

        const loadData = async () => {
            try {
                const currentUser = getCurrentUser();
                if (!currentUser) {
                    if (active) setUserInfo(null);
                    return;
                }

                let dbUser = currentUser?.id ? await db.getUserById(currentUser.id) : null;
                if (!dbUser && currentUser?.email) {
                    const allUsers = await db.getUsers();
                    dbUser = (allUsers || []).find(
                        (u: any) => String(u?.email || "").trim().toLowerCase() === String(currentUser.email || "").trim().toLowerCase()
                    );
                }

                const resolvedUser = dbUser || currentUser;
                const saved = resolvedUser?.settingsPrivacy || {};

                const projects = await db.getProjects();
                const orgProjects = (projects || []).filter(
                    (p: any) => String(p?.orgId || "") === String(resolvedUser?.orgId || "")
                );

                const projectsWithTimeline = orgProjects.filter(
                    (p: any) => Array.isArray(p?.projectTimeline) && p.projectTimeline.length > 0
                ).length;

                const totalTimelineVersions = orgProjects.reduce((sum: number, p: any) => {
                    const versions = Array.isArray(p?.projectTimeline) ? p.projectTimeline.length : 0;
                    return sum + versions;
                }, 0);

                if (!active) return;

                setUserInfo(resolvedUser);

                const company =
                    resolvedUser?.orgId != null && String(resolvedUser.orgId).length > 0
                        ? await db.getCompanyByGuiId(String(resolvedUser.orgId))
                        : null;
                const ctParsed = parseStoredCompanyType(
                    company?.companyType ?? resolvedUser?.companyType,
                    company?.companyTypeOther ?? resolvedUser?.companyTypeOther
                );
                const itParsed = parseStoredIndustryType(
                    company?.industryType ?? resolvedUser?.industryType,
                    company?.industryTypeOther ?? resolvedUser?.industryTypeOther
                );
                if (!active) return;

                setOrgTypes({
                    companyType: ctParsed.companyType,
                    companyTypeOther: ctParsed.companyTypeOther,
                    industryType: itParsed.industryType,
                    industryTypeOther: itParsed.industryTypeOther,
                });

                setSettings({
                    emailAlerts: saved?.emailAlerts ?? defaultSettings.emailAlerts,
                    activityReminders: saved?.activityReminders ?? defaultSettings.activityReminders,
                    documentAlerts: saved?.documentAlerts ?? defaultSettings.documentAlerts,
                    profileVisibleInOrg: saved?.profileVisibleInOrg ?? defaultSettings.profileVisibleInOrg,
                    showContactInOrg: saved?.showContactInOrg ?? defaultSettings.showContactInOrg,
                });
                setSummary({
                    projectCount: orgProjects.length,
                    projectsWithTimeline,
                    totalTimelineVersions,
                });
            } catch (error) {
                console.error("Failed to load settings data:", error);
            }
        };

        loadData();
        return () => {
            active = false;
        };
    }, []);

    const updateSetting = (key: keyof SettingsPrivacy, value: boolean) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        if (!userInfo) {
            notify.error("User data not found. Please sign in again.");
            return;
        }

        const isOrgAdmin = String(userInfo?.role || "").toLowerCase() === "admin";

        if (isOrgAdmin) {
            if (orgTypes.companyType === OTHER_VALUE && !String(orgTypes.companyTypeOther || "").trim()) {
                notify.error('Please specify the company type when "Other" is selected.');
                return;
            }
            if (orgTypes.industryType === OTHER_VALUE && !String(orgTypes.industryTypeOther || "").trim()) {
                notify.error('Please specify the industry type when "Other" is selected.');
                return;
            }
        }

        setSaving(true);
        try {
            const allUsers = await db.getUsers();
            const target = (allUsers || []).find(
                (u: any) => String(u?.id || "") === String(userInfo?.id || "") ||
                    String(u?.email || "").trim().toLowerCase() === String(userInfo?.email || "").trim().toLowerCase()
            );

            const companyTypeOtherStored =
                orgTypes.companyType === OTHER_VALUE ? String(orgTypes.companyTypeOther || "").trim() : "";
            const industryTypeOtherStored =
                orgTypes.industryType === OTHER_VALUE ? String(orgTypes.industryTypeOther || "").trim() : "";

            if (target?.id != null) {
                await db.updateUsers(target.id, {
                    ...target,
                    settingsPrivacy: settings,
                    ...(isOrgAdmin
                        ? {
                              companyType: orgTypes.companyType,
                              companyTypeOther: companyTypeOtherStored,
                              industryType: orgTypes.industryType,
                              industryTypeOther: industryTypeOtherStored,
                          }
                        : {}),
                });
            }

            if (isOrgAdmin && userInfo?.orgId) {
                const existingCompany = await db.getCompanyByGuiId(String(userInfo.orgId));
                if (existingCompany?.id != null) {
                    await db.updateCompany(existingCompany.id, {
                        ...existingCompany,
                        companyType: orgTypes.companyType,
                        companyTypeOther: companyTypeOtherStored,
                        industryType: orgTypes.industryType,
                        industryTypeOther: industryTypeOtherStored,
                    });
                }
            }

            const currentLocalUser = getCurrentUser() || {};
            const updatedLocalUser = {
                ...currentLocalUser,
                settingsPrivacy: settings,
                ...(isOrgAdmin
                    ? {
                          companyType: orgTypes.companyType,
                          companyTypeOther: companyTypeOtherStored,
                          industryType: orgTypes.industryType,
                          industryTypeOther: industryTypeOtherStored,
                      }
                    : {}),
            };

            localStorage.setItem("user", JSON.stringify(updatedLocalUser));
            userStore.setUser(updatedLocalUser);
            notify.success("Settings saved successfully.");
        } catch (error) {
            console.error("Failed to save settings:", error);
            notify.error("Unable to save settings. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="sp-page">
            <div className="sp-header">
                <div className="sp-title">Settings & Privacy</div>
                <div className="sp-subtitle">Manage account preferences and data visibility for your organization workspace.</div>
            </div>

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                    <Card className="sp-card" title={<span><BellOutlined /> Notification Preferences</span>}>
                        <div className="sp-item">
                            <div>
                                <div className="sp-item-title">Email Alerts</div>
                                <div className="sp-item-sub">Receive project and activity alerts on email.</div>
                            </div>
                            <Switch checked={settings.emailAlerts} onChange={(v) => updateSetting("emailAlerts", v)} />
                        </div>
                        <Divider />
                        <div className="sp-item">
                            <div>
                                <div className="sp-item-title">Activity Reminders</div>
                                <div className="sp-item-sub">Get reminders for upcoming planned activities.</div>
                            </div>
                            <Switch checked={settings.activityReminders} onChange={(v) => updateSetting("activityReminders", v)} />
                        </div>
                        <Divider />
                        <div className="sp-item">
                            <div>
                                <div className="sp-item-title">Document Alerts</div>
                                <div className="sp-item-sub">Notify when project documents are added/updated.</div>
                            </div>
                            <Switch checked={settings.documentAlerts} onChange={(v) => updateSetting("documentAlerts", v)} />
                        </div>
                    </Card>

                    <Card className="sp-card" title={<span><SafetyOutlined /> Privacy Controls</span>}>
                        <div className="sp-item">
                            <div>
                                <div className="sp-item-title">Visible in Organization Directory</div>
                                <div className="sp-item-sub">Allow teammates to discover your profile inside your org.</div>
                            </div>
                            <Switch checked={settings.profileVisibleInOrg} onChange={(v) => updateSetting("profileVisibleInOrg", v)} />
                        </div>
                        <Divider />
                        <div className="sp-item">
                            <div>
                                <div className="sp-item-title">Show Contact Details to Team</div>
                                <div className="sp-item-sub">Show your mobile and WhatsApp details in team contexts.</div>
                            </div>
                            <Switch checked={settings.showContactInOrg} onChange={(v) => updateSetting("showContactInOrg", v)} />
                        </div>
                    </Card>

                    <Card className="sp-card" title={<span><BankOutlined /> Organization</span>}>
                        <div className="sp-org-fields">
                            <div className="sp-org-field">
                                <label className="sp-org-label">Company type</label>
                                <Select
                                    className="sp-org-select"
                                    placeholder="Select company type"
                                    value={orgTypes.companyType || undefined}
                                    onChange={(v) =>
                                        setOrgTypes((prev) => ({
                                            ...prev,
                                            companyType: v,
                                            companyTypeOther: v === OTHER_VALUE ? prev.companyTypeOther : "",
                                        }))
                                    }
                                    showSearch
                                    optionFilterProp="children"
                                    disabled={String(userInfo?.role || "").toLowerCase() !== "admin"}
                                >
                                    {COMPANY_TYPE_OPTIONS.map((opt) => (
                                        <Option key={opt} value={opt}>
                                            {opt}
                                        </Option>
                                    ))}
                                </Select>
                            </div>
                            {orgTypes.companyType === OTHER_VALUE && (
                                <div className="sp-org-field">
                                    <label className="sp-org-label">Specify company type</label>
                                    <Input
                                        value={orgTypes.companyTypeOther}
                                        onChange={(e) =>
                                            setOrgTypes((prev) => ({ ...prev, companyTypeOther: e.target.value }))
                                        }
                                        placeholder="Describe company type"
                                        disabled={String(userInfo?.role || "").toLowerCase() !== "admin"}
                                    />
                                </div>
                            )}
                            <div className="sp-org-field">
                                <label className="sp-org-label">Industry type</label>
                                <Select
                                    className="sp-org-select"
                                    placeholder="Select industry type"
                                    value={orgTypes.industryType || undefined}
                                    onChange={(v) =>
                                        setOrgTypes((prev) => ({
                                            ...prev,
                                            industryType: v,
                                            industryTypeOther: v === OTHER_VALUE ? prev.industryTypeOther : "",
                                        }))
                                    }
                                    showSearch
                                    optionFilterProp="children"
                                    disabled={String(userInfo?.role || "").toLowerCase() !== "admin"}
                                >
                                    {INDUSTRY_TYPE_OPTIONS.map((opt) => (
                                        <Option key={opt} value={opt}>
                                            {opt}
                                        </Option>
                                    ))}
                                </Select>
                            </div>
                            {orgTypes.industryType === OTHER_VALUE && (
                                <div className="sp-org-field">
                                    <label className="sp-org-label">Specify industry</label>
                                    <Input
                                        value={orgTypes.industryTypeOther}
                                        onChange={(e) =>
                                            setOrgTypes((prev) => ({ ...prev, industryTypeOther: e.target.value }))
                                        }
                                        placeholder="Describe industry type"
                                        disabled={String(userInfo?.role || "").toLowerCase() !== "admin"}
                                    />
                                </div>
                            )}
                        </div>
                        {String(userInfo?.role || "").toLowerCase() !== "admin" && (
                            <p className="sp-org-hint">Only organization admins can edit company and industry type.</p>
                        )}
                    </Card>
                </Col>

                <Col xs={24} lg={8}>
                    <Card className="sp-card" title={<span><UserOutlined /> Account Snapshot</span>}>
                        <div className="sp-meta"><span>Name</span><span>{userInfo?.name || "-"}</span></div>
                        <div className="sp-meta"><span>Email</span><span>{userInfo?.email || "-"}</span></div>
                        <div className="sp-meta"><span>Role</span><span><Tag color="blue">{userInfo?.role || "-"}</Tag></span></div>
                        <div className="sp-meta"><span>Organization</span><span>{userInfo?.company || "-"}</span></div>
                    </Card>

                    <Card className="sp-card" title="Workspace Data Summary">
                        <div className="sp-summary-grid">
                            <div className="sp-summary-box">
                                <div className="sp-summary-value">{summary.projectCount}</div>
                                <div className="sp-summary-label">Projects</div>
                            </div>
                            <div className="sp-summary-box">
                                <div className="sp-summary-value">{summary.projectsWithTimeline}</div>
                                <div className="sp-summary-label">With Timeline</div>
                            </div>
                            <div className="sp-summary-box">
                                <div className="sp-summary-value">{summary.totalTimelineVersions}</div>
                                <div className="sp-summary-label">Timeline Versions</div>
                            </div>
                        </div>
                    </Card>

                    <Card className="sp-card" title={<span><LockOutlined /> Security</span>}>
                        <div className="sp-item-sub">
                            Password and authentication are managed in your Profile page.
                        </div>
                        <Button className="sp-link-btn" onClick={() => navigate("/profile")}>
                            Open Profile
                        </Button>
                    </Card>
                </Col>
            </Row>

            <div className="sp-actions">
                <Button type="primary" onClick={handleSave} loading={saving}>
                    Save Settings
                </Button>
            </div>
        </div>
    );
};

export default SettingsAndPrivacy;
