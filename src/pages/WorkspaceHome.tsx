import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
    animate,
    motion,
    useInView,
    useMotionValue,
    useReducedMotion,
    useSpring,
    useTransform,
} from "framer-motion";
import { Button } from "antd";
import {
    BookOutlined,
    ProjectOutlined,
    ScheduleOutlined,
    FileTextOutlined,
    SettingOutlined,
    TeamOutlined,
    FormOutlined,
    CompassOutlined,
    LineChartOutlined,
    CalendarOutlined,
    ApartmentOutlined,
    ArrowRightOutlined,
} from "@ant-design/icons";
import { db } from "../Utils/dataStorege";
import { userStore } from "../Utils/UserStore";
import { hasPermission } from "../Utils/auth";
import type { Permission, Role } from "../config/permissions";
import "../styles/workspace-home.css";

type Summary = {
    projectCount: number;
    projectsWithTimeline: number;
    timelineVersions: number;
};

type QuickTile = {
    key: string;
    title: string;
    description: string;
    icon: ReactNode;
    path: string;
    permission: Permission;
};

function getTimeGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
}

const easeSmooth = [0.16, 1, 0.3, 1] as const;

const springSnappy = { type: "spring" as const, stiffness: 120, damping: 20, mass: 0.85 };
const springSoft = { type: "spring" as const, stiffness: 80, damping: 18, mass: 0.95 };

const viewportOnce = { once: true as const, margin: "-48px" as const, amount: 0.2 as const };

function buildWorkspaceVariants(reduced: boolean) {
    const ease = { duration: 0.45, ease: easeSmooth };
    const hi = reduced ? ease : springSnappy;
    const card = reduced ? { duration: 0.5, ease: easeSmooth } : springSoft;
    return {
        heroContainer: {
            hidden: { opacity: 0 },
            show: {
                opacity: 1,
                transition: { staggerChildren: reduced ? 0.07 : 0.11, delayChildren: reduced ? 0.02 : 0.06 },
            },
        },
        heroItem: {
            hidden: { opacity: 0, y: reduced ? 18 : 32, filter: reduced ? "blur(0px)" : "blur(10px)" },
            show: {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                transition: hi,
            },
        },
        chipContainer: {
            hidden: { opacity: 0 },
            show: {
                opacity: 1,
                transition: { staggerChildren: reduced ? 0.05 : 0.08, delayChildren: 0 },
            },
        },
        chipItem: {
            hidden: { opacity: 0, scale: 0.82, y: 10, rotate: reduced ? 0 : -6 },
            show: {
                opacity: 1,
                scale: 1,
                y: 0,
                rotate: 0,
                transition: reduced ? ease : springSoft,
            },
        },
        statList: {
            hidden: {},
            show: {
                transition: { staggerChildren: reduced ? 0.09 : 0.14, delayChildren: 0.08 },
            },
        },
        statCard: {
            hidden: { opacity: 0, y: 32, scale: 0.9, rotateX: reduced ? 0 : 8 },
            show: {
                opacity: 1,
                y: 0,
                scale: 1,
                rotateX: 0,
                transition: card,
            },
        },
        tileList: {
            hidden: {},
            show: {
                transition: { staggerChildren: reduced ? 0.06 : 0.09, delayChildren: 0.05 },
            },
        },
        tileItem: {
            hidden: { opacity: 0, y: 24, scale: 0.92, rotate: reduced ? 0 : -2 },
            show: {
                opacity: 1,
                y: 0,
                scale: 1,
                rotate: 0,
                transition: reduced ? ease : springSoft,
            },
        },
        pillarList: {
            hidden: {},
            show: {
                transition: { staggerChildren: reduced ? 0.1 : 0.16, delayChildren: 0.06 },
            },
        },
        pillarItem: {
            hidden: { opacity: 0, y: 40, skewY: reduced ? 0 : 2 },
            show: {
                opacity: 1,
                y: 0,
                skewY: 0,
                transition: reduced ? { duration: 0.55, ease: easeSmooth } : springSoft,
            },
        },
        flowList: {
            hidden: {},
            show: {
                transition: { staggerChildren: reduced ? 0.08 : 0.12, delayChildren: 0.1 },
            },
        },
        flowStep: {
            hidden: { opacity: 0, x: reduced ? -12 : -28, scale: 0.96 },
            show: {
                opacity: 1,
                x: 0,
                scale: 1,
                transition: reduced ? ease : springSnappy,
            },
        },
    };
}

