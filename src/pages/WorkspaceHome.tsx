import {
    useEffect,
    useMemo,
    useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "antd";
import { ArrowRightOutlined } from "@ant-design/icons";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { db } from "../Utils/dataStorege";
import { userStore } from "../Utils/UserStore";
import { getLatestProjectModules } from "../Utils/projectTimeline";
import { flattenActivities, getPrerequisiteCodes } from "../Utils/prerequisites";
import { defaultCsrContentConfig, normalizeCsrContentConfig, type CsrContentConfig } from "../config/csrContent";
import { WorkspaceHeroVideo } from "../Components/workspace-home/WorkspaceHeroVideo";
import TimelineTreeView, {
    type TimelineTreeActivity,
    type TimelineTreeModule,
    type TimelineTreeProject,
} from "../Components/TimelineTreeView";
import "../styles/workspace-home.css";

type Announcement = {
    id: string;
    badge: string;
    title: string;
    date: string;
    excerpt: string;
};

type BriefingUpdate = {
    id: string;
    badge: string;
    title: string;
    date: string;
    excerpt: string;
};

type Initiative = {
    id: string;
    tag: string;
    title: string;
    description: string;
    path: string;
    cta: string;
};

type TimelineStatusTone = "completed" | "inprogress" | "yettostart";

const easeSmooth = [0.16, 1, 0.3, 1] as const;
const viewportOnce = { once: true as const, margin: "-40px" as const, amount: 0.2 as const };
const HOME_VISUAL_DISPLAY_COUNT = 5;

function getTimeGreeting(): string {
    const h = new Date().getHours();
    const raw = h < 12 ? "good morning" : h < 17 ? "good afternoon" : "good evening";
    return raw.replace(/\b\w/g, (c) => c.toUpperCase());
}

function getTopbarDateTime(): string {
    const now = new Date();
    const date = new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
    }).format(now);
    const time = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    }).format(now);
    return `${date} | ${time}`;
}

function parseDate(s?: string): Date | null {
    if (!s) return null;
    const raw = String(s).trim();
    if (!raw || raw.toLowerCase() === "null" || raw === "-") return null;

    const dmyMatch = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (dmyMatch) {
        const [, dd, mm, yyyy] = dmyMatch;
        const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        if (
            date.getFullYear() === Number(yyyy) &&
            date.getMonth() === Number(mm) - 1 &&
            date.getDate() === Number(dd)
        ) {
            return date;
        }
    }

    const iso = new Date(raw);
    return Number.isNaN(iso.getTime()) ? null : iso;
}

function formatActivityDateLabel(date: Date | null): string {
    return date
        ? new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).format(date)
        : "Date not set";
}

function normalizeStatus(statusValue: any): TimelineStatusTone {
    const status = String(statusValue ?? "").trim().toLowerCase();
    if (
        status.includes("complete") ||
        status.includes("done") ||
        status.includes("closed") ||
        status.includes("finish")
    ) {
        return "completed";
    }
    if (
        status.includes("progress") ||
        status.includes("ongoing") ||
        status.includes("active") ||
        status.includes("delay") ||
        status.includes("risk") ||
        status.includes("overdue") ||
        status.includes("late") ||
        status.includes("started")
    ) {
        return "inprogress";
    }
    return "yettostart";
}

function formatActivityTimelineDate(activity: any, status: TimelineStatusTone) {
    const actualDateCandidates = [
        activity?.actualFinish,
        activity?.actualEnd,
        activity?.finishDate,
        activity?.endDate,
        activity?.completedDate,
        activity?.completionDate,
    ];
    const plannedDateCandidates = [
        activity?.plannedFinish,
        activity?.expectedFinish,
        activity?.plannedEnd,
        activity?.expectedEnd,
        activity?.expectedCompletionDate,
        activity?.targetDate,
    ];

    const actualDate = actualDateCandidates.map((value) => parseDate(value)).find(Boolean) ?? null;
    const plannedDate = plannedDateCandidates.map((value) => parseDate(value)).find(Boolean) ?? null;
    const preferredDate = status === "yettostart" ? plannedDate ?? actualDate : actualDate ?? plannedDate;

    return {
        hasDate: Boolean(preferredDate),
        label: formatActivityDateLabel(preferredDate),
    };
}

