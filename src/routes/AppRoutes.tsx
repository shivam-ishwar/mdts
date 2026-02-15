import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from "../pages/Home";
import NotFound from "../pages/NotFound";
import MainLayout from "../Layout/MainLayout";
import About from "../pages/About";
import Projects from "../pages/Projects";
import Document from "../pages/Document";
import DataMaster from "../pages/DataMaster";
import Profile from "../pages/Profile";
import Module from "../Components/Module";
import CreateDocument from "../Components/CreateDocument";
import { EmployeeRegistration } from "../Components/EmployeeRegistration";
import { HolidayCalender } from "../Components/HolidayCalender";
import ManageUser from "../Components/ManageUser";
import ModuleLibrary from "../Components/ModuleLibrary";
import NotificationLibrary from "../Components/NotificationLibrary";
import { RegisterNewProject } from "../Components/RegisterNewProject";
import StatusUpdate from "../Components/StatusUpdate";
import TimelineBuilder from "../Components/TimelineBuilder";
import ViewDocumentPage from "../Components/ViewDocumentPage";
import ViewUser from "../Components/ViewUser";
import CreateNotification from "../Components/CreateNotification";
import LandingPage from "../pages/LandingPage";
import Pricing from "../pages/Pricing";
import Services from "../pages/Services";
import Hero from "../pages/Hero";
import Contact from "../pages/Contact";
import SettingsAndPrivacy from "../pages/SettingsAndPrivacy";
import HelpAndSupport from "../pages/HelpAndSupport";
import SignInSignUp from "../pages/SignIn";
import DelayCostCalculator from "../Components/DelayCostCalculator";
import DPRCostBuilder from "../Components/DPRCostBuilder";
import ProtectedRoute from "./ProtectedRoutes";
import ProjectList from "../pages/ProjectList";
import KnowledgeCenter from "../Components/KnowledgeCenter";
import ActivityBudget from "../pages/ActivityBudget";
import ActivityCost from "../pages/ActivityCost";
import CommercialActivityPlanner from "../pages/ComercialActivityPlanner";
import ManageRaci from "../pages/ManageRaci";
import Dashboard from "../Components/Dashboard";
import { userStore } from "../Utils/UserStore";