function AnimatedStatValue({ value, skipAnimation }: { value: number; skipAnimation: boolean }) {
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-40px", amount: 0.5 });
    const [display, setDisplay] = useState(skipAnimation ? value : 0);

    useEffect(() => {
        if (skipAnimation) {
            setDisplay(value);
            return;
        }
        if (!isInView) return;
        const ctrl = animate(0, value, {
            duration: 1.35,
            ease: easeSmooth,
            onUpdate: (v) => setDisplay(Math.round(v)),
        });
        return () => ctrl.stop();
    }, [isInView, value, skipAnimation]);

    return (
        <span ref={ref} className="wh-stat-value-num">
            {display}
        </span>
    );
}

function TiltHeroFrame({ disabled, children }: { disabled: boolean; children: ReactNode }) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const mx = useMotionValue(0);
    const my = useMotionValue(0);
    const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [11, -11]), { stiffness: 260, damping: 30 });
    const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-13, 13]), { stiffness: 260, damping: 30 });

    function onMove(e: MouseEvent<HTMLDivElement>) {
        if (disabled || !wrapRef.current) return;
        const b = wrapRef.current.getBoundingClientRect();
        mx.set((e.clientX - b.left) / b.width - 0.5);
        my.set((e.clientY - b.top) / b.height - 0.5);
    }
    function onLeave() {
        mx.set(0);
        my.set(0);
    }

    return (
        <motion.div
            ref={wrapRef}
            className="wh-hero-tilt"
            style={
                disabled
                    ? undefined
                    : {
                          rotateX,
                          rotateY,
                          transformStyle: "preserve-3d",
                      }
            }
            onMouseMove={onMove}
            onMouseLeave={onLeave}
        >
            {children}
        </motion.div>
    );
}

