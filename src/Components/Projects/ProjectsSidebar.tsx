import { Input, Button, Dropdown } from "antd";
import type { ReactElement } from "react";
import "../../styles/ProjectsSidebar.css";
import { SearchOutlined } from "@mui/icons-material";
import { MoreOutlined, RobotOutlined, TeamOutlined, BarChartOutlined } from "@ant-design/icons";

interface ProjectsSidebarProps {
    rightPanelView: "project" | "people" | "portfolio";
    isPeopleView: boolean;
    isPortfolioView: boolean;
    searchTerm: string;
    onSearch: (value: string) => void;
    filteredProjects: any[];
    selectedProjectName: string;
    onProjectClick: (name: string) => void;
    getProjectInfoText: (project: any) => string;
    menu: (project: any) => ReactElement;
    onCreateProject: () => void;
    goToProjects: () => void;
    goToPeople: () => void;
    goToPortfolio: () => void;
}

const ProjectsSidebar = ({
    rightPanelView,
    isPeopleView,
    isPortfolioView,
    searchTerm,
    onSearch,
    filteredProjects,
    selectedProjectName,
    onProjectClick,
    getProjectInfoText,
    menu,
    onCreateProject,
    goToProjects,
    goToPeople,
    goToPortfolio,
}: ProjectsSidebarProps) => {
    return (
        <div className="ps-container">
            <div className="ps-panel">
                <div className="ps-header">
                    <div className={`ps-header-actions ${rightPanelView === "project" ? "ps-tab-active" : ""}`}>
                        <span className="ps-link" onClick={goToProjects}>
                            Projects
                        </span>
                        <Button
                            type="text"
                            size="small"
                            className="ps-icon-btn"
                            title="Projects"
                            icon={<RobotOutlined />}
                            onClick={goToProjects}
                        />
                    </div>

                    <div className={`ps-header-actions ${isPeopleView ? "ps-tab-active" : ""}`}>
                        <span className="ps-link" onClick={goToPeople}>
                            People
                        </span>
                        <Button
                            type="text"
                            size="small"
                            className="ps-icon-btn"
                            title="People"
                            icon={<TeamOutlined />}
                            onClick={goToPeople}
                        />
                    </div>

                    <div className={`ps-header-actions ${isPortfolioView ? "ps-tab-active" : ""}`}>
                        <span className="ps-link" onClick={goToPortfolio}>
                            Portfolio
                        </span>
                        <Button
                            type="text"
                            size="small"
                            className="ps-icon-btn"
                            title="Portfolio"
                            icon={<BarChartOutlined />}
                            onClick={goToPortfolio}
                        />
                    </div>
                </div>

                <div className="ps-search">
                    <Input
                        size="small"
                        placeholder={
                            isPeopleView || isPortfolioView
                                ? "Projects (view only)..."
                                : "Find the projects..."
                        }
                        value={searchTerm}
                        onChange={(event) => onSearch(event.target.value || "")}
                        prefix={<SearchOutlined style={{ fontSize: "18px", color: "#ddd" }} />}
                        style={{ height: "26px", fontSize: "12px" }}
                    />
                </div>

                {filteredProjects.length === 0 ? (
                    <div className="ps-empty-state">
                        <div className="ps-empty-title">No matching projects found</div>
                        <div className="ps-empty-subtitle">
                            {searchTerm.trim()
                                ? `No results for "${searchTerm.trim()}". Try project name, location, mineral, status, or member count.`
                                : "No project records available for the selected view."}
                        </div>
                    </div>
                ) : (
                    filteredProjects.map((project) => {
                        const isSelected = selectedProjectName === project.projectParameters.projectName;

                        return (
                            <div
                                key={project.projectParameters.projectName}
                                className={`ps-item ps-animated ${
                                    isSelected && !isPeopleView && !isPortfolioView ? "ps-focused" : ""
                                }`}
                                onClick={() => onProjectClick(project.projectParameters.projectName)}
                                style={isPeopleView || isPortfolioView ? { cursor: "default" } : undefined}
                                title={
                                    isPeopleView || isPortfolioView
                                        ? "View-only mode is open. Projects are not selectable."
                                        : undefined
                                }
                            >
                                <div className="ps-info">
                                    <div className="ps-title">{project.projectParameters.projectName}</div>
                                    <div className="ps-meta">
                                        <span className="ps-desc">{getProjectInfoText(project)}</span>

                                        <div className="ps-date-range">
                                            <span className="ps-date-label">📅</span>
                                            <span className="ps-date-value">
                                                {project.startDate || "2024-03-01"} → {project.endDate || "2024-09-30"}
                                            </span>
                                        </div>

                                        <div className="ps-meta-row">
                                            <span className="ps-meta-item">
                                                👥 {project.memberCount ?? project.members?.length ?? 0} members
                                            </span>
                                            <span
                                                className={`ps-status ${
                                                    project.displayStatus === "Active" || project.displayStatus === "Tracking"
                                                        ? "ps-status-active"
                                                        : "ps-status-inactive"
                                                }`}
                                            >
                                                {project.displayStatus || "Planning"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {!isPeopleView && (
                                    <Dropdown overlay={menu(project)} trigger={["hover"]}>
                                        <MoreOutlined className="ps-menu" />
                                    </Dropdown>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
            <div className="ps-create-wrap">
                <div style={{ display: "flex", justifyContent: "center" }} onClick={onCreateProject}>
                    <Button type="text" size="small" onClick={onCreateProject} className="ps-create-btn">
                        <RobotOutlined style={{ marginRight: 6 }} />
                        Create New Project
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ProjectsSidebar;