function buildTimelineActivityTree(activities: any[]): TimelineTreeActivity[] {
    const normalized = activities.map((activity: any, index: number) => {
        const id = String(activity?.id ?? activity?.guicode ?? activity?.code ?? `activity-${index}`);
        const code = String(activity?.code ?? activity?.activityCode ?? "").trim();
        const status = normalizeStatus(activity?.activityStatus ?? activity?.status ?? activity?.progressStatus ?? activity?.fin_status);
        const expectedDate = formatActivityTimelineDate(activity, status);
        return {
            raw: activity,
            id,
            code,
            name: String(activity?.activityName ?? activity?.name ?? activity?.title ?? code ?? `Activity ${index + 1}`),
            status,
            expectedDateLabel: expectedDate.label,
            hasDate: expectedDate.hasDate,
        };
    });

    const activityByCode = new Map<string, TimelineTreeActivity>();
    const activityById = new Map<string, TimelineTreeActivity>();
    const childrenByParent = new Map<string, TimelineTreeActivity[]>();
    const childIds = new Set<string>();

    normalized.forEach((activity) => {
        const node: TimelineTreeActivity = {
            id: activity.id,
            code: activity.code || undefined,
            name: activity.name,
            status: activity.status,
            expectedDateLabel: activity.expectedDateLabel,
            hasDate: activity.hasDate,
            dependencies: [],
        };
        activityById.set(node.id, node);
        if (activity.code) activityByCode.set(activity.code, node);
    });

    normalized.forEach((activity) => {
        const currentNode = activityById.get(activity.id);
        if (!currentNode) return;
        const prerequisiteCodes = getPrerequisiteCodes(activity.raw);

        prerequisiteCodes.forEach((code) => {
            const parent = activityByCode.get(String(code).trim());
            if (!parent) return;
            const bucket = childrenByParent.get(parent.id) ?? [];
            bucket.push(currentNode);
            childrenByParent.set(parent.id, bucket);
            childIds.add(currentNode.id);
        });
    });

    const attachChildren = (node: TimelineTreeActivity, trail = new Set<string>()): TimelineTreeActivity => {
        if (trail.has(node.id)) return node;
        const nextTrail = new Set(trail);
        nextTrail.add(node.id);
        const children = (childrenByParent.get(node.id) ?? []).filter((child, index, arr) =>
            arr.findIndex((candidate) => candidate.id === child.id) === index
        );
        return {
            ...node,
            dependencies: children.map((child) => attachChildren(child, nextTrail)),
        };
    };

    const roots = normalized
        .map((activity) => activityById.get(activity.id))
        .filter((activity): activity is TimelineTreeActivity => activity != null && !childIds.has(activity.id));

    const dedupedRoots = roots.filter((activity, index, arr) => arr.findIndex((candidate) => candidate.id === activity.id) === index);

    return (dedupedRoots.length ? dedupedRoots : Array.from(activityById.values())).map((node) => attachChildren(node));
}

