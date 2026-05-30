import LandingPage from "../pages/LandingPage";
import Navbar from "./Navbar";

const MainLayout = () => {
    return (
        <div className="layout-container">
            <Navbar />
            <main className="main-content layout-page-scroll">
                <LandingPage />
            </main>
        </div>
    );
};

export default MainLayout;