// import { Typography } from "@mui/material";
// import { Link, Outlet, useLocation } from "react-router-dom";
// import "../styles/home.css";
// import Footer from "./Footer";

// const Home = () => {
//   const location = useLocation();
//   const isHomeRoute = location.pathname === "/home";

//   const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

//   return (
//     <div className="page-containers">
//       <div className="content-wrap">
//         <header className="home-navbar">
//           <div className="logo-and-text-item">
//             <div className="logo-sections-cant">
//               <Link to="/home" aria-label="Go to Home">
//                 <img
//                   src="/images/logos/main-logo.png"
//                   alt="Logo"
//                   className="logo-image"
//                 />
//               </Link>
//             </div>
//             <div className="brand-text">
//               <p>Mine Development</p>
//               <p>Tracking System</p>
//             </div>
//           </div>

//           <nav className="tabs" aria-label="Primary navigation">
//             <Link
//               className={`tab-link ${isActive("/home") ? "active" : ""}`}
//               to="/home"
//             >
//               <Typography className="tab-items" variant="body1">
//                 Home
//               </Typography>
//             </Link>

//             <Link
//               className={`tab-link ${isActive("/home/services") ? "active" : ""}`}
//               to="/home/services"
//             >
//               <Typography className="tab-items" variant="body1">
//                 Services
//               </Typography>
//             </Link>

//             <Link
//               className={`tab-link ${isActive("/home/pricing") ? "active" : ""}`}
//               to="/home/pricing"
//             >
//               <Typography className="tab-items" variant="body1">
//                 Pricing
//               </Typography>
//             </Link>

//             <Link
//               className={`tab-link ${isActive("/home/contacts") ? "active" : ""}`}
//               to="/home/contacts"
//             >
//               <Typography className="tab-items" variant="body1">
//                 Contacts
//               </Typography>
//             </Link>

//             <Link
//               className={`tab-link ${isActive("/home/login") ? "active" : ""}`}
//               to="/home/login"
//             >
//               <Typography className="tab-items" variant="body1">
//                 Login
//               </Typography>
//             </Link>
//           </nav>
//         </header>

//         <div className="page-body">
//           {isHomeRoute ? (
//             <>
//               <div className="hero-wrapper">
//                 <Outlet />
//               </div>

//               <section className="what-we-do-section">
//                 <div className="content-wrapper">
//                   <div className="section-header">
//                     <Typography variant="h4" className="section-title">
//                       What we do
//                     </Typography>
//                     <Typography variant="body1" className="section-subtitle">
//                       A unified platform for mine development planning, execution, and governance—built for real-time visibility,
//                       control, and audit-ready decisions.
//                     </Typography>
//                   </div>

//                   <div className="hero-grid">
//                     <div className="hero-media">
//                       <img src="mining5.jpg" alt="Mine Render" className="mine-image" />
//                       <div className="media-overlay">
//                         <div className="overlay-chip">Real-time progress</div>
//                         <div className="overlay-chip">Cost & compliance</div>
//                         <div className="overlay-chip">Multi-site ready</div>
//                       </div>
//                     </div>

//                     <div className="hero-copy">
//                       <Typography variant="body1" className="section-description">
//                         At MineTrack Innovations, we deliver a comprehensive, enterprise-grade platform purpose-built for mine development
//                         planning, execution, and governance—seamlessly combining real-time operational visibility with deep industry
//                         expertise. From early greenfield exploration and feasibility studies through box cut, development, and sustaining
//                         operations, we enable teams to plan with confidence, execute with precision, and govern with clarity. By unifying
//                         activities, milestones, resources, contractor performance, and capital allocation into a single source of truth,
//                         MineTrack ensures decisions are timely, traceable, auditable, and consistently aligned to measurable outcomes,
//                         risk reduction, and long-term project value.
//                       </Typography>


//                       <Typography variant="body1" className="section-description">
//                         Our system connects geospatial progress, equipment and crew activity, and cost signals into one interface,
//                         allowing stakeholders to track what’s happening now, what’s at risk next, and what must change to stay on
//                         target.
//                       </Typography>