const AppRoutes = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const computeAuth = () => {
            const raw = localStorage.getItem("user");
            if (!raw) {
                setIsAuthenticated(false);
                return;
            }
            try {
                const parsed = JSON.parse(raw);
                const valid = !!parsed && typeof parsed === "object" && (parsed.id != null || !!parsed.email);
                setIsAuthenticated(valid);
            } catch {
                setIsAuthenticated(false);
            }
        };

        computeAuth();
        const unsubscribe = userStore.subscribe(computeAuth);
        window.addEventListener("storage", computeAuth);

        return () => {
            unsubscribe();
            window.removeEventListener("storage", computeAuth);
        };
    }, []);

    return (
        <Router>
            <Routes>
                <Route
                    path="/home"
                    element={isAuthenticated ? <Navigate to="/knowledge-center" replace /> : <Home />}
                >
                    <Route index element={<Hero />} />
                    <Route path="services" element={<Services />} />
                    <Route path="pricing" element={<Pricing />} />
                    <Route path="contacts" element={<Contact />} />
                    <Route path="login" element={<SignInSignUp />} />
                </Route>

                <Route
                    path="/"
                    element={
                        isAuthenticated ? <Navigate to="/knowledge-center" replace /> : <Navigate to="/home" replace />
                    }
                />

                {/* Protected Routes with Layout */}
                <Route
                    element={
                        <ProtectedRoute>
                            <MainLayout />
                        </ProtectedRoute>
                    }
                >
                    {/* General pages (no special permission, just auth) */}
                    <Route path="/landing-page" element={<LandingPage />} />
                    <Route path="/settings" element={<SettingsAndPrivacy />} />
                    <Route path="/helps" element={<HelpAndSupport />} />
                    <Route path="/not-found" element={<NotFound />} />
                    <Route path="/profile" element={<Profile />} />

                    {/* Role-based protected pages */}
                    <Route
                        path="/create/register-new-project"
                        element={
                            <ProtectedRoute action="CREATE_PROJECT">
                                <RegisterNewProject />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/employee-registration"
                        element={
                            <ProtectedRoute action="ADD_TEAM_MEMBER">
                                <EmployeeRegistration />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/create/status-update"
                        element={
                            <ProtectedRoute action="UPDATE_STATUS">
                                <StatusUpdate />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/create/module-library"
                        element={
                            <ProtectedRoute action="CREATE_MODULE">
                                <ModuleLibrary />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/create/project-list"
                        element={
                            <ProtectedRoute action="VIEW_PROJECT_LIST">
                                <ProjectList />
                            </ProtectedRoute>
                        }
                    />

                     <Route
                        path="/update-project/:id"
                        element={
                            <ProtectedRoute>
                                <RegisterNewProject />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/knowledge-center"
                        element={
                            <ProtectedRoute>
                                <KnowledgeCenter />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/create/non-working-days"
                        element={
                            <ProtectedRoute action="SET_GLOBAL_HOLIDAY">
                                <HolidayCalender />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/create/raci-alert-notification"
                        element={
                            <ProtectedRoute action="ASSIGN_RASI">
                                <ManageUser />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/view-user"
                        element={
                            <ProtectedRoute action="VIEW_TEAM_MEMBERS">
                                <ViewUser />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/create/document"
                        element={
                            <ProtectedRoute action="ADD_GLOBAL_DOCUMENT">
                                <CreateDocument />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/view-document"
                        element={
                            <ProtectedRoute action="VIEW_NAVBAR_MENUS">
                                <ViewDocumentPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/notificationlibrary"
                        element={
                            <ProtectedRoute action="SET_NOTIFICATIONS">
                                <NotificationLibrary />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/create/timeline-builder"
                        element={
                            <ProtectedRoute action="BUILD_TIMEBUILDER">
                                <TimelineBuilder />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/data-master"
                        element={
                            <ProtectedRoute action="CREATE_MODULE">
                                <DataMaster />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/about"
                        element={
                            <ProtectedRoute action="VIEW_NAVBAR_MENUS">
                                <About />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/project"
                        element={
                            <ProtectedRoute action="VIEW_NAVBAR_MENUS">
                                <Projects />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute action="VIEW_NAVBAR_MENUS">
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/modules"
                        element={
                            <ProtectedRoute action="CREATE_MODULE">
                                <Module />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/document"
                        element={
                            <ProtectedRoute action="VIEW_NAVBAR_MENUS">
                                <Document />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/budgets"
                        element={
                            <ProtectedRoute action="VIEW_NAVBAR_MENUS">
                                <ActivityBudget />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/create/notification"
                        element={
                            <ProtectedRoute action="SET_NOTIFICATIONS">
                                <CreateNotification />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/create/delay-cost-calculator"
                        element={
                            <ProtectedRoute action="ADD_COST_IN_ACTIVITY">
                                <DelayCostCalculator />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/create/dpr-cost-builder"
                        element={
                            <ProtectedRoute action="ADD_COST_IN_ACTIVITY">
                                <DPRCostBuilder />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/racisearch"
                        element={
                            <ProtectedRoute action="ADD_COST_IN_ACTIVITY">
                                <ManageRaci />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/create/activitycost"
                        element={
                            <ProtectedRoute action="ADD_COST_IN_ACTIVITY">
                                <ActivityCost />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/create/commercialActivityplanner"
                        element={
                            <ProtectedRoute action="ADD_COST_IN_ACTIVITY">
                                <CommercialActivityPlanner />
                            </ProtectedRoute>
                        }
                    />

                    <Route path="*" element={<Navigate to="/not-found" replace />} />
                </Route>
            </Routes>
        </Router>
    );
};

export default AppRoutes;
