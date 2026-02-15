import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, Dropdown, Button, Typography, Modal, Badge } from "antd";
import { BellOutlined, DownOutlined, LogoutOutlined, QuestionCircleOutlined, SettingOutlined } from "@ant-design/icons";
import "../styles/nav-bar.css";
import { userStore } from "../Utils/UserStore";
import { hasPermission } from "../Utils/auth";
const { Title } = Typography;
interface NavItem {
    label: string;
    action: string;
    subItems?: NavItem[];
    option?: string;
    name?: string;
    isNull?: boolean;
    view?: boolean;
    requiredPermission: any
}

const initialNavLinks: any[] = [
    // { label: "Dashboard", action: "/dashboard", requiredPermission: "VIEW_NAVBAR_MENUS" },
    { label: "Project", action: "/project", requiredPermission: "VIEW_NAVBAR_MENUS" },
    { label: "Knowledge Center", action: "/knowledge-center", requiredPermission: "VIEW_NAVBAR_MENUS" },
    {
        label: "Data Master",
        requiredPermission: "CREATE_MODULE",
        subItems: [
            { label: "Module Library", action: "/create/module-library", requiredPermission: "CREATE_MODULE" },
            // { label: "Notification", action: "/create/notification", isNull: true, requiredPermission: "SET_NOTIFICATIONS" },
            { label: "Projects", action: "/create/project-list", isNull: true, requiredPermission: "VIEW_PROJECT_LIST" },
        ]
    },
    {
        label: "Create",
        requiredPermission: "CREATE_PROJECT",
        subItems: [
            { label: "Register New Project", action: "/create/register-new-project", requiredPermission: "CREATE_PROJECT" },
            { label: "Modules", action: "/modules", requiredPermission: "CREATE_MODULE" },
            { label: "Timeline Builder", action: "/create/timeline-builder", requiredPermission: "BUILD_TIMEBUILDER" },
            { label: "Status Update", action: "/create/status-update", requiredPermission: "UPDATE_STATUS" },
            { label: "Non-working Days", action: "/create/non-working-days", requiredPermission: "SET_GLOBAL_HOLIDAY" },
            { label: "DPR Cost Builder", action: "/create/dpr-cost-builder", isNull: true, requiredPermission: "DPR_COST_BUILDER" },
            { label: "Documents", action: "/document", requiredPermission: "VIEW_NAVBAR_MENUS" },
            { label: "Cash-Flow Builder", action: "/create/cash-flow-builder", isNull: true, requiredPermission: "CASH_FLOW_BUILDER" },
            { label: "Delay Cost Calculator", action: "/create/delay-cost-calculator", isNull: true, requiredPermission: "DELAY_COST_CALCULATOR" },
            { label: "Activity Budget", action: "/budgets", requiredPermission: "VIEW_NAVBAR_MENUS" },
            { label: "Activity Costs", action: "/create/activitycost", requiredPermission: "VIEW_NAVBAR_MENUS" },
            { label: "Comercial Activity Planner", action: "/create/commercialActivityplanner", requiredPermission: "VIEW_NAVBAR_MENUS" },
        ]
    }
];