//                       <div className="trust-strip">
//                         <div className="trust-item">
//                           <div className="trust-metric">Plan → Execute</div>
//                           <div className="trust-label">Single system of record</div>
//                         </div>
//                         <div className="trust-item">
//                           <div className="trust-metric">Live Signals</div>
//                           <div className="trust-label">Field to dashboard</div>
//                         </div>
//                         <div className="trust-item">
//                           <div className="trust-metric">Audit-Ready</div>
//                           <div className="trust-label">Governance by design</div>
//                         </div>
//                       </div>
//                     </div>
//                   </div>

//                   <ul className="feature-list">
//                     <li className="feature-item">
//                       <div className="feature-top">
//                         <div className="feature-icon">⛏</div>
//                         <strong>Precision Development Mapping</strong>
//                       </div>
//                       <span>
//                         High-resolution geospatial mapping of development headings, benches, and excavation paths with continuous
//                         progress validation against plan.
//                       </span>
//                     </li>

//                     <li className="feature-item">
//                       <div className="feature-top">
//                         <div className="feature-icon">📍</div>
//                         <strong>End-to-End Progress Tracking</strong>
//                       </div>
//                       <span>
//                         Monitor activities, milestones, and inter-dependencies in real time to identify bottlenecks early and protect
//                         critical path delivery.
//                       </span>
//                     </li>

//                     <li className="feature-item">
//                       <div className="feature-top">
//                         <div className="feature-icon">📡</div>
//                         <strong>Live Equipment & Workforce Visibility</strong>
//                       </div>
//                       <span>
//                         Track movement, utilization, and availability of vehicles, crews, and assets across site locations for better
//                         operational coordination.
//                       </span>
//                     </li>

//                     <li className="feature-item">
//                       <div className="feature-top">
//                         <div className="feature-icon">⚙️</div>
//                         <strong>Automated Safety & Compliance Controls</strong>
//                       </div>
//                       <span>
//                         Built-in safety checks, rule validations, and compliance alerts that surface risks immediately and support
//                         audit readiness.
//                       </span>
//                     </li>

//                     <li className="feature-item">
//                       <div className="feature-top">
//                         <div className="feature-icon">💰</div>
//                         <strong>CAPEX & OPEX Cost Intelligence</strong>
//                       </div>
//                       <span>
//                         Real-time visibility into planned vs actual spend, enabling proactive cost control and early intervention
//                         before overruns occur.
//                       </span>
//                     </li>

//                     <li className="feature-item">
//                       <div className="feature-top">
//                         <div className="feature-icon">📊</div>
//                         <strong>Decision-Ready Dashboards</strong>
//                       </div>
//                       <span>
//                         Executive and site-level dashboards that translate field data into clear, actionable insights for faster,
//                         confident decisions.
//                       </span>
//                     </li>

//                     <li className="feature-item">
//                       <div className="feature-top">
//                         <div className="feature-icon">🌐</div>
//                         <strong>Scalable Cloud-First Architecture</strong>
//                       </div>
//                       <span>
//                         Secure, scalable platform designed for multi-site deployments with centralized governance, access control, and
//                         data consistency.
//                       </span>
//                     </li>
//                   </ul>

//                   <div className="choose-us-section">
//                     <div className="section-headline-row">
//                       <Typography variant="h5" className="section-title">
//                         Why Choose MineSense?
//                       </Typography>
//                       <div className="section-headline-pill">Built for delivery confidence</div>
//                     </div>

//                     <div className="choose-us-grid">
//                       <div className="choose-us-card">
//                         <Typography variant="h6" className="card-title">
//                           End-to-End Project Control
//                         </Typography>
//                         <Typography variant="body1" className="card-text">
//                           Manage work packages, timelines, and milestones across the entire mining lifecycle with clear ownership and
//                           measurable progress.
//                         </Typography>
//                       </div>

//                       <div className="choose-us-card">
//                         <Typography variant="h6" className="card-title">
//                           Real-Time Budget Tracking
//                         </Typography>
//                         <Typography variant="body1" className="card-text">
//                           Track CAPEX and OPEX with practical visibility and early warnings—so cost drift is caught before it becomes a
//                           variance.
//                         </Typography>
//                       </div>

