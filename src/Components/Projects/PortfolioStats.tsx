import { useEffect, useMemo, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import "../../styles/PortfolioStats.css";
import { db } from "../../Utils/dataStorege.ts";
import { getCurrentUser } from "../../Utils/moduleStorage.ts";

type ActivityRow = {
    projectId: string;
    projectName: string;
    moduleName: string;
    activityName: string;
    standardizedName: string;
    plannedStart?: string;
    plannedEnd?: string;
    actualStart?: string;
    actualEnd?: string;
    status?: string;
    meta?: any;
};

const dayMs = 24 * 60 * 60 * 1000;

const toLocalMidnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const parseAnyDate = (s?: string) => {
    if (!s) return null;
    const str = String(s).trim();
    if (!str) return null;

    const dmY = /^(\d{2})-(\d{2})-(\d{4})$/;
    const m = str.match(dmY);
    if (m) {
        const dd = Number(m[1]);
        const mm = Number(m[2]);
        const yyyy = Number(m[3]);
        return new Date(yyyy, mm - 1, dd);
    }

    const ymd = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T\\s])/;
    const y = str.match(ymd);
    if (y) {
        const yyyy = Number(y[1]);
        const mm = Number(y[2]);
        const dd = Number(y[3]);
        return new Date(yyyy, mm - 1, dd);
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) return toLocalMidnight(d);

    const d2 = new Date(str + "T00:00:00");
    return isNaN(d2.getTime()) ? null : toLocalMidnight(d2);
};

const fmt = (d: Date | null) => {
    if (!d) return "-";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
};

const MAX_LABEL_CHARS = 14;
const truncateLabel = (value: string, max = MAX_LABEL_CHARS) => {
    const safe = String(value ?? "");
    if (safe.length <= max) return safe;
    if (max <= 3) return safe.slice(0, max);
    return `${safe.slice(0, max - 3)}...`;
};

const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));

const resolveProjectModules = async (project: any, timelineId?: string) => {
    if (timelineId) {
        const directTimelineData = await db.getProjectTimelineById(timelineId);
        if (Array.isArray(directTimelineData)) {
            return directTimelineData;
        }

        const numericTimelineId = Number(timelineId);
        if (!Number.isNaN(numericTimelineId)) {
            const numericTimelineData = await db.getProjectTimelineById(numericTimelineId);
            if (Array.isArray(numericTimelineData)) {
                return numericTimelineData;
            }
        }
    }

    const versions = Array.isArray(project?.projectTimeline) ? project.projectTimeline : [];
    const latestVersion = localStorage.getItem("latestProjectVersion");
    const selected =
        (latestVersion ? versions.find((v: any) => String(v?.version) === String(latestVersion)) : null) ||
        versions[versions.length - 1] ||
        versions[0];

    if (selected?.timelineId) {
        const fallbackTimeline = await db.getProjectTimelineById(selected.timelineId);
        if (Array.isArray(fallbackTimeline)) {
            return fallbackTimeline;
        }
    }

    if (Array.isArray(project?.processedTimelineData)) {
        return project.processedTimelineData;
    }

    if (Array.isArray(project?.initialStatus?.items)) {
        return project.initialStatus.items;
    }

    return [];
};

