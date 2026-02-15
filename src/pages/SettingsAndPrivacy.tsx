import { useEffect, useState } from "react";
import { Card, Row, Col, Switch, Button, Tag, Divider } from "antd";
import { BellOutlined, LockOutlined, SafetyOutlined, UserOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { db } from "../Utils/dataStorege";
import { getCurrentUser } from "../Utils/moduleStorage";
import { userStore } from "../Utils/UserStore";
import { notify } from "../Utils/ToastNotify";
import "../styles/settings-privacy.css";

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

        setSaving(true);
        try {
            const allUsers = await db.getUsers();
            const target = (allUsers || []).find(
                (u: any) => String(u?.id || "") === String(userInfo?.id || "") ||
                    String(u?.email || "").trim().toLowerCase() === String(userInfo?.email || "").trim().toLowerCase()
            );

            if (target?.id != null) {
                await db.updateUsers(target.id, {
                    ...target,
                    settingsPrivacy: settings,
                });
            }

            const currentLocalUser = getCurrentUser() || {};
            const updatedLocalUser = {
                ...currentLocalUser,
                settingsPrivacy: settings,
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