//                       <div className="choose-us-card">
//                         <Typography variant="h6" className="card-title">
//                           AI-Powered Industry Intelligence
//                         </Typography>
//                         <Typography variant="body1" className="card-text">
//                           Stay informed with curated updates on regulations, market shifts, and operational trends relevant to your
//                           projects.
//                         </Typography>
//                       </div>

//                       <div className="choose-us-card">
//                         <Typography variant="h6" className="card-title">
//                           Expert Advisory Services
//                         </Typography>
//                         <Typography variant="body1" className="card-text">
//                           Leverage seasoned mining expertise to validate plans, de-risk execution, and improve delivery confidence.
//                         </Typography>
//                       </div>
//                     </div>
//                   </div>

//                   <div className="unique-features-section">
//                     <div className="section-headline-row">
//                       <Typography variant="h5" className="section-title">
//                         Unique Features
//                       </Typography>
//                       <div className="section-headline-pill">Operational intelligence, simplified</div>
//                     </div>

//                     <div className="unique-features-grid">
//                       <div className="feature-card">
//                         <Typography variant="h6" className="card-title">
//                           AI-Powered Mining News Feed
//                         </Typography>
//                         <Typography variant="body1" className="card-text">
//                           Real-time updates on global mining developments, commodity signals, and regulatory changes—organized for fast
//                           decision-making.
//                         </Typography>
//                       </div>

//                       <div className="feature-card">
//                         <Typography variant="h6" className="card-title">
//                           Company Social Hub
//                         </Typography>
//                         <Typography variant="body1" className="card-text">
//                           A controlled collaboration space to share updates, site announcements, lessons learned, and approvals—public
//                           or private.
//                         </Typography>
//                       </div>

//                       <div className="feature-card">
//                         <Typography variant="h6" className="card-title">
//                           Smart Notifications & Alerts
//                         </Typography>
//                         <Typography variant="body1" className="card-text">
//                           Instant alerts for milestone slippage, cost deviations, and compliance deadlines—delivered to the right owners
//                           at the right time.
//                         </Typography>
//                       </div>
//                     </div>
//                   </div>

//                   <div className="project-lifecycle-section">
//                     <div className="section-headline-row">
//                       <Typography variant="h5" className="section-title">
//                         Project Timeline Coverage
//                       </Typography>
//                       <div className="section-headline-pill">End-to-end lifecycle support</div>
//                     </div>

//                     <Typography variant="body1" className="section-description">
//                       MineSense is designed to support the full lifecycle of a mining project, ensuring planning, execution, and
//                       controls remain consistent as the operation scales.
//                     </Typography>

//                     <div className="lifecycle-track">
//                       <div className="lifecycle-step">
//                         <div className="step-badge">1</div>
//                         <div className="step-content">
//                           <Typography variant="h6" className="step-title">
//                             Greenfield Exploration
//                           </Typography>
//                           <Typography variant="body1" className="step-text">
//                             Consolidate early-stage activities, baseline scope, and stakeholder alignment for a cleaner transition into
//                             feasibility.
//                           </Typography>
//                         </div>
//                       </div>

//                       <div className="lifecycle-step">
//                         <div className="step-badge">2</div>
//                         <div className="step-content">
//                           <Typography variant="h6" className="step-title">
//                             Feasibility Study
//                           </Typography>
//                           <Typography variant="body1" className="step-text">
//                             Track assumptions, milestones, risk actions, and approvals while keeping costs and timelines transparent.
//                           </Typography>
//                         </div>
//                       </div>

//                       <div className="lifecycle-step">
//                         <div className="step-badge">3</div>
//                         <div className="step-content">
//                           <Typography variant="h6" className="step-title">
//                             Development & Box Cut
//                           </Typography>
//                           <Typography variant="body1" className="step-text">
//                             Measure real progress versus plan, monitor equipment/crew utilization, and control scope execution with
//                             compliance oversight.
//                           </Typography>
//                         </div>
//                       </div>

//                       <div className="lifecycle-step">
//                         <div className="step-badge">4</div>
//                         <div className="step-content">
//                           <Typography variant="h6" className="step-title">
//                             Production Ramp-Up
//                           </Typography>
//                           <Typography variant="body1" className="step-text">
//                             Improve ramp stability with clear bottleneck visibility, standardized reporting, and actionable operational
//                             insights.
//                           </Typography>
//                         </div>
//                       </div>

