import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type KeyboardEvent,
    type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "antd";
import {
    BookOutlined,
    ProjectOutlined,
    ScheduleOutlined,
    FileTextOutlined,
    SettingOutlined,
    TeamOutlined,
    LineChartOutlined,
    LeftOutlined,
    RightOutlined,
    SoundOutlined,
    SafetyCertificateOutlined,
    BellOutlined,
    ArrowRightOutlined,
    RocketOutlined,
    ThunderboltOutlined,
    TrophyOutlined,
    HeartOutlined,
} from "@ant-design/icons";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { db } from "../Utils/dataStorege";
import { userStore } from "../Utils/UserStore";
import { hasPermission } from "../Utils/auth";
import type { Permission, Role } from "../config/permissions";
import "../styles/workspace-home.css";

type QuickTile = {
    key: string;
    title: string;
    description: string;
    icon: ReactNode;
    path: string;
    permission: Permission;
};

type PortalSlide = {
    id: string;
    eyebrow: string;
    title: string;
    description: string;
    ctaLabel: string;
    path: string;
    image: string;
    accent: string;
};

type Announcement = {
    id: string;
    badge: string;
    title: string;
    date: string;
    excerpt: string;
};

type Notice = {
    id: string;
    icon: "policy" | "security" | "general";
    title: string;
    detail: string;
};

type ActivityRow = {
    id: string;
    label: string;
    sub: string;
    at: Date;
    path: string;
};

type Initiative = {
    id: string;
    tag: string;
    title: string;
    description: string;
    path: string;
    cta: string;
};

type CultureNote = {
    id: string;
    title: string;
    body: string;
    accent: string;
    icon: ReactNode;
};

const easeSmooth = [0.16, 1, 0.3, 1] as const;
const viewportOnce = { once: true as const, margin: "-40px" as const, amount: 0.2 as const };