function buildTimelineProjects(projects: any[]): TimelineTreeProject[] {
    return projects.map(({ project, modules }: { project: any; modules: any[] }, projectIndex: number) => {
        const projectModules = (modules || []).map((module: any, moduleIndex: number) => {
            const activities = flattenActivities(module?.activities ?? module);
            const totalActivities = activities.length;
            const completedActivities = activities.filter((activity: any) =>
                normalizeStatus(activity?.activityStatus ?? activity?.status ?? activity?.progressStatus ?? activity?.fin_status) === "completed"
            ).length;
            const inProgressActivities = activities.filter((activity: any) =>
                normalizeStatus(activity?.activityStatus ?? activity?.status ?? activity?.progressStatus ?? activity?.fin_status) === "inprogress"
            ).length;
            const progress = totalActivities ? Math.round((completedActivities / totalActivities) * 100) : 0;
            const status =
                totalActivities > 0 && completedActivities === totalActivities
                    ? "completed"
                    : inProgressActivities > 0 || completedActivities > 0
                      ? "inprogress"
                      : "yettostart";

            return {
                id: String(module?.id ?? module?.moduleCode ?? module?.code ?? `module-${projectIndex}-${moduleIndex}`),
                name: String(module?.moduleName ?? module?.name ?? module?.title ?? `Module ${moduleIndex + 1}`),
                status,
                progress,
                activityCount: totalActivities,
                activities: buildTimelineActivityTree(activities),
            } satisfies TimelineTreeModule;
        });

        const totalActivities = projectModules.reduce((sum, module) => sum + module.activityCount, 0);
        const completedActivities = projectModules.reduce(
            (sum, module) => sum + Math.round((module.progress / 100) * module.activityCount),
            0
        );
        const modulesInProgress = projectModules.filter((module) => module.status === "inprogress").length;
        const modulesCompleted = projectModules.filter((module) => module.status === "completed").length;
        const progress = totalActivities ? Math.round((completedActivities / totalActivities) * 100) : 0;
        const status =
            projectModules.length > 0 && modulesCompleted === projectModules.length
                ? "completed"
                : modulesInProgress > 0 || modulesCompleted > 0
                  ? "inprogress"
                  : "yettostart";

        return {
            id: String(project?.id ?? project?.projectId ?? `project-${projectIndex}`),
            name: String(
                project?.projectParameters?.projectName || project?.projectName || project?.name || `Project ${projectIndex + 1}`
            ).trim(),
            status,
            progress,
            moduleCount: projectModules.length,
            activityCount: totalActivities,
            modules: projectModules,
        } satisfies TimelineTreeProject;
    });
}

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