//                       <div className="lifecycle-step">
//                         <div className="step-badge">5</div>
//                         <div className="step-content">
//                           <Typography variant="h6" className="step-title">
//                             Sustaining Operations
//                           </Typography>
//                           <Typography variant="body1" className="step-text">
//                             Maintain governance, compliance, and cost discipline through consistent workflows, alerts, and performance
//                             dashboards.
//                           </Typography>
//                         </div>
//                       </div>
//                     </div>
//                   </div>

//                   <div className="governance-section">
//                     <div className="section-headline-row">
//                       <Typography variant="h5" className="section-title">
//                         Governance with Clear Accountability
//                       </Typography>
//                       <div className="section-headline-pill">Approvals, ownership, audit trails</div>
//                     </div>

//                     <Typography variant="body1" className="section-description">
//                       Align delivery teams with a practical accountability model across project, finance, operations, advisory, and
//                       contracting stakeholders. MineSense supports structured ownership, approvals, and audit-friendly decision trails.
//                     </Typography>

//                     <div className="governance-grid">
//                       <div className="governance-card">
//                         <Typography variant="h6" className="card-title">
//                           Project Management
//                         </Typography>
//                         <Typography variant="body1" className="card-text">
//                           Activity ownership, milestone tracking, dependencies, and variance visibility for consistent execution
//                           control.
//                         </Typography>
//                       </div>

//                       <div className="governance-card">
//                         <Typography variant="h6" className="card-title">
//                           Finance & Controls
//                         </Typography>
//                         <Typography variant="body1" className="card-text">
//                           Budget approvals, CAPEX/OPEX monitoring, and cost deviations highlighted early with accountable workflows.
//                         </Typography>
//                       </div>

//                       <div className="governance-card">
//                         <Typography variant="h6" className="card-title">
//                           Operations
//                         </Typography>
//                         <Typography variant="body1" className="card-text">
//                           Site execution visibility, utilization insights, and operational reporting that reflects real field status.
//                         </Typography>
//                       </div>

//                       <div className="governance-card">
//                         <Typography variant="h6" className="card-title">
//                           Advisory & Compliance
//                         </Typography>
//                         <Typography variant="body1" className="card-text">
//                           Structured reviews, compliance checkpoints, ESG-ready reporting foundations, and guidance for critical
//                           decisions.
//                         </Typography>
//                       </div>

//                       <div className="governance-card">
//                         <Typography variant="h6" className="card-title">
//                           Contractors & Vendors
//                         </Typography>
//                         <Typography variant="body1" className="card-text">
//                           Clear scope visibility, milestone expectations, and communication loops that reduce coordination gaps and
//                           execution delays.
//                         </Typography>
//                       </div>
//                     </div>
//                   </div>

//                   <div className="impacts-section">
//                     <div className="section-headline-row">
//                       <Typography variant="h5" className="section-title">
//                         Impacts and Outcomes
//                       </Typography>
//                       <div className="section-headline-pill">Measurable improvements</div>
//                     </div>

//                     <div className="outcomes-grid">
//                       <div className="outcome-item">
//                         <Typography variant="h6" className="card-title">
//                           Better Schedule Predictability
//                         </Typography>
//                         <Typography variant="body1" className="card-text">
//                           Early visibility into slippage drivers and dependency conflicts to protect critical path delivery.
//                         </Typography>
//                       </div>

//                       <div className="outcome-item">
//                         <Typography variant="h6" className="card-title">
//                           Stronger Cost Governance
//                         </Typography>
//                         <Typography variant="body1" className="card-text">
//                           Live tracking of CAPEX/OPEX signals with clear accountability to reduce overruns.
//                         </Typography>
//                       </div>

//                       <div className="outcome-item">
//                         <Typography variant="h6" className="card-title">
//                           Improved Safety & Compliance
//                         </Typography>
//                         <Typography variant="body1" className="card-text">
//                           Structured compliance checkpoints and alerts that reduce gaps and support audit readiness.
//                         </Typography>
//                       </div>