const Navbar: React.FC = () => {
    const [_openPopup, setOpenPopup] = useState<string | null>(null);
    const location = useLocation();
    const navigate = useNavigate();
    const [navLinks, setNavLinks] = useState<NavItem[]>(initialNavLinks);
    const [user, setUser] = useState<any>(null);
    const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
    const handlePopupOpen = (name: string) => setOpenPopup(name);
    const isActive = (action: string) => location.pathname.startsWith(action);
    const [selectedDropdownKeys, setSelectedDropdownKeys] = useState<{ [key: string]: string }>({});
    const showLogoutModal = () => {
        setIsLogoutModalVisible(true);
    };
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const storedNavLinks = localStorage.getItem('navLinks');
        if (storedNavLinks) {
            setNavLinks(JSON.parse(storedNavLinks));
        }
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    useEffect(() => {
        const updateUser = () => {
            const updatedUser = userStore.getUser();
            setUser(updatedUser);
        };

        updateUser();

        const unsubscribe = userStore.subscribe(updateUser);

        return () => {
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        const currentPath = location.pathname;
        let foundTab: NavItem | any = null;
        let parentLabel: string | undefined;
        navLinks.forEach((link) => {
            if (link.subItems) {
                const subTab = link.subItems.find((sub) => sub.action === currentPath);
                if (subTab) {
                    foundTab = subTab;
                    parentLabel = link.label;
                }
            } else if (link.action === currentPath) {
                foundTab = link;
            }
        });
        // if (foundTab) {
        //     setSelectedDropdownKeys((prev) => ({
        //         ...prev,
        //         [parentLabel || foundTab.label]: foundTab.label,
        //     }));
        // }
        if (foundTab) {
            // ✅ replace, don’t merge
            setSelectedDropdownKeys({ [parentLabel || foundTab.label]: foundTab.label });
        } else {
            setSelectedDropdownKeys({});
        }
    }, [location.pathname, navLinks]);

    const handleLogout = () => {
        setLoading(true);
        localStorage.removeItem("user");
        setLoading(false);
        setUser(null);
        setIsLogoutModalVisible(false);
        navigate("/home");
        window.location.reload();
    };

    const handleDropdownSelect = (menuLabel: string, subItem: any) => {
        // setSelectedDropdownKeys((prev) => ({
        //     ...prev,
        //     [menuLabel]: subItem.label,
        // }));

        setSelectedDropdownKeys({ [menuLabel]: subItem.label });

        if (subItem.option === "popup") {
            handlePopupOpen(subItem.name || "");
        } else {
            if (subItem.view === true) {
                navigate(subItem.action || "", {
                    state: {
                        projectName: subItem.label,
                        additionalData: subItem.label,
                        view: subItem.view
                    },
                });
            } else {
                navigate(subItem.action || "");
            }
        }
    };

    const handleMenuClick = ({ key }: { key: string }) => {
        setSelectedDropdownKeys({})
        if (key === "/profile") {
            navigate("/profile");
        } else if (key === "logout") {
            showLogoutModal();
        }
    };

    const handleSeeAllProfiles = () => {
        navigate("/profile");
    };

    const profileMenu = (
        <Menu className="custom-profile-menu" onClick={handleMenuClick}>
            <div className="user-basic-info">
                <div className="profile-header">
                    <img src={user?.profilePhoto} alt="avatar" className="avatar-large" />
                    <div className="user-name">{user?.name}</div>
                </div>
                <hr />
                <Button onClick={handleSeeAllProfiles} type="text" className="see-profiles-btn">See all profiles</Button>
            </div>
            <Menu.Item key="/settings" onClick={() => navigate("/settings")} icon={<SettingOutlined />}>
                Settings & privacy
            </Menu.Item>
            <Menu.Item key="/support" icon={<QuestionCircleOutlined />}>
                Help & support
            </Menu.Item>
            <Menu.Item key="logout" icon={<LogoutOutlined />}>
                Logout
            </Menu.Item>
        </Menu>
    );

    return (
        <>
            <div className="main-navbar">
                <div className="logo-and-text">
                    <div className="logo-sections">
                        <Link to="/home">
                            <img
                                src="/images/logos/main-logo.png"
                                alt="Logo"
                                className="logo-image"
                            />
                        </Link>
                    </div>
                    <div className="brand-text">
                        <p>MineSense</p>
                        <p>Mine Development Tracking System</p>
                    </div>
                    {/* <div className="generic-input-wrapper">
                        <input type="text" placeholder="Search mdts" />
                    </div> */}
                    {/* <div className="search-bar-wrapper">
                        <div className="spectacledcoder-search-bar">
                            <img className="search-icon" width="27" height="27" src="https://img.icons8.com/sf-black/500/000000/search.png" alt="search" />
                            <input type="text" name="search" placeholder="Search MDTS" className="spectacledcoder-search-input" />

                        </div>
                    </div> */}
                </div>
                <div className="user-data">
                    <div className="nav-tab-items">
                        <Title level={3} style={{ color: "white", flexGrow: 1 }}></Title>
                        {navLinks
                            .filter(link => hasPermission(user?.role, link.requiredPermission as any))
                            .map((link, index) => (
                                <div key={index} style={{ margin: "0 5px" }}>
                                    {link.subItems ? (
                                        <div className="nav-dropdown-cust"
                                            style={{
                                                position: "relative",
                                                cursor: "pointer",
                                                transition: "all 0.3s ease",
                                                backgroundColor: isActive(link.subItems[0]?.action || "") ? "#424242" : "transparent",
                                                borderRadius: "4px",
                                            }}
                                        >
                                            <Dropdown
                                                overlay={
                                                    <Menu
                                                        selectedKeys={[selectedDropdownKeys[link.label] || ""]}
                                                        style={{ maxHeight: '300px', overflowY: 'auto' }}
                                                    >
                                                        {link.subItems
                                                            .filter(sub => hasPermission(user?.role, sub.requiredPermission as any))
                                                            .map((subItem, _subIndex) => (
                                                                <Menu.Item
                                                                    key={subItem.label}
                                                                    onClick={() => handleDropdownSelect(link.label, subItem)}
                                                                >
                                                                    {subItem.label}
                                                                </Menu.Item>
                                                            ))}
                                                    </Menu>
                                                }
                                            >
                                                <Button type="text">
                                                    {link.label} <DownOutlined />
                                                </Button>
                                            </Dropdown>
                                        </div>
                                    ) : (
                                        <Button
                                            className={`nav-item ${isActive(link.action) ? "active" : ""}`}
                                            type="text"
                                        >
                                            <Link
                                                style={{ color: "inherit", textDecoration: "none" }}
                                                to={link.action || "#"}
                                                onClick={() => setSelectedDropdownKeys({})}
                                            >
                                                {link.label}
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                            ))}

                    </div>
                    <span className="notification-icon-wrapper">
                        <Badge count={5} size="small" offset={[-2, 4]}>
                            <BellOutlined className="bell-icon" />
                        </Badge>
                    </span>
                    {user ? (
                        <Dropdown overlay={profileMenu}>
                            <Button
                                type="text"
                                className="custom-dropdown-btn"
                            >
                                <div className="profile-wrapper">
                                    <img src={user?.profilePhoto} alt="avatar" className="avatar-img" />
                                    <DownOutlined className="badge-icon" />
                                </div>
                            </Button>
                        </Dropdown>
                    ) : (
                        <Button className="signin-btn" style={{ marginLeft: "20px" }}>
                            <Link to="/home" style={{ color: "inherit", textDecoration: "none" }}>Login</Link>
                        </Button>
                    )}
                </div>
            </div>
            <Modal
                title="Confirm Logout"
                visible={isLogoutModalVisible}
                onOk={handleLogout}
                onCancel={() => setIsLogoutModalVisible(false)}
                okText={loading ? 'Logging out...' : 'Logout'}
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
                className="modal-container"
            >
                <p style={{ padding: '10px' }}>Are you sure you want to logout?</p>
            </Modal>
        </>
    );
};

export default Navbar;