const PortfolioStats = () => {
    const [rows, setRows] = useState<ActivityRow[]>([]);
    const [standardizationNames, setStandardizationNames] = useState<string[]>([]);
    const [state, setState] = useState<"loading" | "ready" | "empty" | "error">("loading");
    const [standardizedFilter, setStandardizedFilter] = useState<string>("");

    useEffect(() => {
        const load = async () => {
            try {
                setState("loading");
                const currentUser = getCurrentUser();
                const stored = await db.getProjects();
                const projects = (stored || []).filter((p: any) => p?.orgId === currentUser?.orgId);
                const [masters, standardizedActivities] = currentUser?.orgId
                    ? await Promise.all([
                        db.getStandardizationMastersByOrg(String(currentUser.orgId)),
                        db.getStandardizedActivitiesByOrg(String(currentUser.orgId)),
                    ])
                    : [[], []];

                const masterNames = uniq(
                    masters
                        .map((item: any) => String(item?.name || "").trim())
                        .filter(Boolean)
                );

                setStandardizationNames(masterNames);

                if (!masterNames.length) {
                    setRows([]);
                    setState("empty");
                    return;
                }

                const timelineProjectMap = new Map<string, any>();
                const projectIdMap = new Map<string, any>();
                projects.forEach((project: any) => {
                    projectIdMap.set(String(project?.id ?? ""), project);
                    const versions = Array.isArray(project?.projectTimeline) ? project.projectTimeline : [];
                    versions.forEach((version: any) => {
                        const timelineId = String(version?.timelineId || "");
                        if (timelineId) {
                            timelineProjectMap.set(timelineId, project);
                        }
                    });
                });

                const collected: ActivityRow[] = [];
                const seen = new Set<string>();

                for (const standardized of standardizedActivities) {
                    const timelineId = String(standardized?.timelineId || "");
                    const moduleCode = String(standardized?.moduleCode ?? "");
                    const activityCode = String(standardized?.activityCode ?? "");
                    const standardizedName = String(standardized?.standardizedName ?? "");

                    if (!timelineId || !moduleCode || !activityCode || !standardizedName) continue;

                    const dedupeKey = `${timelineId}__${moduleCode}__${activityCode}__${standardizedName}`;
                    if (seen.has(dedupeKey)) continue;
                    seen.add(dedupeKey);

                    const project =
                        timelineProjectMap.get(timelineId) ||
                        projectIdMap.get(String(standardized?.projectId ?? ""));
                    if (!project) continue;

                    const modules = await resolveProjectModules(project, timelineId);
                    const projectName = project?.projectParameters?.projectName || project?.name || `Project ${project?.id}`;

                    const matchedModule = modules.find(
                        (module: any) => String(module?.parentModuleCode ?? "") === moduleCode
                    );
                    if (!matchedModule) continue;

                    const matchedActivity = (matchedModule?.activities ?? []).find(
                        (activity: any) => String(activity?.code ?? "") === activityCode
                    );
                    if (!matchedActivity) continue;

                    collected.push({
                        projectId: String(project?.id ?? ""),
                        projectName,
                        moduleName: String(matchedModule?.moduleName ?? matchedModule?.parentModuleCode ?? "Module"),
                        activityName: String(matchedActivity?.activityName ?? matchedActivity?.code ?? "Activity"),
                        standardizedName,
                        plannedStart: matchedActivity?.start,
                        plannedEnd: matchedActivity?.end,
                        actualStart: matchedActivity?.actualStart,
                        actualEnd: matchedActivity?.actualFinish ?? matchedActivity?.actualEnd,
                        status:
                            matchedActivity?.activityStatus ??
                            matchedActivity?.fin_status ??
                            matchedActivity?.workStatus ??
                            matchedActivity?.status ??
                            matchedActivity?.state,
                        meta: matchedActivity,
                    });
                }

                setRows(collected);
                setState("ready");
            } catch (err) {
                console.error("Failed to load portfolio statistics:", err);
                setRows([]);
                setStandardizationNames([]);
                setState("error");
            }
        };

        load();
    }, []);

    const standardizedOptions = useMemo(() => {
        return standardizationNames;
    }, [standardizationNames]);

    useEffect(() => {
        if (!standardizedOptions.length) {
            setStandardizedFilter("");
        } else if (!standardizedFilter && standardizedOptions.length) {
            setStandardizedFilter(standardizedOptions[0]);
        } else if (standardizedFilter && standardizedOptions.length && !standardizedOptions.includes(standardizedFilter)) {
            setStandardizedFilter(standardizedOptions[0]);
        }
    }, [standardizedFilter, standardizedOptions]);

    const filtered = useMemo(() => {
        return rows.filter((r) => {
            if (!standardizedFilter) return false;
            if (r.standardizedName !== standardizedFilter) return false;
            return true;
        });
    }, [rows, standardizedFilter]);

    const chartData = useMemo(() => {
        const grouped = new Map<
            string,
            {
                key: string;
                label: string;
                projectName: string;
                moduleName: string;
                activityName: string;
                standardizedName: string;
                plannedStartTs: number | null;
                plannedEndTs: number | null;
                actualStartTs: number | null;
                actualEndTs: number | null;
                status: string;
            }
        >();

        for (const r of filtered) {
            const key = `${r.projectId}__${r.moduleName}__${r.activityName}`;
            const ps = parseAnyDate(r.plannedStart);
            const pe = parseAnyDate(r.plannedEnd) || ps;
            const as = parseAnyDate(r.actualStart);
            const ae = parseAnyDate(r.actualEnd) || as;
            const status = String(r.status || "").trim();

            if (!grouped.has(key)) {
                grouped.set(key, {
                    key,
                    label: r.projectName,
                    projectName: r.projectName,
                    moduleName: r.moduleName,
                    activityName: r.activityName,
                    standardizedName: r.standardizedName,
                    plannedStartTs: ps ? ps.getTime() : null,
                    plannedEndTs: pe ? pe.getTime() : null,
                    actualStartTs: as ? as.getTime() : null,
                    actualEndTs: ae ? ae.getTime() : null,
                    status: status || "-",
                });
                continue;
            }

            const existing = grouped.get(key)!;
            const psTs = ps ? ps.getTime() : null;
            const peTs = pe ? pe.getTime() : null;
            const asTs = as ? as.getTime() : null;
            const aeTs = ae ? ae.getTime() : null;

            if (psTs != null) {
                existing.plannedStartTs = existing.plannedStartTs == null ? psTs : Math.min(existing.plannedStartTs, psTs);
            }
            if (peTs != null) {
                existing.plannedEndTs = existing.plannedEndTs == null ? peTs : Math.max(existing.plannedEndTs, peTs);
            }
            if (asTs != null) {
                existing.actualStartTs = existing.actualStartTs == null ? asTs : Math.min(existing.actualStartTs, asTs);
            }
            if (aeTs != null) {
                existing.actualEndTs = existing.actualEndTs == null ? aeTs : Math.max(existing.actualEndTs, aeTs);
            }
            if (status) existing.status = status;
        }

        return Array.from(grouped.values()).map((g) => {
            let plannedPoint = g.plannedEndTs ?? g.plannedStartTs;
            let actualPoint = g.actualEndTs ?? g.actualStartTs;

            if (plannedPoint == null && actualPoint != null) plannedPoint = actualPoint;
            if (actualPoint == null && plannedPoint != null) actualPoint = plannedPoint;

            const plannedStart = fmt(g.plannedStartTs != null ? new Date(g.plannedStartTs) : null);
            const plannedEnd = fmt(g.plannedEndTs != null ? new Date(g.plannedEndTs) : null);
            const actualStart = fmt(g.actualStartTs != null ? new Date(g.actualStartTs) : null);
            const actualEnd = fmt(g.actualEndTs != null ? new Date(g.actualEndTs) : null);

            return {
                key: g.key,
                label: g.projectName,
                projectName: g.projectName,
                moduleName: g.moduleName,
                activityName: g.activityName,
                standardizedName: g.standardizedName,
                plannedValue: plannedPoint,
                actualValue: actualPoint,
                plannedStart,
                plannedEnd,
                actualStart,
                actualEnd,
                status: g.status || "-",
            };
        });
    }, [filtered]);

    const dateRange = useMemo(() => {
        let minPlannedStart: number | null = null;
        let maxActualEnd: number | null = null;

        for (const r of filtered) {
            const ps = parseAnyDate(r.plannedStart);
            const ae = parseAnyDate(r.actualEnd);

            const psTs = ps ? ps.getTime() : null;
            const aeTs = ae ? ae.getTime() : null;

            if (psTs != null) {
                minPlannedStart = minPlannedStart == null ? psTs : Math.min(minPlannedStart, psTs);
            }
            if (aeTs != null) {
                maxActualEnd = maxActualEnd == null ? aeTs : Math.max(maxActualEnd, aeTs);
            }
        }

        const plannedPoints = chartData
            .map((r) => r.plannedValue)
            .filter((v): v is number => Number.isFinite(v));
        const actualPoints = chartData
            .map((r) => r.actualValue)
            .filter((v): v is number => Number.isFinite(v));

        if (minPlannedStart == null && plannedPoints.length) {
            minPlannedStart = Math.min(...plannedPoints);
        }
        if (maxActualEnd == null && actualPoints.length) {
            maxActualEnd = Math.max(...actualPoints);
        }

        if (minPlannedStart == null || maxActualEnd == null) {
            const now = toLocalMidnight(new Date()).getTime();
            return { min: now, max: now + dayMs * 7 };
        }

        const rawStart = toLocalMidnight(new Date(minPlannedStart)).getTime();
        const startDate = new Date(rawStart);
        startDate.setDate(1);
        const start = toLocalMidnight(startDate).getTime();
        const end = toLocalMidnight(new Date(maxActualEnd)).getTime();

        return { min: start, max: end };
    }, [chartData, filtered]);

    const yTicks = useMemo(() => {
        const { min, max } = dateRange;
        const start = toLocalMidnight(new Date(min)).getTime();
        const end = toLocalMidnight(new Date(max)).getTime();
        const ticks: number[] = [];
        for (let t = start; t <= end; t += dayMs * 7) {
            ticks.push(t);
        }
        return ticks;
    }, [dateRange]);

    const chartHeight = Math.max(420, chartData.length * 64);

    if (state === "loading") {
        return (
            <div className="pst-empty">
                <div className="pst-empty-title">Loading Project Statistics</div>
                <div className="pst-empty-subtitle">Fetching portfolio activity timelines.</div>
            </div>
        );
    }

    if (state === "error") {
        return (
            <div className="pst-empty">
                <div className="pst-empty-title">Unable to Load Statistics</div>
                <div className="pst-empty-subtitle">Please try again or check the project timelines.</div>
            </div>
        );
    }

    if (state === "empty" || !rows.length) {
        return (
            <div className="pst-empty">
                <div className="pst-empty-title">No Project Statistics</div>
                <div className="pst-empty-subtitle">Create standerized activity mappings to compare the same work across projects.</div>
            </div>
        );
    }

    return (
        <div className="pst-shell">
            {!filtered.length ? (
                <div className="pst-empty">
                    <div className="pst-empty-title">No Activities Found</div>
                    <div className="pst-empty-subtitle">Select another standardized activity to see linked project timelines.</div>
                </div>
            ) : (
                <div className="pst-grid">
                    <div className="pst-card pst-card-wide">
                        <div className="pst-card-header">
                            <div>
                                <div className="pst-card-title">Planned vs Actual Timeline</div>
                                <div className="pst-card-subtitle">Compare the same standardized activity across projects.</div>
                            </div>
                            <div className="pst-filters">
                                <label className="pst-filter">
                                    <span>Standardized Activity</span>
                                    <select value={standardizedFilter} onChange={(e) => setStandardizedFilter(e.target.value)}>
                                        {standardizedOptions.map((name) => (
                                            <option key={name} value={name}>
                                                {name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                        </div>
                        <div className="pst-chart" style={{ height: chartHeight }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={chartData}
                                    margin={{ top: 10, right: 18, left: 28, bottom: 30 }}
                                    barGap={4}
                                    barCategoryGap="12%"
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="label"
                                        interval={0}
                                        height={52}
                                        tick={(props: any) => {
                                            const { x, y, payload } = props;
                                            const raw = String(payload?.value || "");
                                            const projectName = raw;
                                            const displayName = truncateLabel(projectName);
                                            const yOffset = 22;
                                            return (
                                                <g transform={`translate(${x},${y + yOffset})`}>
                                                    <text textAnchor="middle" style={{ pointerEvents: "all" }} aria-label={projectName}>
                                                        <title>{projectName}</title>
                                                        <tspan x="0" dy="18">{displayName}</tspan>
                                                    </text>
                                                </g>
                                            );
                                        }}
                                    />
                                    <YAxis
                                        type="number"
                                        domain={[dateRange.min, dateRange.max]}
                                        ticks={yTicks}
                                        tickFormatter={(value) => fmt(new Date(Number(value)))}
                                        width={92}
                                        tickMargin={8}
                                    />
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (!active || !payload?.length) return null;
                                            const row = payload[0]?.payload;
                                            if (!row) return null;
                                            const isActual = payload.some((p: any) => p?.dataKey === "actualValue");

                                            return (
                                                <div className="pst-tooltip">
                                                    <div className="pst-tooltip-title">Project: {row.projectName}</div>
                                                    <div className="pst-tooltip-line">Standardized Activity: {row.standardizedName}</div>
                                                    <div className="pst-tooltip-line">Activity: {row.activityName}</div>
                                                    <div className="pst-tooltip-line">Module: {row.moduleName}</div>
                                                    <div className="pst-tooltip-section">Planned</div>
                                                    <div className="pst-tooltip-line">Start: {row.plannedStart}</div>
                                                    <div className="pst-tooltip-line">End: {row.plannedEnd}</div>
                                                    {isActual && (
                                                        <>
                                                            <div className="pst-tooltip-section">Actual</div>
                                                            <div className="pst-tooltip-line">Start: {row.actualStart}</div>
                                                            <div className="pst-tooltip-line">End: {row.actualEnd}</div>
                                                            <div className="pst-tooltip-line">Status: {row.status}</div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        }}
                                    />
                                    <Legend />
                                    <Bar dataKey="plannedValue" name="Planned" barSize={18} fill="#1d4ed8" />
                                    <Bar dataKey="actualValue" name="Actual" barSize={18} fill="#0ea5a6" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PortfolioStats;