//                       <div className="outcome-item">
//                         <Typography variant="h6" className="card-title">
//                           Decision-Ready Visibility
//                         </Typography>
//                         <Typography variant="body1" className="card-text">
//                           Dashboards designed for action—so leadership can prioritize interventions and resources confidently.
//                         </Typography>
//                       </div>
//                     </div>
//                   </div>

//                   <div className="home-cta-section">
//                     <div className="cta-card">
//                       <div className="cta-text">
//                         <Typography variant="h5" className="section-title">
//                           Ready to Transform Your Mining Operations?
//                         </Typography>
//                         <Typography variant="body1" className="section-description">
//                           See how MineSense helps you plan, execute, and optimize every step—from exploration through sustaining
//                           operations—with real-time visibility and expert support.
//                         </Typography>
//                       </div>

//                       <div className="cta-actions">
//                         <Link to="/home/contacts" className="cta-button primary">
//                           Request a Demo
//                         </Link>
//                         <Link to="/home/services" className="cta-button secondary">
//                           Talk to Our Experts
//                         </Link>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </section>

//             </>
//           ) : (
//             <Outlet />
//           )}
//         </div>
//       </div>

//       <Footer />
//     </div>
//   );
// };

// export default Home;


import { Typography } from "@mui/material";
import { Link, Outlet, useLocation } from "react-router-dom";
import "../styles/home.css";
import Footer from "./Footer";

