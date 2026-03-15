import "../../styles/PortfolioPanel.css";
import PortfolioTechnicality from "./PortfolioTechnicality.tsx";
import PortfolioStats from "./PortfolioStats.tsx";

interface PortfolioPanelProps {
    portfolioTab: "technicality" | "projectStats";
    onTabChange: (tab: "technicality" | "projectStats") => void;
    onBackToProjects: () => void;
}

const PortfolioPanel = ({
    portfolioTab,
    onTabChange,
    onBackToProjects,
}: PortfolioPanelProps) => {
    return (
        <section className="pf-section">
            <div className="pf-hero">
                <button className="pf-back-btn" onClick={onBackToProjects}>
                    ← Back to Projects
                </button>
                <div className="pf-title-block">
                    <div className="pf-title">Project Portfolio</div>
                    <div className="pf-subtitle">
                        A unified snapshot of all projects, focused on technical clarity and performance signals.
                    </div>
                </div>
            </div>

            <div className="pf-tabs">
                <div className="pf-tabs-row">
                    <button
                        className={`pf-tab-btn ${portfolioTab === "projectStats" ? "pf-tab-active" : ""}`}
                        onClick={() => onTabChange("projectStats")}
                    >
                        Project Statistics
                    </button>
                    <button
                        className={`pf-tab-btn ${portfolioTab === "technicality" ? "pf-tab-active" : ""}`}
                        onClick={() => onTabChange("technicality")}
                    >
                        Technicality
                    </button>
                </div>
            </div>

            <div className="pf-panel">
                <div className="pf-panel-inner">
                    <div className="pf-tab-container">
                        <div className="pf-tab-content">
                            {portfolioTab === "technicality" ? <PortfolioTechnicality /> : <PortfolioStats />}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default PortfolioPanel;
