import { useEffect, useState } from "react";
import "../styles/projects.css";
import { Input, Button, Modal, Select, Dropdown, Menu } from "antd";
import { Link } from "react-router-dom";
import { SearchOutlined } from "@mui/icons-material";
import {
    MoreOutlined,
    RobotOutlined,
    PushpinOutlined,
    StarOutlined,
    ShareAltOutlined,
    DeleteOutlined,
    TeamOutlined,
} from "@ant-design/icons";
import { db } from "../Utils/dataStorege.ts";
import CAPEXPerformance from "./CAPEXPerformance.tsx";
import FDPP from "./FDPP.tsx";
import MineInfra from "./MineInfra.tsx";
import TimelinePerformance from "./TimelinePerformance.tsx";
import CSR from "./CSR.tsx";
import ProjectTimeline from "./ProjectTimeline.tsx";
import ProjectDocs from "./ProjectDocs";
import ProjectStatistics from "./ProjectStatistics.tsx";
import { ToastContainer } from "react-toastify";
import { notify } from "../Utils/ToastNotify.tsx";
import { getCurrentUser } from "../Utils/moduleStorage.ts";
import { useNavigate } from "react-router-dom";
import PeopleSearch from "./PeopleSearch.tsx";
import Charts from "./Charts.tsx";

interface LocationDetails {
    state: string;
    district: string;
    nearestTown: string;
    nearestAirport: string;
    nearestRailwayStation: string;
}

interface ContractualDetails {
    mineOwner: string;
    dateOfH1Bidder: string | null;
    cbdpaDate: string | null;
    vestingOrderDate: string | null;
    pbgAmount: string;
}

interface InitialStatus {
    forestclearence: string;
    shivam: string;
}

interface ProjectParameters {
    companyName: string;
    projectName: string;
    reserve: string;
    netGeologicalReserve: string;
    extractableReserve: string;
    stripRatio: string;
    peakCapacity: string;
    mineLife: string;
    totalCoalBlockArea: string;
    mineral: string;
    typeOfMine: string;
    grade: string;
    state: string;
    district: string;
    nearestTown: string;
    nearestAirport: string;
    nearestRailwayStation: string;
    mineOwner: string;
    dateOfH1Bidder: string | null;
    cbdpaDate: string | null;
    vestingOrderDate: string | null;
    pbgAmount: string;
    view?: boolean;
    description?: string;
}

interface ProjectData {
    id: string;
    orgId?: string;
    userGuiId?: string;
    members?: any[];
    status?: string;
    startDate?: string;
    endDate?: string;
    projectTimeline?: any[];
    projectParameters: ProjectParameters;
    locations: LocationDetails;
    contractualDetails: ContractualDetails;
    initialStatus: InitialStatus;
}

const membersList = ["Alice", "Bob", "Charlie", "David", "Emma"];

type RightPanelView = "project" | "people";