const WorkspaceHome = () => {
    const navigate = useNavigate();
    const prefersReducedMotion = useReducedMotion();
    const [user, setUser] = useState<any>(null);
    const [timeGreeting, setTimeGreeting] = useState(() => getTimeGreeting());
    const [topbarDateTime, setTopbarDateTime] = useState(() => getTopbarDateTime());
    const [csrContent, setCsrContent] = useState<CsrContentConfig>(defaultCsrContentConfig);
    const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);

    const [summary, setSummary] = useState({
        projectCount: 0,
        withTimeline: 0,
        timelineVersions: 0,
        mocEfficiencyCompliance: 0,
        overallTimelineAdherence: 0,
        responsibleActivities: 0,
        completedActivities: 0,
        delayedActivities: 0,
    });
    const [briefingUpdates, setBriefingUpdates] = useState<BriefingUpdate[]>([]);
    const [timelineProjects, setTimelineProjects] = useState<TimelineTreeProject[]>([]);

    useEffect(() => {
        const sync = () => setUser(userStore.getUser());
        sync();
        return userStore.subscribe(sync);
    }, []);

    useEffect(() => {
        const refresh = () => {
            setTimeGreeting(getTimeGreeting());
            setTopbarDateTime(getTopbarDateTime());
        };
        refresh();
        const intervalId = window.setInterval(refresh, 1_000);
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
                const company =
                    orgId
                        ? await db.getCompanyByGuiId(orgId)
                        : null;

                const withTl = orgProjects.filter(
                    (p: any) => Array.isArray(p?.projectTimeline) && p.projectTimeline.length > 0
                );
                const timelineVersions = orgProjects.reduce((sum: number, p: any) => {
                    const n = Array.isArray(p?.projectTimeline) ? p.projectTimeline.length : 0;
                    return sum + n;
                }, 0);
                const latestProjectModules = await Promise.all(
                    orgProjects.map(async (project: any) => ({
                        project,
                        modules: await getLatestProjectModules(project),
                    }))
                );
                const homepageTimelineProjects = buildTimelineProjects(latestProjectModules);
                const allActivities = latestProjectModules.flatMap(({ modules }) => flattenActivities(modules));
                const responsibleActivities = allActivities.filter((activity: any) => {
                    const assignedTo = activity?.assignedUserId ?? activity?.responsiblePerson ?? activity?.assignedTo;
                    return assignedTo != null && String(assignedTo).trim() !== "";
                }).length;
                const completedActivities = allActivities.filter((activity: any) => {
                    const status = String(
                        activity?.activityStatus ?? activity?.status ?? activity?.progressStatus ?? ""
                    ).toLowerCase();
                    return status.includes("complete") || status.includes("done") || status.includes("closed");
                }).length;
                const delayedActivities = allActivities.filter((activity: any) => {
                    const status = String(
                        activity?.activityStatus ?? activity?.status ?? activity?.progressStatus ?? ""
                    ).toLowerCase();
                    return status.includes("delay") || status.includes("overdue") || status.includes("late");
                }).length;
                const mocEfficiencyCompliance =
                    orgProjects.length > 0 ? Math.round((withTl.length / orgProjects.length) * 100) : 0;
                const totalTrackedActivities = completedActivities + delayedActivities;
                const overallTimelineAdherence =
                    totalTrackedActivities > 0
                        ? Math.max(0, Math.round((completedActivities / totalTrackedActivities) * 100))
                        : 0;

                const projectBriefings: BriefingUpdate[] = orgProjects
                    .map((p: any, index: number) => {
                        const name = String(
                            p?.projectParameters?.projectName || p?.projectName || p?.name || `Project ${p?.id ?? index + 1}`
                        ).trim() || `Project ${p?.id ?? index + 1}`;
                        const timelineCount = Array.isArray(p?.projectTimeline) ? p.projectTimeline.length : 0;
                        const statusRaw = String(
                            p?.status || p?.projectStatus || p?.approvalStatus || "In progress"
                        ).trim();
                        const status = statusRaw || "In progress";
                        const updatedAt =
                            parseDate(p?.updatedAt) ||
                            parseDate(p?.createdAt) ||
                            new Date(0);
                        const dateLabel =
                            updatedAt.getTime() > 0
                                ? formatDistanceToNow(updatedAt, { addSuffix: true })
                                : "Recently updated";
                        const badge =
                            status.toLowerCase().includes("delay")
                                ? "Attention"
                                : status.toLowerCase().includes("complete")
                                  ? "Complete"
                                  : timelineCount > 0
                                    ? "Live"
                                    : "Update";

                        return {
                            id: `briefing-${p?.id ?? index}`,
                            badge,
                            title: name,
                            date: dateLabel,
                            excerpt: `Status: ${status}. ${timelineCount > 0 ? `${timelineCount} timeline version${timelineCount === 1 ? "" : "s"} available.` : "Timeline not published yet."}`,
                            at: updatedAt,
                        };
                    })
                    .sort((a, b) => b.at.getTime() - a.at.getTime())
                    .slice(0, 10)
                    .map(({ at: _at, ...item }) => item);

                if (!active) return;
                setSummary({
                    projectCount: orgProjects.length,
                    withTimeline: withTl.length,
                    timelineVersions,
                    mocEfficiencyCompliance,
                    overallTimelineAdherence,
                    responsibleActivities,
                    completedActivities,
                    delayedActivities,
                });
                setBriefingUpdates(projectBriefings);
                setTimelineProjects(homepageTimelineProjects);
                setCsrContent(normalizeCsrContentConfig(company?.csrContentConfig));
            } catch {
                if (active) {
                    setSummary({
                        projectCount: 0,
                        withTimeline: 0,
                        timelineVersions: 0,
                        mocEfficiencyCompliance: 0,
                        overallTimelineAdherence: 0,
                        responsibleActivities: 0,
                        completedActivities: 0,
                        delayedActivities: 0,
                    });
                    setBriefingUpdates([]);
                    setTimelineProjects([]);
                    setCsrContent(defaultCsrContentConfig);
                }
            }
        };
        load();
        return () => {
            active = false;
        };
    }, [user?.orgId, user?.email]);

    const displayName = String(user?.name || "there").trim() || "there";
    const firstName = displayName.split(/\s+/)[0] || displayName;
    const organizationName = useMemo(() => {
        const raw = user?.organizationName || user?.orgName || user?.companyName;
        if (raw == null || String(raw).trim() === "") return "the organization";
        return String(raw).trim();
    }, [user?.organizationName, user?.orgName, user?.companyName]);
    const leadershipUpdates = briefingUpdates.length > 0 ? briefingUpdates : ORG_ANNOUNCEMENTS;
    const leadershipTickerItems =
        leadershipUpdates.length > 1 ? [...leadershipUpdates, ...leadershipUpdates] : leadershipUpdates;
    const homeVisuals = useMemo(
        () => csrContent.homeVisualItems.slice(0, HOME_VISUAL_DISPLAY_COUNT),
        [csrContent.homeVisualItems]
    );
    const spotlightVisual = homeVisuals[activeGalleryIndex] || homeVisuals[0];
    const galleryDots = homeVisuals.map((visual, index) => ({
        index,
        visual,
    }));
    useEffect(() => {
        setActiveGalleryIndex((prev) => {
            if (homeVisuals.length === 0) return 0;
            return Math.min(prev, homeVisuals.length - 1);
        });
    }, [homeVisuals]);

    useEffect(() => {
        if (prefersReducedMotion || homeVisuals.length <= 1) return;
        const intervalId = window.setInterval(() => {
            setActiveGalleryIndex((prev) => (prev + 1) % homeVisuals.length);
        }, 2500);
        return () => window.clearInterval(intervalId);
    }, [homeVisuals, prefersReducedMotion]);

    return (
        <div className="wh-page">
            <div className="wh-page-bg" aria-hidden />

            <header className="wh-hero wh-hero--portal">
                <div className="wh-hero-shell">
                    <motion.div
                        className="wh-hero-topbar"
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, ease: easeSmooth }}
                    >
                        <div className="wh-hero-topbar-copy">
                            <div className="wh-topbar-main">
                                <div className="wh-topbar-heading">
                                    <h1 className="wh-topbar-title">
                                        <span>{timeGreeting}, {firstName}</span>
                                    </h1>
                                    <p className="wh-topbar-subtitle">
                                        A focused execution cockpit for {organizationName}.
                                    </p>
                                </div>
                                <div className="wh-topbar-meta">
                                    <span className="wh-topbar-datetime">{topbarDateTime}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        className="wh-hero-spotlight"
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, delay: 0.08, ease: easeSmooth }}
                    >
                        <div className="wh-hero-spotlight-noise" aria-hidden />
                        <div className="wh-hero-spotlight-orbit wh-hero-spotlight-orbit--one" aria-hidden />
                        <div className="wh-hero-spotlight-orbit wh-hero-spotlight-orbit--two" aria-hidden />
                        <div className="wh-hero-spotlight-grid">
                            <div className="wh-hero-spotlight-photo-wrap">
                                <div className="wh-hero-spotlight-photo-frame">
                                    <img src={csrContent.homeHeroImage} alt="" className="wh-hero-spotlight-photo" />
                                </div>
                            </div>
                            <div className="wh-hero-spotlight-copy">
                                <p className="wh-hero-quote">
                                    {csrContent.homeHeroQuote}
                                </p>
                                <p className="wh-hero-quote-body">
                                    {csrContent.homeHeroBody.includes("organization")
                                        ? csrContent.homeHeroBody.replace("the organization", organizationName)
                                        : csrContent.homeHeroBody}
                                </p>
                            </div>
                            <div className="wh-hero-spotlight-art">
                                <WorkspaceHeroVideo
                                    videoUrl={csrContent.homeHeroVideo}
                                    posterUrl={csrContent.homeHeroVideoPoster}
                                    title={`${organizationName} briefing`}
                                />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </header>

            <div className="wh-body">
                <motion.section
                    className="wh-story-intro"
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
                    whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                    viewport={viewportOnce}
                    transition={{ duration: 0.45, ease: easeSmooth }}
                >
                </motion.section>

                <div className="wh-story-grid">
                    <div className="wh-story-left">
                        <motion.section
                            className="wh-pulse-panel"
                            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                            whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                            viewport={viewportOnce}
                            transition={{ duration: 0.5, ease: easeSmooth }}
                            aria-labelledby="wh-pulse-heading"
                        >
                            <div className="wh-pulse-head">
                                <span className="wh-mini-kicker">Your Workspace:</span>
                                <h2 id="wh-pulse-heading" className="wh-pulse-title">
                                    Track | Act | Deliver - your workspace for complete execution control
                                </h2>
                            </div>
                            <div className="wh-pulse-metrics">
                                <article className="wh-pulse-metric">
                                    <span className="wh-pulse-metric-value">{summary.projectCount}</span>
                                    <span className="wh-pulse-metric-label">Projects in your workspace</span>
                                </article>
                                <article className="wh-pulse-metric">
                                    <span className="wh-pulse-metric-value">{summary.mocEfficiencyCompliance}%</span>
                                    <span className="wh-pulse-metric-label">MOC Effciency Compliance</span>
                                </article>
                                <article className="wh-pulse-metric">
                                    <span className="wh-pulse-metric-value">{summary.overallTimelineAdherence}%</span>
                                    <span className="wh-pulse-metric-label">Overall Timeline Adherence</span>
                                </article>
                                <article className="wh-pulse-metric">
                                    <span className="wh-pulse-metric-value">{summary.responsibleActivities}</span>
                                    <span className="wh-pulse-metric-label">Responsible Activities</span>
                                </article>
                                <article className="wh-pulse-metric">
                                    <span className="wh-pulse-metric-value">{summary.completedActivities}</span>
                                    <span className="wh-pulse-metric-label">Completed Activities</span>
                                </article>
                                <article className="wh-pulse-metric">
                                    <span className="wh-pulse-metric-value">{summary.delayedActivities}</span>
                                    <span className="wh-pulse-metric-label">Delayed Activities</span>
                                </article>
                            </div>
                            <div className="wh-pulse-actions">
                                <Button
                                    type="primary"
                                    size="large"
                                    className="wh-btn-primary"
                                    onClick={() => navigate("/project")}
                                >
                                    Continue to Projects
                                </Button>
                                <Button
                                    size="large"
                                    className="wh-btn-ghost"
                                    onClick={() => navigate("/document")}
                                >
                                    Access Documents
                                </Button>
                                <Button
                                    size="large"
                                    className="wh-btn-ghost"
                                    onClick={() => navigate("/knowledge-center")}
                                >
                                    Knowledge Center
                                </Button>
                            </div>
                        </motion.section>

                        {spotlightVisual ? (
                            <motion.section
                                className="wh-story-image-panel"
                                initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                                whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                                viewport={viewportOnce}
                                transition={{ duration: 0.5, ease: easeSmooth, delay: 0.04 }}
                                aria-label={spotlightVisual.title}
                            >
                                <AnimatePresence mode="wait">
                                    <motion.img
                                        key={spotlightVisual.id}
                                        src={spotlightVisual.image}
                                        alt={spotlightVisual.title}
                                        className="wh-story-image"
                                        loading="lazy"
                                        decoding="async"
                                        initial={prefersReducedMotion ? false : { opacity: 0, x: 36, scale: 1.04 }}
                                        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 }}
                                        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -36, scale: 0.985 }}
                                        transition={{ duration: 0.6, ease: easeSmooth }}
                                    />
                                </AnimatePresence>
                                <div className="wh-story-image-overlay" />
                                {galleryDots.length > 0 ? (
                                    <div className="wh-story-image-dots" aria-label={`Gallery image ${activeGalleryIndex + 1} of ${homeVisuals.length}`}>
                                        {galleryDots.map(({ index, visual }) => (
                                            <motion.button
                                                key={visual.id}
                                                type="button"
                                                className={`wh-story-image-dot ${index === activeGalleryIndex ? "is-active" : ""}`}
                                                onClick={() => setActiveGalleryIndex(index)}
                                                aria-label={`Show image ${index + 1}`}
                                                aria-pressed={index === activeGalleryIndex}
                                                animate={
                                                    prefersReducedMotion
                                                        ? undefined
                                                        : index === activeGalleryIndex
                                                          ? { scale: 1.06 }
                                                          : { scale: 1 }
                                                }
                                                transition={{ duration: 0.24, ease: easeSmooth }}
                                            />
                                        ))}
                                    </div>
                                ) : null}
                                <div className="wh-story-image-copy">
                                    <span className="wh-story-image-kicker">Workspace visual</span>
                                    <h3 className="wh-story-image-title">{spotlightVisual.title}</h3>
                                    <p className="wh-story-image-caption">{spotlightVisual.caption}</p>
                                </div>
                            </motion.section>
                        ) : null}
                    </div>

                    <motion.section
                        className="wh-briefing-panel"
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                        whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                        viewport={viewportOnce}
                        transition={{ duration: 0.5, ease: easeSmooth, delay: 0.06 }}
                        aria-labelledby="wh-briefing-heading"
                    >
                        <div className="wh-panel-head wh-briefing-head">
                            <div>
                                <h2 id="wh-briefing-heading" className="wh-panel-title wh-briefing-panel-title">
                                    Updates
                                </h2>
                            </div>
                        </div>
                        <div className="wh-briefing-ticker" aria-label="Rolling project updates">
                            <ul className="wh-briefing-list">
                                {leadershipTickerItems.map((a, index) => (
                                    <li
                                        key={`${a.id}-${index}`}
                                        className="wh-briefing-item"
                                        aria-hidden={leadershipUpdates.length > 1 && index >= leadershipUpdates.length}
                                    >
                                        <div className="wh-announce-meta">
                                            <div className="wh-briefing-meta-main">
                                                <span className={`wh-briefing-badge wh-briefing-badge--${a.badge.toLowerCase().replace(/\s+/g, "-")}`}>
                                                    {a.badge}
                                                </span>
                                                <h3 className="wh-briefing-title">{a.title}</h3>
                                            </div>
                                            <div className="wh-briefing-meta-side">
                                                <time className="wh-announce-date">{a.date}</time>
                                                <button
                                                    type="button"
                                                    className="wh-briefing-arrow"
                                                    onClick={() => navigate("/project")}
                                                    aria-label={`Open update for ${a.title}`}
                                                >
                                                    <ArrowRightOutlined />
                                                </button>
                                            </div>
                                        </div>
                                        {/* <p className="wh-briefing-copy">{a.excerpt}</p> */}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </motion.section>
                </div>

                <motion.div
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
                    whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                    viewport={viewportOnce}
                    transition={{ duration: 0.48, ease: easeSmooth }}
                >
                    <TimelineTreeView
                        projects={timelineProjects}
                        prefersReducedMotion={prefersReducedMotion ?? undefined}
                    />
                </motion.div>

                <motion.section
                    className="wh-initiative-band"
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                    whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                    viewport={viewportOnce}
                    transition={{ duration: 0.45, ease: easeSmooth }}
                >
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
            </div>
        </div>
    );
};

export default WorkspaceHome;
