import "../../styles/PortfolioPanel.css";
import PortfolioTechnicality from "./PortfolioTechnicality.tsx";
import PortfolioStats from "./PortfolioStats.tsx";

interface PortfolioPanelProps {
    portfolioTab: "technicality" | "projectStats";
    onTabChange: (tab: "technicality" | "projectStats") => void;
}

const PortfolioPanel = ({
    portfolioTab,
    onTabChange,
}: PortfolioPanelProps) => {
    return (
        <section className="pf-section">
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