const Home = () => {
  const location = useLocation();
  const isHomeRoute = location.pathname === "/home";

  const isActive = (path: string, exact = false) =>
    exact
      ? location.pathname === path
      : location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div className="page-containers">
      <div className="content-wrap">
        <header className="home-navbar">
          <div className="logo-and-text-item">
            <div className="logo-sections-cant">
              <Link to="/home" aria-label="Go to Home">
                <img
                  src="/images/logos/main-logo.png"
                  alt="MineSense Logo"
                  className="logo-image"
                />
              </Link>
            </div>
            <div className="brand-text">
              <p>MineSense</p>
              <p>Mine Development Tracking System</p>
            </div>
          </div>

          <nav className="tabs" aria-label="Primary navigation">
            <Link className={`tab-link ${isActive("/home", true) ? "active" : ""}`} to="/home">
              <Typography className="tab-items" variant="body1">Home</Typography>
            </Link>

            <Link
              className={`tab-link ${isActive("/home/services") ? "active" : ""}`}
              to="/home/services"
            >
              <Typography className="tab-items" variant="body1">Services</Typography>
            </Link>

            <Link
              className={`tab-link ${isActive("/home/pricing") ? "active" : ""}`}
              to="/home/pricing"
            >
              <Typography className="tab-items" variant="body1">Pricing</Typography>
            </Link>

            <Link
              className={`tab-link ${isActive("/home/contacts") ? "active" : ""}`}
              to="/home/contacts"
            >
              <Typography className="tab-items" variant="body1">Contacts</Typography>
            </Link>

            <Link className={`tab-link tab-link--login ${isActive("/home/login") ? "active" : ""}`} to="/home/login">
              <Typography className="tab-items" variant="body1">Login</Typography>
            </Link>
          </nav>
        </header>

        <div className="page-body">
          {isHomeRoute ? (
            <>
              {/* HERO (your Outlet can render hero headline / buttons if you want) */}
              <div className="hero-wrapper">
                <Outlet />
              </div>

              <section className="what-we-do-section">
                <div className="content-wrapper">
                  {/* SECTION HEADER */}
                  <div className="section-header">
                    <Typography variant="h4" className="section-title">
                      Plan. Execute. Govern — in one mine development system.
                    </Typography>

                    <Typography variant="body1" className="section-subtitle">
                      MineSense unifies schedules, progress, cost signals, and compliance checkpoints into a single source of truth—
                      so teams move faster with audit-ready confidence.
                    </Typography>
                  </div>

                  {/* HERO GRID */}
                  <div className="hero-grid">
                    <div className="hero-media">
                      <img src="mining5.jpg" alt="Mine Development Overview" className="mine-image" />

                      <div className="media-overlay">
                        <div className="overlay-chip">Live progress vs plan</div>
                        <div className="overlay-chip">CAPEX & OPEX control</div>
                        <div className="overlay-chip">Governance & audit trails</div>
                      </div>
                    </div>

                    <div className="hero-copy">
                      <Typography variant="body1" className="section-description">
                        MineSense is built for mine development delivery teams who need clarity at every stage—exploration, feasibility,
                        box cut, development, ramp-up, and sustaining operations. We connect planning and execution with practical,
                        field-ready workflows that keep ownership clear, risks visible, and decisions traceable.
                      </Typography>

                      <Typography variant="body1" className="section-description">
                        From activity sequencing and dependency control to real-time progress capture and cost governance, MineSense
                        helps stakeholders understand what’s happening now, what’s at risk next, and what action will protect the plan.
                      </Typography>

                      {/* TRUST STRIP */}
                      <div className="trust-strip">
                        <div className="trust-item">
                          <div className="trust-metric">Single Source</div>
                          <div className="trust-label">Plan → execution alignment</div>
                        </div>
                        <div className="trust-item">
                          <div className="trust-metric">Real-Time Signals</div>
                          <div className="trust-label">Field updates to dashboards</div>
                        </div>
                        <div className="trust-item">
                          <div className="trust-metric">Audit-Ready</div>
                          <div className="trust-label">Approvals & traceability</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CAPABILITIES LIST */}
                  <ul className="feature-list">
                    <li className="feature-item">
                      <div className="feature-top">
                        <div className="feature-icon">⛏</div>
                        <strong>Development Mapping & Validation</strong>
                      </div>
                      <span>
                        Capture headings, benches, and excavation progress with structured validation against baseline and revised plans.
                      </span>
                    </li>

                    <li className="feature-item">
                      <div className="feature-top">
                        <div className="feature-icon">🧭</div>
                        <strong>Schedule & Dependency Control</strong>
                      </div>
                      <span>
                        Track work packages, dependencies, and milestones in real time to protect critical path and reduce slippage.
                      </span>
                    </li>

                    <li className="feature-item">
                      <div className="feature-top">
                        <div className="feature-icon">📡</div>
                        <strong>Equipment & Workforce Visibility</strong>
                      </div>
                      <span>
                        Monitor utilization, availability, and site movements for better coordination across teams and contractors.
                      </span>
                    </li>

                    <li className="feature-item">
                      <div className="feature-top">
                        <div className="feature-icon">🛡️</div>
                        <strong>Safety & Compliance Checks</strong>
                      </div>
                      <span>
                        Embed rule validations and compliance checkpoints into workflows with alerts that support audit readiness.
                      </span>
                    </li>

                    <li className="feature-item">
                      <div className="feature-top">
                        <div className="feature-icon">💰</div>
                        <strong>CAPEX & OPEX Governance</strong>
                      </div>
                      <span>
                        Compare planned vs actual spend with early warnings to prevent cost drift and improve financial control.
                      </span>
                    </li>

                    <li className="feature-item">
                      <div className="feature-top">
                        <div className="feature-icon">📊</div>
                        <strong>Decision-Ready Dashboards</strong>
                      </div>
                      <span>
                        Site and leadership dashboards that translate field signals into clear actions and priority interventions.
                      </span>
                    </li>

                    <li className="feature-item">
                      <div className="feature-top">
                        <div className="feature-icon">☁️</div>
                        <strong>Cloud-First, Multi-Site Ready</strong>
                      </div>
                      <span>
                        Built for scale: centralized access control, consistent data standards, and secure multi-site deployments.
                      </span>
                    </li>
                  </ul>

                  {/* WHY CHOOSE */}
                  <div className="choose-us-section">
                    <div className="section-headline-row">
                      <Typography variant="h5" className="section-title">
                        Why MineSense?
                      </Typography>
                      <div className="section-headline-pill">Built for delivery confidence</div>
                    </div>

                    <div className="choose-us-grid">
                      <div className="choose-us-card">
                        <Typography variant="h6" className="card-title">
                          End-to-End Project Control
                        </Typography>
                        <Typography variant="body1" className="card-text">
                          Clear ownership, structured work packages, and consistent reporting—from plan definition to execution closure.
                        </Typography>
                      </div>

                      <div className="choose-us-card">
                        <Typography variant="h6" className="card-title">
                          Practical Cost Visibility
                        </Typography>
                        <Typography variant="body1" className="card-text">
                          Real-world CAPEX/OPEX tracking with variance signals that help teams act early—not after overruns land.
                        </Typography>
                      </div>

                      <div className="choose-us-card">
                        <Typography variant="h6" className="card-title">
                          Governance by Design
                        </Typography>
                        <Typography variant="body1" className="card-text">
                          Built-in approvals, decision trails, and compliance checkpoints—so audits are simpler and accountability is clear.
                        </Typography>
                      </div>

                      <div className="choose-us-card">
                        <Typography variant="h6" className="card-title">
                          Advisory-Ready Execution
                        </Typography>
                        <Typography variant="body1" className="card-text">
                          Designed to work with your teams, consultants, and contractors—reducing coordination gaps and delivery risk.
                        </Typography>
                      </div>
                    </div>
                  </div>

                  {/* UNIQUE FEATURES */}
                  <div className="unique-features-section">
                    <div className="section-headline-row">
                      <Typography variant="h5" className="section-title">
                        Unique Features
                      </Typography>
                      <div className="section-headline-pill">Operational intelligence, simplified</div>
                    </div>

                    <div className="unique-features-grid">
                      <div className="feature-card">
                        <Typography variant="h6" className="card-title">
                          Mining Intelligence Feed
                        </Typography>
                        <Typography variant="body1" className="card-text">
                          Curated updates on regulations, commodity movements, and industry signals—organized for fast decisions.
                        </Typography>
                      </div>

                      <div className="feature-card">
                        <Typography variant="h6" className="card-title">
                          Controlled Social & Updates Hub
                        </Typography>
                        <Typography variant="body1" className="card-text">
                          Share announcements, learnings, approvals, and progress highlights—public or restricted by role.
                        </Typography>
                      </div>

                      <div className="feature-card">
                        <Typography variant="h6" className="card-title">
                          Smart Alerts & Notifications
                        </Typography>
                        <Typography variant="body1" className="card-text">
                          Alerts for slippage, dependency risk, cost variance, and compliance deadlines—sent to the right owners.
                        </Typography>
                      </div>
                    </div>
                  </div>

                  {/* LIFECYCLE */}
                  <div className="project-lifecycle-section">
                    <div className="section-headline-row">
                      <Typography variant="h5" className="section-title">
                        Project Timeline Coverage
                      </Typography>
                      <div className="section-headline-pill">End-to-end lifecycle support</div>
                    </div>

                    <Typography variant="body1" className="section-description">
                      MineSense supports consistent planning and control as your mine scales—from early study phases to sustained operations.
                    </Typography>

                    <div className="lifecycle-track">
                      <div className="lifecycle-step">
                        <div className="step-badge">1</div>
                        <div className="step-content">
                          <Typography variant="h6" className="step-title">Greenfield Exploration</Typography>
                          <Typography variant="body1" className="step-text">
                            Consolidate early activities, assumptions, and baselines for a clean handover into feasibility.
                          </Typography>
                        </div>
                      </div>

                      <div className="lifecycle-step">
                        <div className="step-badge">2</div>
                        <div className="step-content">
                          <Typography variant="h6" className="step-title">Feasibility Study</Typography>
                          <Typography variant="body1" className="step-text">
                            Track milestones, risk actions, approvals, and estimate updates while maintaining traceability.
                          </Typography>
                        </div>
                      </div>

                      <div className="lifecycle-step">
                        <div className="step-badge">3</div>
                        <div className="step-content">
                          <Typography variant="h6" className="step-title">Development & Box Cut</Typography>
                          <Typography variant="body1" className="step-text">
                            Measure progress against plan with clear dependencies, equipment signals, and compliance oversight.
                          </Typography>
                        </div>
                      </div>

                      <div className="lifecycle-step">
                        <div className="step-badge">4</div>
                        <div className="step-content">
                          <Typography variant="h6" className="step-title">Production Ramp-Up</Typography>
                          <Typography variant="body1" className="step-text">
                            Stabilize delivery with bottleneck visibility, standardized reporting, and operational dashboards.
                          </Typography>
                        </div>
                      </div>

                      <div className="lifecycle-step">
                        <div className="step-badge">5</div>
                        <div className="step-content">
                          <Typography variant="h6" className="step-title">Sustaining Operations</Typography>
                          <Typography variant="body1" className="step-text">
                            Maintain governance and cost discipline through consistent workflows, alerts, and ownership models.
                          </Typography>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* GOVERNANCE */}
                  <div className="governance-section">
                    <div className="section-headline-row">
                      <Typography variant="h5" className="section-title">
                        Governance with Clear Accountability
                      </Typography>
                      <div className="section-headline-pill">Approvals, ownership, audit trails</div>
                    </div>

                    <Typography variant="body1" className="section-description">
                      Align delivery teams across project, finance, operations, advisory, and contracting stakeholders with structured
                      ownership and auditable decision trails.
                    </Typography>

                    <div className="governance-grid">
                      <div className="governance-card">
                        <Typography variant="h6" className="card-title">Project Management</Typography>
                        <Typography variant="body1" className="card-text">
                          Ownership, milestones, dependencies, and variance visibility for consistent execution control.
                        </Typography>
                      </div>

                      <div className="governance-card">
                        <Typography variant="h6" className="card-title">Finance & Controls</Typography>
                        <Typography variant="body1" className="card-text">
                          Budget approvals, spend tracking, and variance alerts with a clear accountability chain.
                        </Typography>
                      </div>

                      <div className="governance-card">
                        <Typography variant="h6" className="card-title">Operations</Typography>
                        <Typography variant="body1" className="card-text">
                          Site execution visibility, utilization insights, and reporting that reflects real field status.
                        </Typography>
                      </div>

                      <div className="governance-card">
                        <Typography variant="h6" className="card-title">Advisory & Compliance</Typography>
                        <Typography variant="body1" className="card-text">
                          Structured reviews, compliance checkpoints, and ESG-ready reporting foundations for critical decisions.
                        </Typography>
                      </div>

                      <div className="governance-card">
                        <Typography variant="h6" className="card-title">Contractors & Vendors</Typography>
                        <Typography variant="body1" className="card-text">
                          Scope clarity, milestone expectations, and communication loops that reduce coordination gaps.
                        </Typography>
                      </div>
                    </div>
                  </div>

                  {/* OUTCOMES */}
                  <div className="impacts-section">
                    <div className="section-headline-row">
                      <Typography variant="h5" className="section-title">
                        Outcomes You Can Measure
                      </Typography>
                      <div className="section-headline-pill">Predictability, control, confidence</div>
                    </div>

                    <div className="outcomes-grid">
                      <div className="outcome-item">
                        <Typography variant="h6" className="card-title">Better Schedule Predictability</Typography>
                        <Typography variant="body1" className="card-text">
                          Early visibility into slippage drivers and dependency risk to protect the critical path.
                        </Typography>
                      </div>

                      <div className="outcome-item">
                        <Typography variant="h6" className="card-title">Stronger Cost Governance</Typography>
                        <Typography variant="body1" className="card-text">
                          Track CAPEX/OPEX signals with accountable workflows to reduce overruns.
                        </Typography>
                      </div>

                      <div className="outcome-item">
                        <Typography variant="h6" className="card-title">Improved Safety & Compliance</Typography>
                        <Typography variant="body1" className="card-text">
                          Built-in checkpoints and alerts that reduce gaps and support audit readiness.
                        </Typography>
                      </div>

                      <div className="outcome-item">
                        <Typography variant="h6" className="card-title">Decision-Ready Visibility</Typography>
                        <Typography variant="body1" className="card-text">
                          Dashboards designed for action—so leadership can prioritize interventions confidently.
                        </Typography>
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="home-cta-section">
                    <div className="cta-card">
                      <div className="cta-text">
                        <Typography variant="h5" className="section-title">
                          Bring control and clarity to mine development delivery.
                        </Typography>
                        <Typography variant="body1" className="section-description">
                          Request a demo to see how MineSense supports planning, execution, and governance with real-time visibility and
                          traceable decisions.
                        </Typography>
                      </div>

                      <div className="cta-actions">
                        <Link to="/home/contacts" className="cta-button primary">
                          Request a Demo
                        </Link>
                        <Link to="/home/services" className="cta-button secondary">
                          Explore Services
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <Outlet />
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Home;