const WorkspaceHome = () => {
    const navigate = useNavigate();
    const prefersReducedMotion = useReducedMotion();
    const v = useMemo(() => buildWorkspaceVariants(!!prefersReducedMotion), [prefersReducedMotion]);
    const [user, setUser] = useState<any>(null);
    const [summary, setSummary] = useState<Summary>({
        projectCount: 0,
        projectsWithTimeline: 0,
        timelineVersions: 0,
    });

    useEffect(() => {
        const sync = () => setUser(userStore.getUser());
        sync();
        return userStore.subscribe(sync);
    }, []);

    const [timeGreeting, setTimeGreeting] = useState(() => getTimeGreeting());
    useEffect(() => {
        const refresh = () => setTimeGreeting(getTimeGreeting());
        refresh();
        const intervalId = window.setInterval(refresh, 60_000);
        const onVisibility = () => {
            if (document.visibilityState === "visible") refresh();
        };
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            window.clearInterval(intervalId);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, []);

    useEffect(() => {
        let active = true;
        const load = async () => {
            const u = userStore.getUser();
            const orgId = u?.orgId != null ? String(u.orgId) : "";
            try {
                const projects = (await db.getProjects()) || [];
                const orgProjects = orgId
                    ? projects.filter((p: any) => String(p?.orgId || "") === orgId)
                    : projects;
                const withTl = orgProjects.filter(
                    (p: any) => Array.isArray(p?.projectTimeline) && p.projectTimeline.length > 0
                );
                const timelineVersions = orgProjects.reduce((sum: number, p: any) => {
                    const n = Array.isArray(p?.projectTimeline) ? p.projectTimeline.length : 0;
                    return sum + n;
                }, 0);
                if (!active) return;
                setSummary({
                    projectCount: orgProjects.length,
                    projectsWithTimeline: withTl.length,
                    timelineVersions,
                });
            } catch {
                if (active) setSummary({ projectCount: 0, projectsWithTimeline: 0, timelineVersions: 0 });
            }
        };
        load();
        return () => {
            active = false;
        };
    }, [user?.orgId]);

    const role = String(user?.role || "") as Role;
    const can = (action: QuickTile["permission"]) =>
        hasPermission(role, action) || role === "mdtsAdmin";

    const displayName = String(user?.name || "there").trim() || "there";
    const firstName = displayName.split(/\s+/)[0] || displayName;

    const tiles: QuickTile[] = useMemo(
        () => [
            {
                key: "projects",
                title: "Projects",
                description: "Open your portfolio, register work, and track delivery across sites.",
                icon: <ProjectOutlined />,
                path: "/project",
                permission: "VIEW_NAVBAR_MENUS",
            },
            {
                key: "kc",
                title: "Knowledge Center",
                description: "Central hub for guidance, references, and curated mining intelligence.",
                icon: <BookOutlined />,
                path: "/knowledge-center",
                permission: "VIEW_NAVBAR_MENUS",
            },
            {
                key: "timeline",
                title: "Timeline Builder",
                description: "Model sequences, dependencies, and approvals for critical path control.",
                icon: <ScheduleOutlined />,
                path: "/create/timeline-builder",
                permission: "BUILD_TIMEBUILDER",
            },
            {
                key: "status",
                title: "Status Update",
                description: "Record progress, risks, and field signals with structured updates.",
                icon: <LineChartOutlined />,
                path: "/create/status-update",
                permission: "UPDATE_STATUS",
            },
            {
                key: "documents",
                title: "Documents",
                description: "Access controlled document sets linked to modules and activities.",
                icon: <FileTextOutlined />,
                path: "/document",
                permission: "VIEW_NAVBAR_MENUS",
            },
            {
                key: "modules",
                title: "Modules",
                description: "Configure MDTS modules, libraries, and organization-specific building blocks.",
                icon: <CompassOutlined />,
                path: "/modules",
                permission: "CREATE_MODULE",
            },
            {
                key: "team",
                title: "Team Members",
                description: "Manage roles, access, and collaboration across your workspace.",
                icon: <TeamOutlined />,
                path: "/view-user",
                permission: "VIEW_TEAM_MEMBERS",
            },
            {
                key: "notepad",
                title: "Notepad",
                description: "Capture notes and working ideas without leaving the workspace.",
                icon: <FormOutlined />,
                path: "/create/notepad",
                permission: "VIEW_NAVBAR_MENUS",
            },
            {
                key: "settings",
                title: "Settings & privacy",
                description: "Notifications, organization profile fields, and account preferences.",
                icon: <SettingOutlined />,
                path: "/settings",
                permission: "VIEW_NAVBAR_MENUS",
            },
        ],
        []
    );

    const visibleTiles = tiles.filter((t) => can(t.permission));

    const heroMotion = prefersReducedMotion
        ? { initial: "show" as const, animate: "show" as const }
        : { initial: "hidden" as const, animate: "show" as const };

    return (
        <div className="wh-page">
            <div className="wh-page-bg" aria-hidden />
            <header className="wh-hero">
                <motion.div
                    className="wh-hero-blob wh-hero-blob--1"
                    aria-hidden
                    animate={
                        prefersReducedMotion
                            ? undefined
                            : { scale: [1, 1.08, 1], opacity: [0.45, 0.6, 0.45] }
                    }
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="wh-hero-blob wh-hero-blob--2"
                    aria-hidden
                    animate={
                        prefersReducedMotion
                            ? undefined
                            : { scale: [1, 1.12, 1], opacity: [0.4, 0.55, 0.4] }
                    }
                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                />
                <div className="wh-hero-inner">
                    <div className="wh-hero-copy">
                        <motion.div
                            className="wh-hero-copy-panel"
                            variants={v.heroContainer}
                            {...heroMotion}
                        >
                            <motion.p className="wh-greeting" variants={v.heroItem}>
                                <em>{timeGreeting}</em>, you&apos;re in the right place.
                            </motion.p>
                            <motion.h1 className="wh-title" variants={v.heroItem}>
                                Glad you&apos;re here,{" "}
                                <span className="wh-title-name">{firstName}</span>
                            </motion.h1>
                            <motion.p className="wh-lead" variants={v.heroItem}>
                                This is your workspace home—where mine development plans meet daily execution. Pick up where you left off,
                                open a project, or dive into knowledge and tools built for your role.
                            </motion.p>
                            <motion.div
                                className="wh-chip-row"
                                aria-hidden
                                variants={v.chipContainer}
                            >
                                {["Plan", "Track", "Govern", "One team"].map((label) => (
                                    <motion.span key={label} className="wh-chip" variants={v.chipItem}>
                                        {label}
                                    </motion.span>
                                ))}
                            </motion.div>
                            <motion.div
                                className="wh-hero-actions"
                                variants={v.heroItem}
                            >
                                <Button type="primary" size="large" className="wh-btn-primary" onClick={() => navigate("/project")} icon={<ProjectOutlined />}>
                                    Open projects
                                </Button>
                                <Button size="large" className="wh-btn-ghost" onClick={() => navigate("/knowledge-center")} icon={<BookOutlined />}>
                                    Knowledge Center
                                </Button>
                                <Button size="large" className="wh-btn-ghost" onClick={() => navigate("/profile")}>
                                    Your profile
                                </Button>
                            </motion.div>
                        </motion.div>
                    </div>
                    <motion.div
                        className="wh-hero-visual"
                        aria-hidden
                        initial={prefersReducedMotion ? false : { opacity: 0, x: 56, rotateY: -12 }}
                        animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0, rotateY: 0 }}
                        transition={
                            prefersReducedMotion
                                ? undefined
                                : { type: "spring", stiffness: 70, damping: 22, mass: 0.9, delay: 0.08 }
                        }
                        style={{ perspective: 1100 }}
                    >
                        <motion.div
                            className="wh-hero-ring wh-hero-ring--1"
                            animate={prefersReducedMotion ? undefined : { rotate: 360 }}
                            transition={{ duration: 52, repeat: Infinity, ease: "linear" }}
                        />
                        <motion.div
                            className="wh-hero-ring wh-hero-ring--2"
                            animate={prefersReducedMotion ? undefined : { rotate: -360 }}
                            transition={{ duration: 68, repeat: Infinity, ease: "linear" }}
                        />
                        <TiltHeroFrame disabled={!!prefersReducedMotion}>
                            <div className="wh-hero-frame">
                                <motion.div
                                    className="wh-float-badge wh-float-badge--tl"
                                    animate={
                                        prefersReducedMotion
                                            ? undefined
                                            : { y: [0, -7, 0], rotate: [0, 2, 0, -2, 0] }
                                    }
                                    transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
                                >
                                    <span>Live visibility</span>
                                    Field to dashboard in one flow
                                </motion.div>
                                <motion.div
                                    className="wh-float-badge wh-float-badge--br"
                                    animate={
                                        prefersReducedMotion
                                            ? undefined
                                            : { y: [0, 8, 0], rotate: [0, -2, 0, 2, 0] }
                                    }
                                    transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                                >
                                    <span>Built for mining</span>
                                    Timelines, costs &amp; compliance
                                </motion.div>
                                <motion.div
                                    className="wh-hero-frame-inner"
                                    initial={prefersReducedMotion ? false : { opacity: 0, scale: 1.08, filter: "blur(6px)" }}
                                    animate={prefersReducedMotion ? undefined : { opacity: 1, scale: 1, filter: "blur(0px)" }}
                                    transition={{ type: "spring", stiffness: 90, damping: 22, delay: 0.28 }}
                                >
                                    <img
                                        className="wh-hero-img"
                                        src="/images/auths/signin.png"
                                        alt="Mining operations and digital planning"
                                    />
                                </motion.div>
                            </div>
                        </TiltHeroFrame>
                    </motion.div>
                </div>
            </header>

            <section className="wh-showcase">
                <div className="wh-showcase-bg" aria-hidden />
                <div className="wh-showcase-inner">
                    <motion.span
                        className="wh-showcase-mark"
                        aria-hidden
                        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.5, rotate: -8 }}
                        whileInView={prefersReducedMotion ? undefined : { opacity: 1, scale: 1, rotate: 0 }}
                        viewport={viewportOnce}
                        transition={{ duration: 0.6, ease: easeSmooth }}
                    >
                        “
                    </motion.span>
                    <motion.p
                        className="wh-showcase-quote"
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 28 }}
                        whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                        viewport={viewportOnce}
                        transition={{ duration: 0.65, delay: 0.08, ease: easeSmooth }}
                    >
                        From exploration to sustaining operations—clarity, control, and confidence in every shift.
                    </motion.p>
                    <motion.p
                        className="wh-showcase-sub"
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                        whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                        viewport={viewportOnce}
                        transition={{ duration: 0.55, delay: 0.18, ease: easeSmooth }}
                    >
                        MineSense MDTS connects people, projects, and data so your organization can move faster with decisions you can
                        stand behind.
                    </motion.p>
                </div>
            </section>

            <div className="wh-body">
                <motion.div
                    className="wh-section-head wh-section-head--stats"
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                    whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                    viewport={viewportOnce}
                    transition={{ duration: 0.5, ease: easeSmooth }}
                >
                    <span className="wh-eyebrow">At a glance</span>
                    <h2 className="wh-section-title">Your workspace pulse</h2>
                    <p className="wh-section-sub">Live counts from projects linked to your organization.</p>
                </motion.div>
                <motion.div
                    className="wh-stats"
                    variants={v.statList}
                    initial={prefersReducedMotion ? "show" : "hidden"}
                    whileInView={prefersReducedMotion ? undefined : "show"}
                    viewport={viewportOnce}
                    style={prefersReducedMotion ? undefined : { perspective: 1000 }}
                >
                    <motion.div
                        className="wh-stat-card wh-stat-card--lead"
                        variants={v.statCard}
                        style={prefersReducedMotion ? undefined : { transformStyle: "preserve-3d" }}
                    >
                        <div className="wh-stat-top">
                            <span className="wh-stat-icon-wrap" aria-hidden>
                                <ProjectOutlined />
                            </span>
                        </div>
                        <div className="wh-stat-value">
                            <AnimatedStatValue value={summary.projectCount} skipAnimation={!!prefersReducedMotion} />
                        </div>
                        <div className="wh-stat-label">Workspace projects</div>
                    </motion.div>
                    <motion.div
                        className="wh-stat-card"
                        variants={v.statCard}
                        style={prefersReducedMotion ? undefined : { transformStyle: "preserve-3d" }}
                    >
                        <div className="wh-stat-top">
                            <span className="wh-stat-icon-wrap" aria-hidden>
                                <CalendarOutlined />
                            </span>
                        </div>
                        <div className="wh-stat-value">
                            <AnimatedStatValue value={summary.projectsWithTimeline} skipAnimation={!!prefersReducedMotion} />
                        </div>
                        <div className="wh-stat-label">With timelines</div>
                    </motion.div>
                    <motion.div
                        className="wh-stat-card"
                        variants={v.statCard}
                        style={prefersReducedMotion ? undefined : { transformStyle: "preserve-3d" }}
                    >
                        <div className="wh-stat-top">
                            <span className="wh-stat-icon-wrap" aria-hidden>
                                <ApartmentOutlined />
                            </span>
                        </div>
                        <div className="wh-stat-value">
                            <AnimatedStatValue value={summary.timelineVersions} skipAnimation={!!prefersReducedMotion} />
                        </div>
                        <div className="wh-stat-label">Timeline versions</div>
                    </motion.div>
                </motion.div>

                <div className="wh-split">
                    <motion.div
                        className="wh-split-visual"
                        role="img"
                        aria-label="Mine site landscape"
                        initial={prefersReducedMotion ? false : { opacity: 0, x: -36, scale: 0.97 }}
                        whileInView={prefersReducedMotion ? undefined : { opacity: 1, x: 0, scale: 1 }}
                        viewport={viewportOnce}
                        transition={{ duration: 0.6, ease: easeSmooth }}
                    >
                        <motion.span
                            className="wh-split-badge"
                            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                            whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                            viewport={viewportOnce}
                            transition={{ delay: 0.25, duration: 0.4, ease: easeSmooth }}
                        >
                            Operations
                        </motion.span>
                    </motion.div>
                    <motion.div
                        className="wh-split-copy"
                        initial={prefersReducedMotion ? false : { opacity: 0, x: 36 }}
                        whileInView={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
                        viewport={viewportOnce}
                        transition={{ duration: 0.6, ease: easeSmooth }}
                    >
                        <span className="wh-eyebrow">Why it matters</span>
                        <h2>Why teams open MineSense first</h2>
                        <p>
                            Whether you are aligning the next milestone, posting a status update, or pulling up the latest timeline
                            version, everything lives in one workspace. Fewer handoffs, fewer spreadsheets, and a clearer picture of
                            delivery risk—so you can act before small issues become big delays.
                        </p>
                    </motion.div>
                </div>

                <motion.div
                    className="wh-section-head"
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                    whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                    viewport={viewportOnce}
                    transition={{ duration: 0.48, ease: easeSmooth }}
                >
                    <span className="wh-eyebrow">Shortcuts</span>
                    <h2 className="wh-section-title">Start here</h2>
                    <p className="wh-section-sub">
                        Jump to the areas your team uses most. Tiles match your role and permissions.
                    </p>
                </motion.div>

                <motion.div
                    className="wh-grid"
                    variants={v.tileList}
                    initial={prefersReducedMotion ? "show" : "hidden"}
                    whileInView={prefersReducedMotion ? undefined : "show"}
                    viewport={viewportOnce}
                >
                    {visibleTiles.map((t) => (
                        <motion.button
                            key={t.key}
                            type="button"
                            className="wh-tile"
                            variants={v.tileItem}
                            onClick={() => navigate(t.path)}
                            whileHover={
                                prefersReducedMotion
                                    ? undefined
                                    : {
                                          y: -6,
                                          rotate: 0.6,
                                          boxShadow: "0 20px 48px rgba(31, 122, 99, 0.18)",
                                          transition: { type: "spring", stiffness: 400, damping: 24 },
                                      }
                            }
                            whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
                        >
                            <span className="wh-tile-icon-wrap">{t.icon}</span>
                            <div className="wh-tile-text">
                                <h3 className="wh-tile-title">{t.title}</h3>
                                <p className="wh-tile-desc">{t.description}</p>
                            </div>
                            <span className="wh-tile-arrow" aria-hidden>
                                <ArrowRightOutlined />
                            </span>
                        </motion.button>
                    ))}
                </motion.div>

                <motion.div
                    className="wh-pillars"
                    variants={v.pillarList}
                    initial={prefersReducedMotion ? "show" : "hidden"}
                    whileInView={prefersReducedMotion ? undefined : "show"}
                    viewport={viewportOnce}
                >
                    <motion.div className="wh-pillar wh-pillar--1" variants={v.pillarItem}>
                        <div className="wh-pillar-media">
                            <span className="wh-pillar-num">01</span>
                        </div>
                        <div className="wh-pillar-body">
                            <h3>Plan with confidence</h3>
                            <p>
                                Align scope, milestones, and dependencies in one system of record so every team sees the same plan—from
                                feasibility through development and ramp-up.
                            </p>
                        </div>
                    </motion.div>
                    <motion.div className="wh-pillar wh-pillar--2" variants={v.pillarItem}>
                        <div className="wh-pillar-media">
                            <span className="wh-pillar-num">02</span>
                        </div>
                        <div className="wh-pillar-body">
                            <h3>Execute with visibility</h3>
                            <p>
                                Capture progress, equipment and workforce signals, and status updates so delays and risks surface early—not
                                after the critical path breaks.
                            </p>
                        </div>
                    </motion.div>
                    <motion.div className="wh-pillar wh-pillar--3" variants={v.pillarItem}>
                        <div className="wh-pillar-media">
                            <span className="wh-pillar-num">03</span>
                        </div>
                        <div className="wh-pillar-body">
                            <h3>Govern with traceability</h3>
                            <p>
                                Structured workflows, documents, and approvals help you defend decisions and stay audit-ready without
                                slowing the operation.
                            </p>
                        </div>
                    </motion.div>
                </motion.div>

                <motion.div
                    className="wh-flow"
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
                    whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                    viewport={viewportOnce}
                    transition={{ duration: 0.5, ease: easeSmooth }}
                >
                    <motion.span
                        className="wh-eyebrow"
                        initial={prefersReducedMotion ? false : { opacity: 0, x: -8 }}
                        whileInView={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
                        viewport={viewportOnce}
                        transition={{ delay: 0.05, duration: 0.4 }}
                    >
                        Workflow
                    </motion.span>
                    <motion.h3
                        className="wh-flow-title"
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                        whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                        viewport={viewportOnce}
                        transition={{ delay: 0.1, duration: 0.45, ease: easeSmooth }}
                    >
                        How teams use MineSense
                    </motion.h3>
                    <motion.div
                        className="wh-flow-rail"
                        aria-hidden
                        initial={prefersReducedMotion ? false : { scaleX: 0, opacity: 0.4 }}
                        whileInView={prefersReducedMotion ? undefined : { scaleX: 1, opacity: 1 }}
                        viewport={viewportOnce}
                        transition={{ duration: 1, ease: easeSmooth, delay: 0.12 }}
                    />
                    <motion.div
                        className="wh-flow-steps"
                        variants={v.flowList}
                        initial={prefersReducedMotion ? "show" : "hidden"}
                        whileInView={prefersReducedMotion ? undefined : "show"}
                        viewport={viewportOnce}
                    >
                        <motion.div className="wh-flow-step" variants={v.flowStep}>
                            <strong>Define</strong>
                            Register projects, modules, and baselines so work is scoped and owned from day one.
                        </motion.div>
                        <motion.div className="wh-flow-step" variants={v.flowStep}>
                            <strong>Schedule</strong>
                            Build timelines, link activities, and coordinate approvals before execution pressure builds.
                        </motion.div>
                        <motion.div className="wh-flow-step" variants={v.flowStep}>
                            <strong>Track</strong>
                            Post status, variances, and field reality so dashboards reflect what is actually happening.
                        </motion.div>
                        <motion.div className="wh-flow-step" variants={v.flowStep}>
                            <strong>Improve</strong>
                            Use documents, costs, and history to learn, standardize, and protect the next cycle of delivery.
                        </motion.div>
                    </motion.div>
                </motion.div>

                <motion.div
                    className="wh-cta"
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 40, scale: 0.98 }}
                    whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
                    viewport={{ ...viewportOnce, amount: 0.25 }}
                    transition={{ duration: 0.65, ease: easeSmooth }}
                >
                    <motion.div
                        className="wh-cta-bg"
                        aria-hidden
                        initial={prefersReducedMotion ? false : { scale: 1.08 }}
                        whileInView={prefersReducedMotion ? undefined : { scale: 1 }}
                        viewport={viewportOnce}
                        transition={{ duration: 0.9, ease: easeSmooth }}
                    />
                    <motion.div
                        className="wh-cta-content"
                        initial={prefersReducedMotion ? false : { opacity: 0, x: 28 }}
                        whileInView={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
                        viewport={viewportOnce}
                        transition={{ duration: 0.55, delay: 0.12, ease: easeSmooth }}
                    >
                        <div>
                            <h2>Ready when you are</h2>
                            <p>
                                The Knowledge Center brings playbooks, standards, and references together. Pair it with Timeline Builder
                                and Status Update for end-to-end control—from the first baseline to the last approval.
                            </p>
                        </div>
                        <SpaceCompat>
                            <Button type="primary" size="large" onClick={() => navigate("/knowledge-center")}>
                                Open Knowledge Center
                            </Button>
                            <Button size="large" onClick={() => navigate("/helps")}>
                                Help &amp; support
                            </Button>
                        </SpaceCompat>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
};

/** Avoid extra Space import layout issues in CTA flex */
function SpaceCompat({ children }: { children: ReactNode }) {
    return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            {children}
        </div>
    );
}

export default WorkspaceHome;