function getTimeGreeting(): string {
    const h = new Date().getHours();
    const raw = h < 12 ? "good morning" : h < 17 ? "good afternoon" : "good evening";
    return raw.replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseDate(s?: string): Date | null {
    if (!s) return null;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
}

function getDisplayInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    if (parts.length === 1 && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase();
    if (parts.length === 1) return (parts[0].charAt(0) + (parts[0].charAt(1) || "")).toUpperCase() || "?";
    return "?";
}

function resolveProfilePhotoSrc(raw: unknown): string | null {
    if (raw == null) return null;
    const s = String(raw).trim();
    if (!s) return null;
    if (s.startsWith("data:") || s.startsWith("http://") || s.startsWith("https://") || s.startsWith("/")) return s;
    return `data:image/jpeg;base64,${s}`;
}

/** Wide abstract art for the hero banner — geometric / mesh, no literal imagery */
function HeroBannerArt() {
    return (
        <svg
            className="wh-banner-art-svg"
            viewBox="0 0 560 340"
            role="img"
            aria-label=""
            focusable="false"
        >
            <defs>
                <linearGradient id="wh-ba-mesh" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(31, 122, 99, 0.55)" />
                    <stop offset="45%" stopColor="rgba(13, 148, 136, 0.35)" />
                    <stop offset="100%" stopColor="rgba(52, 211, 153, 0.2)" />
                </linearGradient>
                <linearGradient id="wh-ba-plane" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                    <stop offset="100%" stopColor="rgba(236, 253, 245, 0.75)" />
                </linearGradient>
                <linearGradient id="wh-ba-glass" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
                </linearGradient>
                <filter id="wh-ba-soft" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="14" />
                </filter>
            </defs>
            <ellipse cx="420" cy="40" rx="200" ry="120" fill="url(#wh-ba-mesh)" opacity="0.35" filter="url(#wh-ba-soft)" />
            <ellipse cx="80" cy="300" rx="160" ry="100" fill="rgba(31, 122, 99, 0.12)" filter="url(#wh-ba-soft)" />
            <g opacity="0.5" stroke="rgba(31, 122, 99, 0.35)" strokeWidth="1" fill="none">
                <path d="M40 220 Q140 120 260 180 T460 140" />
                <path d="M120 280 L200 200 L320 240 L440 160" />
            </g>
            <g transform="translate(48, 56)">
                <path
                    d="M8 180 L120 120 L232 168 L232 272 L120 312 L8 264 Z"
                    fill="url(#wh-ba-plane)"
                    stroke="rgba(31, 122, 99, 0.15)"
                    strokeWidth="1.2"
                    opacity="0.92"
                />
                <path
                    d="M120 120 L248 72 L360 120 L360 224 L248 272 L120 224 Z"
                    fill="rgba(15, 23, 42, 0.06)"
                    stroke="rgba(31, 122, 99, 0.12)"
                    strokeWidth="1"
                />
                <path
                    d="M248 72 L392 112 L392 216 L248 272 Z"
                    fill="url(#wh-ba-glass)"
                    stroke="rgba(31, 122, 99, 0.18)"
                    strokeWidth="1"
                    opacity="0.85"
                />
            </g>
            <g transform="translate(300, 140)">
                <rect x="0" y="0" width="200" height="120" rx="16" fill="rgba(255,255,255,0.65)" stroke="rgba(31, 122, 99, 0.14)" />
                <rect x="18" y="22" width="72" height="8" rx="3" fill="rgba(31, 122, 99, 0.35)" />
                <rect x="18" y="42" width="140" height="6" rx="2" fill="rgba(15, 23, 42, 0.08)" />
                <rect x="18" y="56" width="120" height="6" rx="2" fill="rgba(15, 23, 42, 0.06)" />
                <rect x="18" y="78" width="88" height="28" rx="8" fill="rgba(31, 122, 99, 0.2)" />
                <circle cx="164" cy="44" r="22" fill="rgba(31, 122, 99, 0.12)" />
                <circle cx="164" cy="44" r="10" fill="rgba(31, 122, 99, 0.45)" />
            </g>
            <circle cx="472" cy="260" r="6" fill="rgba(52, 211, 153, 0.9)" />
            <circle cx="498" cy="232" r="4" fill="rgba(31, 122, 99, 0.55)" />
            <circle cx="520" cy="252" r="3" fill="rgba(13, 148, 136, 0.65)" />
        </svg>
    );
}

const PORTAL_SLIDES: PortalSlide[] = [
    {
        id: "s1",
        eyebrow: "Organization spotlight",
        title: "Standards that keep every project aligned",
        description:
            "Browse curated guidance, templates, and references so teams execute with the same playbook—from baseline to commissioning.",
        ctaLabel: "Open Knowledge Center",
        path: "/knowledge-center",
        image: "/images/carousels/m1.jpg",
        accent: "rgba(31, 122, 99, 0.92)",
    },
    {
        id: "s2",
        eyebrow: "Delivery",
        title: "See the full picture across your portfolio",
        description:
            "Register work, trace timelines, and keep stakeholders informed without losing the narrative in spreadsheets.",
        ctaLabel: "View projects",
        path: "/project",
        image: "/images/carousels/m3.jpg",
        accent: "rgba(13, 148, 136, 0.9)",
    },
    {
        id: "s3",
        eyebrow: "Governance",
        title: "Controlled documents and clear accountability",
        description:
            "Link evidence, approvals, and updates in one workspace so reviews are faster and decisions are defensible.",
        ctaLabel: "Browse documents",
        path: "/document",
        image: "/images/auths/m5.jpg",
        accent: "rgba(15, 23, 42, 0.88)",
    },
];

const ORG_ANNOUNCEMENTS: Announcement[] = [
    {
        id: "a1",
        badge: "New",
        title: "Workflow handbook v3 is live",
        date: "May 2026",
        excerpt: "Updated RACI patterns, escalation paths, and document retention notes—review before your next gate review.",
    },
    {
        id: "a2",
        badge: "Program",
        title: "Quarterly portfolio forum — save the date",
        date: "May 2026",
        excerpt: "Executive readouts, risk themes, and cross-project dependencies. Calendar invite will follow from PMO.",
    },
];

const FEATURE_MODULE_ORDER = ["projects", "timeline", "documents", "kc", "status", "team"];

const IMPORTANT_NOTICES: Notice[] = [
    {
        id: "n1",
        icon: "security",
        title: "Authentication hardening",
        detail: "All workspace sessions now refresh on policy change. Sign out on shared devices when finished.",
    },
    {
        id: "n2",
        icon: "policy",
        title: "Data residency reminder",
        detail: "Store regulated exports only in approved repositories linked from the Document module.",
    },
    {
        id: "n3",
        icon: "general",
        title: "Help desk hours",
        detail: "Enterprise support is available 06:00–22:00 local time on business days.",
    },
];

const FEATURED_INITIATIVES: Initiative[] = [
    {
        id: "fi1",
        tag: "Featured initiative",
        title: "Delivery excellence across every phase gate",
        description:
            "Bring timelines, status updates, and controlled documents into one coordinated flow so leaders can review progress in context.",
        path: "/project",
        cta: "Explore delivery workspaces",
    },
    {
        id: "fi2",
        tag: "Operational readiness",
        title: "Create repeatable execution standards for every team",
        description:
            "Use the Knowledge Center as the shared operating layer for templates, standards, and practical references that reduce variation.",
        path: "/knowledge-center",
        cta: "Open guidance library",
    },
    {
        id: "fi3",
        tag: "Governance",
        title: "Keep evidence, approvals, and decisions connected",
        description:
            "Make document control and reporting feel less like administration and more like a visible part of how the organization delivers well.",
        path: "/document",
        cta: "Review document spaces",
    },
];

const CULTURE_NOTES: CultureNote[] = [
    {
        id: "cn1",
        title: "Built for disciplined momentum",
        body: "Every section of the workspace should help teams move with confidence, not just record activity after the fact.",
        accent: "emerald",
        icon: <RocketOutlined />,
    },
    {
        id: "cn2",
        title: "Designed to keep people connected",
        body: "Announcements, standards, updates, and support now sit alongside execution so the homepage feels like a shared organizational front door.",
        accent: "teal",
        icon: <HeartOutlined />,
    },
];

function NoticeIcon({ type }: { type: Notice["icon"] }) {
    if (type === "security") return <SafetyCertificateOutlined />;
    if (type === "policy") return <SoundOutlined />;
    return <BellOutlined />;
}

const WorkspaceHome = () => {
    const navigate = useNavigate();
    const prefersReducedMotion = useReducedMotion();
    const [user, setUser] = useState<any>(null);
    const [timeGreeting, setTimeGreeting] = useState(() => getTimeGreeting());
    const [slideIndex, setSlideIndex] = useState(0);
    const [carouselPaused, setCarouselPaused] = useState(false);
    const carouselRef = useRef<HTMLDivElement>(null);

    const [summary, setSummary] = useState({ projectCount: 0, withTimeline: 0, timelineVersions: 0 });
    const [activityRows, setActivityRows] = useState<ActivityRow[]>([]);

    useEffect(() => {
        const sync = () => setUser(userStore.getUser());
        sync();
        return userStore.subscribe(sync);
    }, []);

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
        if (prefersReducedMotion || carouselPaused) return;
        const t = window.setInterval(() => {
            setSlideIndex((i) => (i + 1) % PORTAL_SLIDES.length);
        }, 7000);
        return () => window.clearInterval(t);
    }, [prefersReducedMotion, carouselPaused]);

    useEffect(() => {
        let active = true;
        const load = async () => {
            const u = userStore.getUser();
            const orgId = u?.orgId != null ? String(u.orgId) : "";
            const userEmail = String(u?.email || "").toLowerCase();

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

                const projectActivity: ActivityRow[] = orgProjects
                    .map((p: any) => {
                        const name = String(p?.projectName || p?.name || "Project").trim() || "Project";
                        const at =
                            parseDate(p?.updatedAt) ||
                            parseDate(p?.createdAt) ||
                            new Date(0);
                        return {
                            id: `p-${p?.id ?? name}`,
                            label: name,
                            sub: "Project workspace",
                            at,
                            path: "/project",
                        };
                    })
                    .filter((r) => r.at.getTime() > 0)
                    .sort((a, b) => b.at.getTime() - a.at.getTime())
                    .slice(0, 4);

                let knowledgeActivity: ActivityRow[] = [];
                try {
                    const posts = (await db.getKnowledgePosts()) as Array<{
                        id?: number;
                        title?: string;
                        updatedAt?: string;
                        createdAt?: string;
                        createdBy?: { email?: string; name?: string };
                    }>;
                    const visible = posts.filter((post) => {
                        const email = String(post?.createdBy?.email || "").toLowerCase();
                        if (!userEmail) return true;
                        return !email || email === userEmail;
                    });
                    knowledgeActivity = visible
                        .map((post) => {
                            const at =
                                parseDate(post.updatedAt) ||
                                parseDate(post.createdAt) ||
                                new Date(0);
                            const title = String(post.title || "Knowledge post").trim() || "Knowledge post";
                            return {
                                id: `k-${post.id ?? title}`,
                                label: title,
                                sub: "Knowledge Center",
                                at,
                                path: "/knowledge-center",
                            };
                        })
                        .filter((r) => r.at.getTime() > 0)
                        .sort((a, b) => b.at.getTime() - a.at.getTime())
                        .slice(0, 3);
                } catch {
                    knowledgeActivity = [];
                }

                const merged = [...projectActivity, ...knowledgeActivity]
                    .sort((a, b) => b.at.getTime() - a.at.getTime())
                    .slice(0, 6);

                if (!active) return;
                setSummary({
                    projectCount: orgProjects.length,
                    withTimeline: withTl.length,
                    timelineVersions,
                });
                setActivityRows(merged);
            } catch {
                if (active) {
                    setSummary({ projectCount: 0, withTimeline: 0, timelineVersions: 0 });
                    setActivityRows([]);
                }
            }
        };
        load();
        return () => {
            active = false;
        };
    }, [user?.orgId, user?.email]);

    const role = String(user?.role || "") as Role;
    const can = (action: QuickTile["permission"]) =>
        hasPermission(role, action) || role === "mdtsAdmin";

    const displayName = String(user?.name || "there").trim() || "there";
    const firstName = displayName.split(/\s+/)[0] || displayName;
    const organizationName = useMemo(() => {
        const raw = user?.organizationName || user?.orgName || user?.companyName || user?.orgId;
        if (raw == null || String(raw).trim() === "") return "your organization";
        return String(raw).trim();
    }, [user?.organizationName, user?.orgName, user?.companyName, user?.orgId]);
    const profilePhotoSrc = useMemo(() => resolveProfilePhotoSrc(user?.profilePhoto), [user?.profilePhoto]);
    const userInitials = useMemo(() => getDisplayInitials(displayName), [displayName]);
    const [avatarFailed, setAvatarFailed] = useState(false);

    useEffect(() => {
        setAvatarFailed(false);
    }, [user?.profilePhoto]);

    const tiles: QuickTile[] = useMemo(
        () => [
            {
                key: "projects",
                title: "Projects",
                description: "Portfolio, registration, and delivery tracking.",
                icon: <ProjectOutlined />,
                path: "/project",
                permission: "VIEW_NAVBAR_MENUS",
            },
            {
                key: "timeline",
                title: "Timeline Builder",
                description: "Dependencies, sequences, and approvals in one place.",
                icon: <ScheduleOutlined />,
                path: "/create/timeline-builder",
                permission: "BUILD_TIMEBUILDER",
            },
            {
                key: "documents",
                title: "Documents",
                description: "Controlled sets linked to modules and activities.",
                icon: <FileTextOutlined />,
                path: "/document",
                permission: "VIEW_NAVBAR_MENUS",
            },
            {
                key: "kc",
                title: "Knowledge Center",
                description: "Guidance, standards, and curated references.",
                icon: <BookOutlined />,
                path: "/knowledge-center",
                permission: "VIEW_NAVBAR_MENUS",
            },
            {
                key: "status",
                title: "Status Update",
                description: "Structured progress, risks, and field signals.",
                icon: <LineChartOutlined />,
                path: "/create/status-update",
                permission: "UPDATE_STATUS",
            },
            {
                key: "team",
                title: "Team Members",
                description: "Roles, access, and collaboration.",
                icon: <TeamOutlined />,
                path: "/view-user",
                permission: "VIEW_TEAM_MEMBERS",
            },
            {
                key: "settings",
                title: "Settings",
                description: "Notifications, organization fields, preferences.",
                icon: <SettingOutlined />,
                path: "/settings",
                permission: "VIEW_NAVBAR_MENUS",
            },
        ],
        []
    );

    const visibleTiles = tiles.filter((t) => can(t.permission));

    const featuredTiles = useMemo(() => {
        const ordered = FEATURE_MODULE_ORDER.map((k) => visibleTiles.find((t) => t.key === k)).filter(
            Boolean
        ) as QuickTile[];
        const rest = visibleTiles.filter((t) => !FEATURE_MODULE_ORDER.includes(t.key));
        return [...ordered, ...rest].slice(0, 6);
    }, [visibleTiles]);

    const goSlide = useCallback(
        (dir: -1 | 1) => {
            setSlideIndex((i) => (i + dir + PORTAL_SLIDES.length) % PORTAL_SLIDES.length);
        },
        []
    );

    const onCarouselKeyDown = (e: KeyboardEvent) => {
        if (e.key === "ArrowLeft") {
            e.preventDefault();
            goSlide(-1);
        } else if (e.key === "ArrowRight") {
            e.preventDefault();
            goSlide(1);
        }
    };

    const activeSlide = PORTAL_SLIDES[slideIndex];

    return (
        <div className="wh-page">
            <div className="wh-page-bg" aria-hidden />

            <header className="wh-hero wh-hero--portal">
                <div className="wh-hero-shell">
                    <motion.div
                        className="wh-hero-banner"
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, ease: easeSmooth }}
                    >
                        <div className="wh-hero-banner-noise" aria-hidden />
                        <div className="wh-hero-banner-blob wh-hero-banner-blob--a" aria-hidden />
                        <div className="wh-hero-banner-blob wh-hero-banner-blob--b" aria-hidden />
                        <div className="wh-hero-banner-grid">
                            <div className="wh-hero-banner-main">
                                <div className="wh-hero-identity">
                                    <div className="wh-hero-avatar-wrap">
                                        {profilePhotoSrc && !avatarFailed ? (
                                            <img
                                                src={profilePhotoSrc}
                                                alt={`${displayName} profile`}
                                                className="wh-hero-avatar-img"
                                                decoding="async"
                                                onError={() => setAvatarFailed(true)}
                                            />
                                        ) : (
                                            <span className="wh-hero-avatar-fallback" aria-hidden>
                                                {userInitials}
                                            </span>
                                        )}
                                    </div>
                                    <div className="wh-hero-identity-copy">
                                        <p className="wh-greeting wh-greeting--line">
                                            <span className="wh-greeting-time">{timeGreeting}</span>
                                            <span className="wh-greeting-sep" aria-hidden>
                                                ·
                                            </span>
                                            <span className="wh-greeting-welcome">Welcome back</span>
                                        </p>
                                        <h1 className="wh-title wh-title--compact">
                                            {timeGreeting},{" "}
                                            <span className="wh-title-name">{firstName}</span>
                                        </h1>
                                    </div>
                                </div>
                                <p className="wh-lead wh-lead--banner">
                                    Your control center for programs, workflows, and evidence—designed for clarity first,
                                    with everything you need a single click away.
                                </p>
                                <div className="wh-hero-actions">
                                    <Button
                                        type="primary"
                                        size="large"
                                        className="wh-btn-primary wh-btn-primary--banner"
                                        onClick={() => navigate("/project")}
                                        icon={<ProjectOutlined />}
                                    >
                                        Continue to projects
                                    </Button>
                                    <Button
                                        size="large"
                                        className="wh-btn-ghost wh-btn-ghost--banner"
                                        onClick={() => navigate("/knowledge-center")}
                                        icon={<BookOutlined />}
                                    >
                                        Knowledge Center
                                    </Button>
                                    {(!profilePhotoSrc || avatarFailed) && (
                                        <Button
                                            type="link"
                                            size="small"
                                            className="wh-hero-profile-link"
                                            onClick={() => navigate("/profile")}
                                        >
                                            Add a profile photo
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="wh-hero-banner-art" aria-hidden>
                                <div className="wh-hero-banner-art-frame">
                                    <HeroBannerArt />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </header>

            <section
                className="wh-portal-carousel"
                aria-roledescription="carousel"
                aria-label="Featured programs and services"
                onMouseEnter={() => setCarouselPaused(true)}
                onMouseLeave={() => setCarouselPaused(false)}
            >
                <div className="wh-portal-carousel-inner">
                    <div className="wh-portal-carousel-head">
                        <span className="wh-eyebrow">Featured</span>
                        <h2 className="wh-section-title wh-section-title--inline">Highlights across your organization</h2>
                    </div>

                    <div
                        className="wh-carousel-shell"
                        ref={carouselRef}
                        tabIndex={0}
                        onKeyDown={onCarouselKeyDown}
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                                key={activeSlide.id}
                                className="wh-carousel-slide"
                                initial={prefersReducedMotion ? false : { opacity: 0, x: 28 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={prefersReducedMotion ? undefined : { opacity: 0, x: -22 }}
                                transition={{ duration: 0.45, ease: easeSmooth }}
                                style={
                                    {
                                        "--slide-accent": activeSlide.accent,
                                    } as CSSProperties
                                }
                            >
                                <div className="wh-carousel-media-wrap">
                                    <div
                                        className="wh-carousel-media"
                                        style={{ backgroundImage: `url(${activeSlide.image})` }}
                                        role="img"
                                        aria-hidden
                                    />
                                    <div className="wh-carousel-scrim" aria-hidden />
                                </div>
                                <div className="wh-carousel-copy">
                                    <span className="wh-carousel-eyebrow">{activeSlide.eyebrow}</span>
                                    <h3 className="wh-carousel-title">{activeSlide.title}</h3>
                                    <p className="wh-carousel-desc">{activeSlide.description}</p>
                                    <Button
                                        type="primary"
                                        size="large"
                                        className="wh-carousel-cta"
                                        onClick={() => navigate(activeSlide.path)}
                                    >
                                        {activeSlide.ctaLabel}
                                        <ArrowRightOutlined />
                                    </Button>
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        <div className="wh-carousel-controls">
                            <button
                                type="button"
                                className="wh-carousel-nav"
                                aria-label="Previous highlight"
                                onClick={() => goSlide(-1)}
                            >
                                <LeftOutlined />
                            </button>
                            <div className="wh-carousel-dots" role="tablist" aria-label="Slide indicators">
                                {PORTAL_SLIDES.map((s, i) => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={i === slideIndex}
                                        aria-label={`Show slide ${i + 1}`}
                                        className={`wh-carousel-dot${i === slideIndex ? " is-active" : ""}`}
                                        onClick={() => setSlideIndex(i)}
                                    />
                                ))}
                            </div>
                            <button
                                type="button"
                                className="wh-carousel-nav"
                                aria-label="Next highlight"
                                onClick={() => goSlide(1)}
                            >
                                <RightOutlined />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <div className="wh-body">
                <motion.section
                    className="wh-story-intro"
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
                    whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                    viewport={viewportOnce}
                    transition={{ duration: 0.45, ease: easeSmooth }}
                >
                    <div className="wh-section-head wh-section-head--story">
                        <div>
                            <span className="wh-eyebrow">Organization pulse</span>
                            <h2 className="wh-section-title">A homepage that feels like your platform, not a dashboard</h2>
                        </div>
                        <p className="wh-section-sub">
                            {organizationName} can use this space to spotlight priorities, celebrate progress, and guide
                            teams toward the next action with more clarity and less noise.
                        </p>
                    </div>
                </motion.section>

                <div className="wh-story-grid">
                    <motion.section
                        className="wh-pulse-panel"
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                        whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                        viewport={viewportOnce}
                        transition={{ duration: 0.5, ease: easeSmooth }}
                        aria-labelledby="wh-pulse-heading"
                    >
                        <div className="wh-pulse-head">
                            <span className="wh-mini-kicker">Today in the workspace</span>
                            <h2 id="wh-pulse-heading" className="wh-pulse-title">
                                {summary.projectCount > 0
                                    ? `${summary.projectCount} active project spaces are shaping the delivery picture`
                                    : "Your workspace is ready to anchor delivery, governance, and collaboration"}
                            </h2>
                            <p className="wh-pulse-copy">
                                This view surfaces what matters most across the organization so people land in a place
                                that feels current, coordinated, and purposeful.
                            </p>
                        </div>
                        <div className="wh-pulse-metrics">
                            <article className="wh-pulse-metric">
                                <span className="wh-pulse-metric-value">{summary.projectCount}</span>
                                <span className="wh-pulse-metric-label">Projects in workspace</span>
                            </article>
                            <article className="wh-pulse-metric">
                                <span className="wh-pulse-metric-value">{summary.withTimeline}</span>
                                <span className="wh-pulse-metric-label">Projects with live timelines</span>
                            </article>
                            <article className="wh-pulse-metric">
                                <span className="wh-pulse-metric-value">{summary.timelineVersions}</span>
                                <span className="wh-pulse-metric-label">Timeline versions captured</span>
                            </article>
                        </div>
                        <div className="wh-pulse-actions">
                            <Button
                                type="primary"
                                size="large"
                                className="wh-btn-primary"
                                onClick={() => navigate("/project")}
                            >
                                Open portfolio
                            </Button>
                            <Button
                                size="large"
                                className="wh-btn-ghost"
                                onClick={() => navigate("/create/status-update")}
                            >
                                Share a status update
                            </Button>
                        </div>
                    </motion.section>

                    <motion.section
                        className="wh-briefing-panel"
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                        whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                        viewport={viewportOnce}
                        transition={{ duration: 0.5, ease: easeSmooth, delay: 0.06 }}
                        aria-labelledby="wh-briefing-heading"
                    >
                        <div className="wh-panel-head">
                            <h2 id="wh-briefing-heading" className="wh-panel-title">
                                Leadership briefing
                            </h2>
                            <p className="wh-panel-sub">Important signals, updates, and reminders from across the platform.</p>
                        </div>
                        <ul className="wh-briefing-list">
                            {ORG_ANNOUNCEMENTS.map((a) => (
                                <li key={a.id} className="wh-briefing-item">
                                    <div className="wh-announce-meta">
                                        <span className={`wh-announce-badge wh-announce-badge--${a.badge.toLowerCase()}`}>
                                            {a.badge}
                                        </span>
                                        <time className="wh-announce-date">{a.date}</time>
                                    </div>
                                    <h3 className="wh-briefing-title">{a.title}</h3>
                                    <p className="wh-briefing-copy">{a.excerpt}</p>
                                </li>
                            ))}
                        </ul>
                        <ul className="wh-notice-list">
                            {IMPORTANT_NOTICES.map((n) => (
                                <li key={n.id} className="wh-notice-row">
                                    <span className="wh-notice-icon" aria-hidden>
                                        <NoticeIcon type={n.icon} />
                                    </span>
                                    <div>
                                        <h3 className="wh-notice-title">{n.title}</h3>
                                        <p className="wh-notice-detail">{n.detail}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </motion.section>
                </div>

                <motion.section
                    className="wh-initiative-band"
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                    whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                    viewport={viewportOnce}
                    transition={{ duration: 0.45, ease: easeSmooth }}
                >
                    <div className="wh-section-head wh-section-head--split">
                        <div>
                            <span className="wh-eyebrow">Featured initiatives</span>
                            <h2 className="wh-section-title">Focus areas worth surfacing after login</h2>
                        </div>
                        <p className="wh-section-sub">
                            These sections give the homepage more narrative value by highlighting how the organization is
                            working, not just where to click next.
                        </p>
                    </div>
                    <div className="wh-initiative-grid">
                        {FEATURED_INITIATIVES.map((initiative, idx) => (
                            <motion.article
                                key={initiative.id}
                                className="wh-initiative-card"
                                initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                                whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-30px", amount: 0.15 }}
                                transition={{ duration: 0.4, delay: idx * 0.06, ease: easeSmooth }}
                            >
                                <span className="wh-initiative-tag">{initiative.tag}</span>
                                <h3 className="wh-initiative-title">{initiative.title}</h3>
                                <p className="wh-initiative-copy">{initiative.description}</p>
                                <button
                                    type="button"
                                    className="wh-inline-link"
                                    onClick={() => navigate(initiative.path)}
                                >
                                    {initiative.cta}
                                    <ArrowRightOutlined />
                                </button>
                            </motion.article>
                        ))}
                    </div>
                </motion.section>

                <motion.section
                    className="wh-workstreams-shell"
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
                    whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                    viewport={viewportOnce}
                    transition={{ duration: 0.45, ease: easeSmooth }}
                >
                    <div
                        className="wh-section-head"
                    >
                        <span className="wh-eyebrow">Workstreams</span>
                        <h2 className="wh-section-title">Move from welcome to action without losing the premium feel</h2>
                        <p className="wh-section-sub">
                            Role-aware shortcuts still matter. The difference is that they now sit inside a more curated
                            section that feels like a product landing page for internal teams.
                        </p>
                    </div>
                    <div className="wh-workstreams-grid">
                        <div className="wh-module-grid">
                            {featuredTiles.map((t, idx) => (
                                <motion.button
                                    key={t.key}
                                    type="button"
                                    className="wh-module-card"
                                    onClick={() => navigate(t.path)}
                                    initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                                    whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-30px", amount: 0.15 }}
                                    transition={{ duration: 0.4, delay: idx * 0.04, ease: easeSmooth }}
                                    whileHover={
                                        prefersReducedMotion
                                            ? undefined
                                            : { y: -4, transition: { type: "spring", stiffness: 380, damping: 22 } }
                                    }
                                    whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
                                >
                                    <span className="wh-module-icon">{t.icon}</span>
                                    <div className="wh-module-text">
                                        <h3 className="wh-module-title">{t.title}</h3>
                                        <p className="wh-module-desc">{t.description}</p>
                                    </div>
                                    <span className="wh-module-arrow" aria-hidden>
                                        <ArrowRightOutlined />
                                    </span>
                                </motion.button>
                            ))}
                        </div>
                        <aside className="wh-actions-rail">
                            <div className="wh-actions-rail-card wh-actions-rail-card--feature">
                                <span className="wh-actions-icon" aria-hidden>
                                    <ThunderboltOutlined />
                                </span>
                                <h3 className="wh-actions-title">Quick start for today</h3>
                                <p className="wh-actions-copy">
                                    Start where coordination happens most often: portfolio review, status capture, and
                                    shared standards.
                                </p>
                                <div className="wh-actions-stack">
                                    <Button block className="wh-widget-btn-secondary" onClick={() => navigate("/project")}>
                                        Portfolio overview
                                    </Button>
                                    <Button block className="wh-widget-btn-secondary" onClick={() => navigate("/create/status-update")}>
                                        Post status update
                                    </Button>
                                    <Button block className="wh-widget-btn-secondary" onClick={() => navigate("/knowledge-center")}>
                                        Browse standards
                                    </Button>
                                </div>
                            </div>
                            <div className="wh-actions-rail-card">
                                <span className="wh-actions-icon wh-actions-icon--gold" aria-hidden>
                                    <TrophyOutlined />
                                </span>
                                <h3 className="wh-actions-title">Experience principle</h3>
                                <p className="wh-actions-copy">
                                    Keep the landing experience welcoming and branded so users feel connected to the
                                    organization before they dive into execution tools.
                                </p>
                            </div>
                        </aside>
                    </div>
                </motion.section>

                <motion.div
                    className="wh-section-head"
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
                    whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                    viewport={viewportOnce}
                    transition={{ duration: 0.45, ease: easeSmooth }}
                >
                    <span className="wh-eyebrow">Connected experience</span>
                    <h2 className="wh-section-title">Keep people close to the organization, not just the tooling</h2>
                    <p className="wh-section-sub">
                        A modern internal homepage should balance execution updates with a sense of shared mission,
                        support, and momentum.
                    </p>
                </motion.div>

                <div className="wh-lower-grid">
                    <motion.section
                        className="wh-activity-panel"
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                        whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                        viewport={viewportOnce}
                        transition={{ duration: 0.5, ease: easeSmooth }}
                        aria-labelledby="wh-activity-heading"
                    >
                        <div className="wh-panel-head wh-panel-head--row">
                            <div>
                                <h2 id="wh-activity-heading" className="wh-panel-title">
                                    Recent updates
                                </h2>
                                <p className="wh-panel-sub">A lighter editorial-style feed from across your workspace.</p>
                            </div>
                            <Button type="link" className="wh-activity-link" onClick={() => navigate("/project")}>
                                View portfolio
                            </Button>
                        </div>
                        {activityRows.length === 0 ? (
                            <p className="wh-activity-empty">
                                When projects and knowledge posts change, the latest entries will appear here.
                            </p>
                        ) : (
                            <ul className="wh-activity-list">
                                {activityRows.map((row) => (
                                    <li key={row.id}>
                                        <button
                                            type="button"
                                            className="wh-activity-row"
                                            onClick={() => navigate(row.path)}
                                        >
                                            <span className="wh-activity-dot" aria-hidden />
                                            <div className="wh-activity-body">
                                                <span className="wh-activity-label">{row.label}</span>
                                                <span className="wh-activity-meta">
                                                    {row.sub} · {formatDistanceToNow(row.at, { addSuffix: true })}
                                                </span>
                                            </div>
                                            <ArrowRightOutlined className="wh-activity-chevron" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </motion.section>

                    <motion.aside
                        className="wh-side-widgets"
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                        whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                        viewport={viewportOnce}
                        transition={{ duration: 0.5, ease: easeSmooth, delay: 0.05 }}
                    >
                        {CULTURE_NOTES.map((note) => (
                            <div key={note.id} className={`wh-widget wh-widget--story wh-widget--${note.accent}`}>
                                <span className="wh-widget-story-icon" aria-hidden>
                                    {note.icon}
                                </span>
                                <h3 className="wh-widget-title">{note.title}</h3>
                                <p className="wh-widget-text">{note.body}</p>
                            </div>
                        ))}
                        <div className="wh-widget wh-widget--accent">
                            <h3 className="wh-widget-title">Need a hand?</h3>
                            <p className="wh-widget-text">
                                Browse walkthroughs, profile settings, or connect with support without leaving the workspace.
                            </p>
                            <div className="wh-actions-stack">
                                <Button type="primary" block className="wh-widget-btn" onClick={() => navigate("/helps")}>
                                    Help &amp; support
                                </Button>
                                <Button block className="wh-widget-btn-secondary" onClick={() => navigate("/profile")}>
                                    Open profile
                                </Button>
                            </div>
                        </div>
                    </motion.aside>
                </div>

                <motion.footer
                    className="wh-footer-cta"
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                    whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                    viewport={viewportOnce}
                    transition={{ duration: 0.55, ease: easeSmooth }}
                >
                    <div className="wh-footer-cta-copy">
                        <h2>Built for disciplined delivery</h2>
                        <p>
                            MineSense MDTS connects planning, execution, and governance so your first screen feels as
                            intentional as your operating model.
                        </p>
                    </div>
                    <div className="wh-footer-cta-actions">
                        <Button type="primary" size="large" onClick={() => navigate("/settings")}>
                            Workspace settings
                        </Button>
                        <Button size="large" onClick={() => navigate("/helps")}>
                            Contact support
                        </Button>
                    </div>
                </motion.footer>
            </div>
        </div>
    );
};

export default WorkspaceHome;
