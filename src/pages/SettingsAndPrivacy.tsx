import { useEffect, useState, type ChangeEvent } from "react";
import { Card, Switch, Button, Divider, Input } from "antd";
import { BellOutlined, SafetyOutlined, BankOutlined, PlusOutlined, DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { db } from "../Utils/dataStorege";
import { getCurrentUser } from "../Utils/moduleStorage";
import { userStore } from "../Utils/UserStore";
import { notify } from "../Utils/ToastNotify";
import {
    OTHER_VALUE,
    parseStoredCompanyType,
    parseStoredIndustryType,
} from "../constants/companyAndIndustryOptions";
import {
    defaultCsrContentConfig,
    normalizeCsrContentConfig,
    type CsrRegisterItem,
    type CsrContentConfig,
    type CsrVisualItem,
} from "../config/csrContent";
import "../styles/settings-privacy.css";
const { TextArea } = Input;

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

const SETTINGS_TABS = ["General Settings", "Privacy", "Configuration"] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];
const CONFIGURATION_TABS = ["CSR", "Tenants"] as const;
type ConfigurationTab = (typeof CONFIGURATION_TABS)[number];

type GalleryEditableItem = {
    id: string;
    image: string;
    title: string;
    caption: string;
    buttonLabel?: string;
};

type CompactGalleryEditorProps<T extends GalleryEditableItem> = {
    sectionTitle: string;
    sectionCopy: string;
    addLabel: string;
    emptyTitle: string;
    emptyCopy: string;
    items: T[];
    selectedIndex: number;
    expanded: boolean;
    disabled: boolean;
    onSelect: (index: number) => void;
    onToggleExpanded: () => void;
    onAdd: () => void;
    onRemove: (index: number) => void;
    onUpload: (event: ChangeEvent<HTMLInputElement>, index: number) => void;
    onUpdateField: (index: number, key: "title" | "caption" | "buttonLabel", value: string) => void;
    buttonLabelField?: boolean;
};

const INITIAL_GALLERY_PREVIEW_COUNT = 6;

function getClampedIndex(length: number, index: number) {
    if (length <= 0) return 0;
    return Math.min(Math.max(index, 0), length - 1);
}

