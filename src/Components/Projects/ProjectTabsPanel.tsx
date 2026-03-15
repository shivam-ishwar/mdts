import "../../styles/ProjectTabsPanel.css";

interface ProjectTabsPanelProps {
    tabs: { key: string; label: string }[];
    activeTab: string;
    onTabChange: (key: string) => void;
    renderTabContent: () => JSX.Element;
}

const ProjectTabsPanel = ({ tabs, activeTab, onTabChange, renderTabContent }: ProjectTabsPanelProps) => {
    return (
        <section className="pt-section">
            <div className="pt-tabs">
                <div className="pt-tabs-row">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            className={`pt-tab-btn ${activeTab === tab.key ? "pt-tab-active" : ""}`}
                            onClick={() => onTabChange(tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="pt-panel">
                <div className="pt-panel-inner">
                    <div className="pt-tab-container">
                        <div className="pt-tab-content">{renderTabContent()}</div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ProjectTabsPanel;