const Projects = () => {
    const [allProjects, setAllProjects] = useState<any[]>([]);
    const [projectDetails, setProjectDetails] = useState<ProjectData | any>(null);
    const [selectedProjectName, setSelectedProjectName] = useState<string>("");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<string | null>(null);
    const [addedMembers, setAddedMembers] = useState<string[]>([]);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<any>(null);

    const [_isProjectFocused, setIsProjectFocused] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    const [rightPanelView, setRightPanelView] = useState<RightPanelView>("project");

    const navigate = useNavigate();
    const isPeopleView = rightPanelView === "people";

    const tabs = [
        { key: "fdpp", label: "FDPP" },
        { key: "project-timeline", label: "Project Timeline" },
        { key: "projectStatistics", label: "Dashboard" },
        { key: "capex", label: "CAPEX-Performance" },
        { key: "documents", label: "Documents" },
        { key: "csr", label: "Corporate Social Responsibility" },
        { key: "mineInfra", label: "Mine Infra Updated" },
    ];

    const [activeTab, setActiveTab] = useState("fdpp");

    const getAllProjects = async () => {
        if (!currentUser) return;

        try {
            const storedData = await db.getProjects();
            const orgProjects = storedData?.filter((proj: any) => proj.orgId == currentUser.orgId) || [];

            if (orgProjects.length === 0) {
                console.warn("No projects found for this organization.");
                setAllProjects([]);
                setProjectDetails(null);
                return;
            }

            setAllProjects(orgProjects);
            setProjectDetails(orgProjects[0]);
            setSelectedProjectName(orgProjects[0].projectParameters.projectName);
            setIsProjectFocused(true);
        } catch (error) {
            console.error("An unexpected error occurred while fetching projects:", error);
        }
    };

    useEffect(() => {
        setCurrentUser(getCurrentUser());
    }, []);

    useEffect(() => {
        if (currentUser && currentUser.orgId) {
            getAllProjects();
        }
    }, [currentUser]);

    if (!projectDetails) {
        return (
            <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
                No projects available. Please add a project to get started.
                <div style={{ marginLeft: "30px" }}>
                    <Button size="small" className="bg-secondary" icon={<RobotOutlined />}>
                        <Link style={{ color: "inherit", textDecoration: "none" }} to={"/create/register-new-project"}>
                            New
                        </Link>
                    </Button>
                </div>
            </div>
        );
    }

    const handleProjectClick = (projectName: string) => {
        // ✅ People view: project list should be view-only (no selection)
        if (isPeopleView) return;

        const selectedProject = allProjects.find(
            (project) => project.projectParameters.projectName === projectName
        );

        if (selectedProject) {
            setProjectDetails(selectedProject);
            setSelectedProjectName(selectedProject.projectParameters.projectName);
            setIsProjectFocused(true);
            setRightPanelView("project");
            setActiveTab("fdpp");
        }
    };

    const handleSearch = (_event: any) => {
        console.log("searching...");
    };

    const handleAddMember = () => {
        if (selectedMember && !addedMembers.includes(selectedMember)) {
            setAddedMembers([...addedMembers, selectedMember]);
        }
        setIsModalOpen(false);
        setSelectedMember(null);
    };

    const handleDeleteProject = async () => {
        if (!projectToDelete) return;

        try {
            await db.deleteProject(projectToDelete.id);
            const updatedProjects = await db.getProjects();
            setAllProjects(updatedProjects);

            // keep first project selected if exists
            if (updatedProjects.length > 0) {
                setProjectDetails(updatedProjects[0]);
                setSelectedProjectName(updatedProjects[0]?.projectParameters?.projectName || "");
            } else {
                setProjectDetails(null);
                setSelectedProjectName("");
            }

            notify.success("Project removed successfully");
        } catch (error: any) {
            notify.error("Error deleting project:", error);
        } finally {
            setIsDeleteModalOpen(false);
        }
    };

    const closeDeleteModal = () => {
        setProjectToDelete(null);
        setIsDeleteModalOpen(false);
    };

    const showDeleteModal = (project: ProjectData) => {
        setProjectToDelete(project);
        setIsDeleteModalOpen(true);
    };

    const pinProject = (project: ProjectData) => {
        console.log("Pin project:", project);
    };

    const markAsFavorite = (project: ProjectData) => {
        console.log("Marked as favorite:", project);
    };

    const shareProject = (project: ProjectData) => {
        const shareableLink = `https://yourapp.com/project/${project}`;
        navigator.clipboard.writeText(shareableLink);
        notify.success("Project link copied to clipboard!");
    };

    const menu = (project: any) => {
        const hasTimeline = project.projectTimeline && project.projectTimeline.length > 0;
        const isOwner = project.userGuiId === currentUser?.userGuiId;
        const canDelete = isOwner && !hasTimeline;

        return (
            <Menu
                onClick={(e) => {
                    e.domEvent.stopPropagation();
                }}
            >
                <Menu.Item key="pin" icon={<PushpinOutlined />} onClick={() => pinProject(project)}>
                    Pin to Top
                </Menu.Item>
                <Menu.Item key="favorite" icon={<StarOutlined />} onClick={() => markAsFavorite(project)}>
                    Mark as Favorite
                </Menu.Item>
                <Menu.Item key="share" icon={<ShareAltOutlined />} onClick={() => shareProject(project)}>
                    Share Project
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                    key="delete"
                    icon={<DeleteOutlined />}
                    danger
                    disabled={!canDelete}
                    onClick={(e) => {
                        e.domEvent.stopPropagation();
                        if (canDelete) {
                            showDeleteModal(project);
                        } else {
                            notify.error(!isOwner ? "You are not the owner of this project" : "Timeline created - deletion not allowed");
                        }
                    }}
                >
                    Delete
                </Menu.Item>
            </Menu>
        );
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case "projectStatistics":
                // return <ProjectStatistics id={projectDetails.id} />;
                return <Charts id={projectDetails.id} />
            case "fdpp":
                return <FDPP code={projectDetails.id} />;
            case "project-timeline":
                return <ProjectTimeline code={projectDetails.id} />;
            case "timeline":
                return <TimelinePerformance />;
            case "capex":
                return <CAPEXPerformance code={projectDetails.id} />;
            case "documents":
                return <ProjectDocs code={projectDetails.id} />;
            case "csr":
                return <CSR />;
            case "mineInfra":
                return <MineInfra />;
            default:
                return <div>Select a tab to see content</div>;
        }
    };

    const goToPeople = () => setRightPanelView("people");
    const goToProjects = () => setRightPanelView("project");

    return (
        <>
            <div className="project-container">
                <div className="pppsdd">
                    <div className="all-project-details">
                        <div className="projects-header">
                            <div className={`projects-header-actions ${!isPeopleView ? "tab-active" : ""}`}>
                                <span className="people-link" onClick={goToProjects}>
                                    Projects
                                </span>
                                <Button
                                    type="text"
                                    size="small"
                                    className="header-icon-btn"
                                    title="Projects"
                                    icon={<RobotOutlined />}
                                    onClick={goToProjects}
                                />
                            </div>

                            <div className={`projects-header-actions ${isPeopleView ? "tab-active" : ""}`}>
                                <span className="people-link" onClick={goToPeople}>
                                    People
                                </span>
                                <Button
                                    type="text"
                                    size="small"
                                    className="header-icon-btn"
                                    title="People"
                                    icon={<TeamOutlined />}
                                    onClick={goToPeople}
                                />
                            </div>
                        </div>

                        <div className="search">
                            <Input
                                size="small"
                                placeholder={isPeopleView ? "Projects (view only)..." : "Find the projects..."}
                                onChange={handleSearch}
                                prefix={<SearchOutlined style={{ fontSize: "18px", color: "#ddd" }} />}
                                style={{ height: "26px", fontSize: "12px" }}
                            />
                        </div>

                        {allProjects.map((project) => {
                            const isSelected = selectedProjectName === project.projectParameters.projectName;

                            return (
                                <div
                                    key={project.projectParameters.projectName}
                                    className={`project-item animated-item ${isSelected && !isPeopleView ? "focused-project" : ""}`}
                                    onClick={() => handleProjectClick(project.projectParameters.projectName)}
                                    style={isPeopleView ? { cursor: "default" } : undefined}
                                    title={isPeopleView ? "People view is open. Projects are view-only." : undefined}
                                >
                                    <div className="project-info-block">
                                        <div className="project-title">{project.projectParameters.projectName}</div>
                                        <div className="project-meta">
                                            <span className="desc">{project.projectParameters.description || "No description available."}</span>

                                            <div className="date-range">
                                                <span className="date-label">📅</span>
                                                <span className="date-value">
                                                    {project.startDate || "2024-03-01"} → {project.endDate || "2024-09-30"}
                                                </span>
                                            </div>

                                            <div className="meta-row">
                                                <span className="meta-item">👥 {project.members?.length || 0} members</span>
                                                <span className={`status-badge ${project.status === "Active" ? "active" : "inactive"}`}>
                                                    {project.status || "Unknown"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {!isPeopleView && (
                                        <Dropdown overlay={menu(project)} trigger={["hover"]}>
                                            <MoreOutlined className="three-dot-menu" />
                                        </Dropdown>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="create-project-btn-div">
                        <div style={{ display: "flex", justifyContent: "center" }} onClick={() => navigate("/create/register-new-project")} >
                            <Button
                                type="text"
                                size="small"
                                onClick={() => navigate("/create/register-new-project")}
                                className="create-project-btn"
                            >
                                <RobotOutlined style={{ marginRight: 6 }} />
                                Create New Project
                            </Button>
                        </div>
                    </div>
                </div>

                {isPeopleView ? (
                    <PeopleSearch />
                ) : (
                    <section className="project-info">
                        <div className="base-details">
                            <div className="">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.key}
                                        className={`tab-button ${activeTab === tab.key ? "active" : ""}`}
                                        onClick={() => setActiveTab(tab.key)}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="details-paremeters">
                            <div className="info-item">
                                <div className="tab-container">
                                    <div className="tab-content">{renderTabContent()}</div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}
            </div>

            <Modal
                title="Select Member"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={handleAddMember}
                okButtonProps={{ className: "bg-secondary text-white" }}
                cancelButtonProps={{ className: "bg-tertiary text-white" }}
            >
                <Select
                    placeholder="Select a member"
                    style={{ width: "100%" }}
                    value={selectedMember}
                    onChange={setSelectedMember}
                >
                    {membersList.map((member) => (
                        <Select.Option key={member} value={member}>
                            {member}
                        </Select.Option>
                    ))}
                </Select>
            </Modal>

            <Modal
                title="Confirm Deletion"
                open={isDeleteModalOpen}
                onOk={handleDeleteProject}
                onCancel={closeDeleteModal}
                okText="Delete"
                okButtonProps={{ danger: true }}
            >
                <p>Are you sure you want to delete this project?</p>
            </Modal>

            <ToastContainer />
        </>
    );
};

export default Projects;