function CompactGalleryEditor<T extends GalleryEditableItem>({
    sectionTitle,
    sectionCopy,
    addLabel,
    emptyTitle,
    emptyCopy,
    items,
    selectedIndex,
    expanded,
    disabled,
    onSelect,
    onToggleExpanded,
    onAdd,
    onRemove,
    onUpload,
    onUpdateField,
    buttonLabelField = false,
}: CompactGalleryEditorProps<T>) {
    const visibleItems = expanded ? items : items.slice(0, INITIAL_GALLERY_PREVIEW_COUNT);
    const activeIndex = getClampedIndex(items.length, selectedIndex);
    const activeItem = items[activeIndex];
    const hiddenCount = Math.max(items.length - INITIAL_GALLERY_PREVIEW_COUNT, 0);

    if (!items.length) {
        return (
            <div className="sp-config-section">
                <div className="sp-config-section-head">
                    <div>
                        <div className="sp-config-section-title">{sectionTitle}</div>
                        <div className="sp-config-section-copy">{sectionCopy}</div>
                    </div>
                    <Button icon={<PlusOutlined />} disabled={disabled} onClick={onAdd}>
                        {addLabel}
                    </Button>
                </div>

                <div className="sp-empty-state">
                    <div className="sp-empty-state-title">{emptyTitle}</div>
                    <div className="sp-empty-state-copy">{emptyCopy}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="sp-config-section">
            <div className="sp-config-section-head">
                <div>
                    <div className="sp-config-section-title">{sectionTitle}</div>
                    <div className="sp-config-section-copy">{sectionCopy}</div>
                </div>
                <Button icon={<PlusOutlined />} disabled={disabled} onClick={onAdd}>
                    {addLabel}
                </Button>
            </div>

            <div className="sp-gallery-shell">
                <div className="sp-gallery-stage">
                    <div className="sp-gallery-stage-media">
                        {activeItem?.image ? (
                            <img
                                src={activeItem.image}
                                alt={activeItem.title || sectionTitle}
                                className="sp-gallery-stage-image"
                                loading="eager"
                                decoding="async"
                            />
                        ) : (
                            <div className="sp-gallery-stage-placeholder">
                                <UploadOutlined />
                                <span>Upload an image to preview this tile</span>
                            </div>
                        )}
                        <div className="sp-gallery-stage-overlay" aria-hidden />
                        <div className="sp-gallery-stage-copy">
                            <span className="sp-gallery-stage-badge">
                                {items.length} {items.length === 1 ? "item" : "items"}
                            </span>
                            <h3>{activeItem?.title || "Untitled image"}</h3>
                            <p>{activeItem?.caption || "Add a short caption to give this image more context."}</p>
                        </div>
                    </div>

                    <div className="sp-gallery-inspector">
                        <div className="sp-gallery-inspector-head">
                            <div>
                                <div className="sp-gallery-inspector-title">Editing image {activeIndex + 1}</div>
                                <div className="sp-gallery-inspector-copy">
                                    Update the selected image without stacking another oversized editor card.
                                </div>
                            </div>
                            <Button
                                danger
                                type="text"
                                disabled={disabled}
                                icon={<DeleteOutlined />}
                                onClick={() => onRemove(activeIndex)}
                            />
                        </div>

                        <div className="sp-upload-stack">
                            <label className="sp-upload-box sp-upload-box--compact">
                                <input type="file" accept="image/*" disabled={disabled} onChange={(event) => onUpload(event, activeIndex)} />
                                <UploadOutlined />
                                <span>{activeItem?.image ? "Replace image" : "Upload image"}</span>
                            </label>
                        </div>

                        <div className="sp-org-field">
                            <label className="sp-org-label">Title</label>
                            <Input
                                disabled={disabled}
                                value={activeItem?.title || ""}
                                onChange={(event) => onUpdateField(activeIndex, "title", event.target.value)}
                            />
                        </div>

                        <div className="sp-org-field">
                            <label className="sp-org-label">Caption</label>
                            <TextArea
                                disabled={disabled}
                                rows={3}
                                value={activeItem?.caption || ""}
                                onChange={(event) => onUpdateField(activeIndex, "caption", event.target.value)}
                            />
                        </div>

                        {buttonLabelField ? (
                            <div className="sp-org-field">
                                <label className="sp-org-label">Button label</label>
                                <Input
                                    disabled={disabled}
                                    value={activeItem?.buttonLabel || ""}
                                    onChange={(event) => onUpdateField(activeIndex, "buttonLabel", event.target.value)}
                                />
                            </div>
                        ) : null}
                    </div>
                </div>

                <div className="sp-gallery-rail">
                    <div className="sp-gallery-rail-track">
                        {visibleItems.map((item, index) => {
                            const isActive = index === activeIndex;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={`sp-gallery-thumb ${isActive ? "sp-gallery-thumb--active" : ""}`}
                                    onClick={() => onSelect(index)}
                                >
                                    {item.image ? (
                                        <img
                                            src={item.image}
                                            alt={item.title || `Image ${index + 1}`}
                                            className="sp-gallery-thumb-image"
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    ) : (
                                        <div className="sp-gallery-thumb-placeholder">No image</div>
                                    )}
                                    <div className="sp-gallery-thumb-copy">
                                        <span className="sp-gallery-thumb-index">{String(index + 1).padStart(2, "0")}</span>
                                        <strong>{item.title || `Image ${index + 1}`}</strong>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {items.length > INITIAL_GALLERY_PREVIEW_COUNT ? (
                        <button
                            type="button"
                            className="sp-gallery-toggle"
                            onClick={() => {
                                if (expanded && activeIndex >= INITIAL_GALLERY_PREVIEW_COUNT) {
                                    onSelect(0);
                                }
                                onToggleExpanded();
                            }}
                        >
                            {expanded ? "View less" : `View ${hiddenCount} more`}
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

const SettingsAndPrivacy = () => {
    const [userInfo, setUserInfo] = useState<any>(null);
    const [settings, setSettings] = useState<SettingsPrivacy>(defaultSettings);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<SettingsTab>("General Settings");
    const [activeConfigurationTab, setActiveConfigurationTab] = useState<ConfigurationTab>("CSR");
    const [csrConfig, setCsrConfig] = useState<CsrContentConfig>(defaultCsrContentConfig);
    const [selectedHomeVisualIndex, setSelectedHomeVisualIndex] = useState(0);
    const [selectedRegisterVisualIndex, setSelectedRegisterVisualIndex] = useState(0);
    const [homeGalleryExpanded, setHomeGalleryExpanded] = useState(false);
    const [registerGalleryExpanded, setRegisterGalleryExpanded] = useState(false);
    const [orgTypes, setOrgTypes] = useState({
        companyType: "",
        companyTypeOther: "",
        industryType: "",
        industryTypeOther: "",
    });
    const isOrgAdmin = String(userInfo?.role || "").toLowerCase() === "admin";

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
                setCsrConfig(normalizeCsrContentConfig(company?.csrContentConfig));

                setSettings({
                    emailAlerts: saved?.emailAlerts ?? defaultSettings.emailAlerts,
                    activityReminders: saved?.activityReminders ?? defaultSettings.activityReminders,
                    documentAlerts: saved?.documentAlerts ?? defaultSettings.documentAlerts,
                    profileVisibleInOrg: saved?.profileVisibleInOrg ?? defaultSettings.profileVisibleInOrg,
                    showContactInOrg: saved?.showContactInOrg ?? defaultSettings.showContactInOrg,
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

    const readFileAsDataUrl = (file: File) =>
        new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(new Error("Failed to read file."));
            reader.readAsDataURL(file);
        });

    const handleSingleImageUpload = async (event: ChangeEvent<HTMLInputElement>, key: keyof CsrContentConfig) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const image = await readFileAsDataUrl(file);
            setCsrConfig((prev) => ({ ...prev, [key]: image }));
        } catch {
            notify.error("Unable to load selected image.");
        } finally {
            event.target.value = "";
        }
    };

    const handleArrayImageUpload = async (
        event: ChangeEvent<HTMLInputElement>,
        collection: "homeVisualItems" | "registerProjectItems",
        index: number
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const image = await readFileAsDataUrl(file);
            setCsrConfig((prev) => ({
                ...prev,
                [collection]: prev[collection].map((item, itemIndex) =>
                    itemIndex === index ? { ...item, image } : item
                ),
            }));
        } catch {
            notify.error("Unable to load selected image.");
        } finally {
            event.target.value = "";
        }
    };

    const updateCsrField = (key: keyof CsrContentConfig, value: string) => {
        setCsrConfig((prev) => ({ ...prev, [key]: value }));
    };

    const updateHomeVisualItem = (index: number, key: "title" | "caption", value: string) => {
        setCsrConfig((prev) => ({
            ...prev,
            homeVisualItems: prev.homeVisualItems.map((item, itemIndex) =>
                itemIndex === index ? { ...item, [key]: value } : item
            ),
        }));
    };

    const updateRegisterItem = (index: number, key: "title" | "caption" | "buttonLabel", value: string) => {
        setCsrConfig((prev) => ({
            ...prev,
            registerProjectItems: prev.registerProjectItems.map((item, itemIndex) =>
                itemIndex === index ? { ...item, [key]: value } : item
            ),
        }));
    };

    const addHomeVisualItem = () => {
        setSelectedHomeVisualIndex(csrConfig.homeVisualItems.length);
        setHomeGalleryExpanded(true);
        setCsrConfig((prev) => ({
            ...prev,
            homeVisualItems: [
                ...prev.homeVisualItems,
                {
                    id: `visual-${Date.now()}`,
                    image: "",
                    title: "New visual",
                    caption: "",
                },
            ],
        }));
    };

    const removeHomeVisualItem = (index: number) => {
        setCsrConfig((prev) => ({
            ...prev,
            homeVisualItems: prev.homeVisualItems.filter((_, itemIndex) => itemIndex !== index),
        }));
    };

    const addRegisterItem = () => {
        setSelectedRegisterVisualIndex(csrConfig.registerProjectItems.length);
        setRegisterGalleryExpanded(true);
        setCsrConfig((prev) => ({
            ...prev,
            registerProjectItems: [
                ...prev.registerProjectItems,
                {
                    id: `register-${Date.now()}`,
                    image: "",
                    title: "New card",
                    caption: "",
                    buttonLabel: "",
                },
            ],
        }));
    };

    const removeRegisterItem = (index: number) => {
        setCsrConfig((prev) => ({
            ...prev,
            registerProjectItems: prev.registerProjectItems.filter((_, itemIndex) => itemIndex !== index),
        }));
    };

    useEffect(() => {
        setSelectedHomeVisualIndex((prev) => getClampedIndex(csrConfig.homeVisualItems.length, prev));
    }, [csrConfig.homeVisualItems.length]);

    useEffect(() => {
        setSelectedRegisterVisualIndex((prev) => getClampedIndex(csrConfig.registerProjectItems.length, prev));
    }, [csrConfig.registerProjectItems.length]);

    const handleSave = async () => {
        if (!userInfo) {
            notify.error("User data not found. Please sign in again.");
            return;
        }

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
                        csrContentConfig: normalizeCsrContentConfig(csrConfig),
                    });
                } else {
                    await db.addCompany({
                        guiId: String(userInfo.orgId),
                        name: userInfo?.company || "",
                        company: userInfo?.company || "",
                        companyType: orgTypes.companyType,
                        companyTypeOther: companyTypeOtherStored,
                        industryType: orgTypes.industryType,
                        industryTypeOther: industryTypeOtherStored,
                        csrContentConfig: normalizeCsrContentConfig(csrConfig),
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
                          csrContentConfig: normalizeCsrContentConfig(csrConfig),
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
                <div className="sp-title">Settings</div>
                <div className="sp-subtitle">Manage workspace preferences, privacy controls, and configuration from one place.</div>
            </div>

            <div className="sp-layout">
                <aside className="sp-sidebar">
                    <div className="sp-sidebar-title">Sections</div>
                    <div className="sp-tab-list" role="tablist" aria-label="Settings sections">
                        {SETTINGS_TABS.map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                role="tab"
                                aria-selected={activeTab === tab}
                                className={`sp-tab-btn ${activeTab === tab ? "sp-tab-btn--active" : ""}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </aside>

                <section className="sp-content">
                    {activeTab === "General Settings" && (
                        <Card className="sp-card" title={<span><BellOutlined /> General Settings</span>}>
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
                                    <div className="sp-item-sub">Notify when project documents are added or updated.</div>
                                </div>
                                <Switch checked={settings.documentAlerts} onChange={(v) => updateSetting("documentAlerts", v)} />
                            </div>
                        </Card>
                    )}

                    {activeTab === "Privacy" && (
                        <Card className="sp-card" title={<span><SafetyOutlined /> Privacy</span>}>
                            <div className="sp-item">
                                <div>
                                    <div className="sp-item-title">Visible in Organization Directory</div>
                                    <div className="sp-item-sub">Allow teammates to discover your profile inside your organization.</div>
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
                    )}

                    {activeTab === "Configuration" && (
                        <div className="sp-stack">
                            <Card className="sp-card" title={<span><BankOutlined /> Configuration</span>}>
                                <div className="sp-inline-tabs" role="tablist" aria-label="Configuration sections">
                                    {CONFIGURATION_TABS.map((tab) => (
                                        <button
                                            key={tab}
                                            type="button"
                                            role="tab"
                                            aria-selected={activeConfigurationTab === tab}
                                            className={`sp-inline-tab-btn ${activeConfigurationTab === tab ? "sp-inline-tab-btn--active" : ""}`}
                                            onClick={() => setActiveConfigurationTab(tab)}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>

                                {activeConfigurationTab === "CSR" && (
                                    <div className="sp-org-fields">
                                        <div className="sp-config-section">
                                            <div className="sp-config-section-head">
                                                <div className="sp-config-section-title">Home Hero</div>
                                                <div className="sp-config-section-copy">Upload the main home image and configure the hero text.</div>
                                            </div>
                                            {!isOrgAdmin && <p className="sp-org-hint">Only organization admins can update CSR images and text.</p>}
                                            <div className="sp-upload-stack">
                                                <label className="sp-upload-box">
                                                    <input type="file" accept="image/*" disabled={!isOrgAdmin} onChange={(e) => handleSingleImageUpload(e, "homeHeroImage")} />
                                                    <UploadOutlined />
                                                    <span>Upload hero image</span>
                                                </label>
                                                {csrConfig.homeHeroImage ? <img src={csrConfig.homeHeroImage} alt="Home hero preview" className="sp-preview-image sp-preview-image--hero" /> : null}
                                            </div>
                                            <div className="sp-org-field">
                                                <label className="sp-org-label">Hero quote</label>
                                                <Input
                                                    value={csrConfig.homeHeroQuote}
                                                    disabled={!isOrgAdmin}
                                                    onChange={(e) => updateCsrField("homeHeroQuote", e.target.value)}
                                                />
                                            </div>
                                            <div className="sp-org-field">
                                                <label className="sp-org-label">Hero body</label>
                                                <TextArea
                                                    rows={3}
                                                    value={csrConfig.homeHeroBody}
                                                    disabled={!isOrgAdmin}
                                                    onChange={(e) => updateCsrField("homeHeroBody", e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="sp-config-section">
                                            <div className="sp-config-section-head">
                                                <div>
                                                    <div className="sp-config-section-title">Home Visual Gallery</div>
                                                    <div className="sp-config-section-copy">Add any number of images. The homepage layout will adapt automatically.</div>
                                                </div>
                                            </div>
                                            <div className="sp-org-field">
                                                <label className="sp-org-label">Gallery heading</label>
                                                <Input
                                                    value={csrConfig.homeVisualHeading}
                                                    disabled={!isOrgAdmin}
                                                    onChange={(e) => updateCsrField("homeVisualHeading", e.target.value)}
                                                />
                                            </div>
                                            <div className="sp-org-field">
                                                <label className="sp-org-label">Gallery subheading</label>
                                                <TextArea
                                                    rows={2}
                                                    value={csrConfig.homeVisualSubheading}
                                                    disabled={!isOrgAdmin}
                                                    onChange={(e) => updateCsrField("homeVisualSubheading", e.target.value)}
                                                />
                                            </div>
                                            <CompactGalleryEditor<CsrVisualItem>
                                                sectionTitle="Gallery items"
                                                sectionCopy="Keep the homepage visuals compact with one shared gallery editor and a thumbnail rail."
                                                addLabel="Add image"
                                                emptyTitle="No gallery images yet"
                                                emptyCopy="Start with one image and the preview rail will scale cleanly as more visuals are added."
                                                items={csrConfig.homeVisualItems}
                                                selectedIndex={selectedHomeVisualIndex}
                                                expanded={homeGalleryExpanded}
                                                disabled={!isOrgAdmin}
                                                onSelect={setSelectedHomeVisualIndex}
                                                onToggleExpanded={() => setHomeGalleryExpanded((prev) => !prev)}
                                                onAdd={addHomeVisualItem}
                                                onRemove={removeHomeVisualItem}
                                                onUpload={(event, index) => handleArrayImageUpload(event, "homeVisualItems", index)}
                                                onUpdateField={(index, key, value) => updateHomeVisualItem(index, key as "title" | "caption", value)}
                                            />
                                        </div>

                                        <CompactGalleryEditor<CsrRegisterItem>
                                            sectionTitle="Register New Project Images"
                                            sectionCopy="Upload images for the right-side project panel using the same compact gallery workflow."
                                            addLabel="Add image"
                                            emptyTitle="No project images yet"
                                            emptyCopy="Add a few visuals and this panel will stay compact even when the library grows."
                                            items={csrConfig.registerProjectItems}
                                            selectedIndex={selectedRegisterVisualIndex}
                                            expanded={registerGalleryExpanded}
                                            disabled={!isOrgAdmin}
                                            onSelect={setSelectedRegisterVisualIndex}
                                            onToggleExpanded={() => setRegisterGalleryExpanded((prev) => !prev)}
                                            onAdd={addRegisterItem}
                                            onRemove={removeRegisterItem}
                                            onUpload={(event, index) => handleArrayImageUpload(event, "registerProjectItems", index)}
                                            onUpdateField={(index, key, value) =>
                                                updateRegisterItem(index, key as "title" | "caption" | "buttonLabel", value)
                                            }
                                            buttonLabelField
                                        />

                                    </div>
                                )}

                                {activeConfigurationTab === "Tenants" && (
                                    <div className="sp-empty-state">
                                        <div className="sp-empty-state-title">Tenants</div>
                                        <div className="sp-empty-state-copy">No tenant configuration has been added yet.</div>
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}
                </section>
            </div>

            <div className="sp-actions">
                <Button type="primary" onClick={handleSave} loading={saving}>
                    Save Settings
                </Button>
            </div>
        </div>
    );
};

export default SettingsAndPrivacy;
