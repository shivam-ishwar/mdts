import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Legend,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    ReferenceDot,
} from "recharts";
import { db } from "../Utils/dataStorege.ts";
import "../styles/charts.css";

type Task = {
    id: string;
    module: string;
    group: string;
    activity: string;
    owner: string;
    plannedStart: string;
    plannedEnd: string;
    actualStart?: string;
    actualEnd?: string;
    slackDays?: number;
    meta?: any;
};

type Row = {
    id: string;
    name: string;
    module: string;
    group: string;
    activity: string;
    owner: string;

    plannedOffset: number;
    plannedDuration: number;

    actualOffset: number;
    actualDuration: number;

    plannedStart: string;
    plannedEnd: string;
    actualStart: string;
    actualEnd: string;
    plannedStartTs: number;
    plannedBaselineStartTs: number | null;
    plannedEndTs: number;
    actualStartTs: number | null;
    actualEndTs: number | null;

    delayDays: number;
    startSlipDays: number;
    slackDays: number;
    status: "On Track" | "At Risk" | "Delayed" | "Completed";
    executionStatus: "Yet To Start" | "In Progress" | "Completed";
    meta?: any;
};

type GraphRangeKey = "ALL" | "1D" | "7D" | "1M" | "3M" | "YTD" | "CUSTOM";
type GanttQuickRange = "1D" | "7D" | "15D" | "1M" | "6M" | "12M" | "CUSTOM";

type AdvancedFilters = {
    dateFrom: string;
    dateTo: string;
};
type HealthPreset = "TODAY" | "7D" | "15D" | "1M" | "6M" | "12M" | "CUSTOM";

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

    const ymd = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/;
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

const toDay = (d: Date) => Math.floor(d.getTime() / dayMs);
const diffDays = (a: Date, b: Date) => toDay(a) - toDay(b);
const clampNonNeg = (n: number) => (n < 0 ? 0 : n);

const fmt = (d: Date | null) => {
    if (!d) return "-";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
};

const asNum = (v: any) => {
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    if (typeof v === "string") {
        const cleaned = v.replace(/,/g, "").trim();
        if (!cleaned) return 0;
        const n = Number(cleaned);
        return Number.isFinite(n) ? n : 0;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const addDays = (d: Date, days: number) => new Date(d.getTime() + days * dayMs);

const toInputDate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));

const resolveGraphWindow = (range: GraphRangeKey, customFrom?: string, customTo?: string) => {
    const today = toLocalMidnight(new Date());
    const ytdStart = new Date(today.getFullYear(), 0, 1);

    let from: Date | null = null;
    let to: Date | null = null;

    if (range === "1D") {
        from = today;
        to = today;
    } else if (range === "7D") {
        from = addDays(today, -6);
        to = today;
    } else if (range === "1M") {
        from = addDays(today, -29);
        to = today;
    } else if (range === "3M") {
        from = addDays(today, -89);
        to = today;
    } else if (range === "YTD") {
        from = ytdStart;
        to = today;
    } else if (range === "CUSTOM") {
        from = customFrom ? parseAnyDate(customFrom) : null;
        to = customTo ? parseAnyDate(customTo) : null;
    }

    return { from, to };
};

const rowInWindow = (r: Row, from: Date | null, to: Date | null) => {
    const spanStart = r.actualStartTs ?? r.plannedStartTs;
    const spanEnd = r.actualEndTs ?? r.plannedEndTs;
    if (from && spanEnd < from.getTime()) return false;
    if (to && spanStart > to.getTime()) return false;
    return true;
};

const rowInModule = (r: Row, module: string) => module === "ALL" || r.module === module;

const classifyHealthStatus = (ps: Date, pe: Date, as: Date | null, ae: Date | null, slackDays: number) => {
    const today = new Date();
    if (ae) return "Completed" as const;

    const plannedTotal = clampNonNeg(diffDays(pe, ps)) + 1;
    const elapsed = clampNonNeg(diffDays(today, ps)) + 1;
    const plannedProgress = plannedTotal ? Math.min(1, Math.max(0, elapsed / plannedTotal)) : 0;

    if (!as) {
        const startSlip = diffDays(today, ps);
        if (startSlip > slackDays) return "Delayed" as const;
        if (startSlip > 0) return "At Risk" as const;
        return "On Track" as const;
    }

    const startSlipDays = diffDays(as, ps);
    if (startSlipDays > slackDays) return "Delayed" as const;

    const expectedEnd = new Date(as.getTime() + (plannedTotal - 1) * dayMs);
    const forecastDelay = diffDays(expectedEnd, pe);

    if (forecastDelay > slackDays) return "Delayed" as const;
    if (forecastDelay > 0) return "At Risk" as const;

    if (plannedProgress < 0.05 && diffDays(today, ps) > 0) return "At Risk" as const;
    return "On Track" as const;
};

const defaultAdvancedFilters: AdvancedFilters = {
    dateFrom: "",
    dateTo: "",
};

const ganttRangeToDays = (range: Exclude<GanttQuickRange, "CUSTOM">) => {
    if (range === "1D") return 1;
    if (range === "7D") return 7;
    if (range === "15D") return 15;
    if (range === "1M") return 30;
    if (range === "6M") return 180;
    return 365;
};

const getExecutionStatus = (meta: any, actualStart: Date | null, actualEnd: Date | null): Row["executionStatus"] => {
    const st = String(
        meta?.activityStatus ??
        meta?.fin_status ??
        meta?.workStatus ??
        meta?.status ??
        meta?.state ??
        meta?.executionStatus ??
        meta?.progressStatus ??
        ""
    )
        .trim()
        .toLowerCase();

    const normalized = st.replace(/[\s_-]+/g, "");

    if (["completed", "done", "closed", "finished"].includes(normalized)) {
        return "Completed";
    }

    if (["inprogress", "started", "ongoing", "wip"].includes(normalized)) {
        return "In Progress";
    }

    if (["yettostart", "notstarted", "pending"].includes(normalized)) {
        return "Yet To Start";
    }

    if (actualStart && actualEnd) return "Completed";
    if (actualStart) return "In Progress";

    return "Yet To Start";
};

const Charts = (props: any) => {
    const projectId = props?.id ?? props?.code ?? props?.projectId;

    const [timeline, setTimeline] = useState<any[]>([]);
    const [timelineState, setTimelineState] = useState<"loading" | "ready" | "missing" | "error">("loading");
    const [ganttModule, setGanttModule] = useState<string>("ALL");
    const [healthModule, setHealthModule] = useState<string>("ALL");
    const [delayModule, setDelayModule] = useState<string>("ALL");
    const [costModule, setCostModule] = useState<string>("ALL");
    const [advancedFilters] = useState<AdvancedFilters>(defaultAdvancedFilters);
    const [ganttDateIntervalDays, setGanttDateIntervalDays] = useState<number>(15);
    const [ganttQuickRange, setGanttQuickRange] = useState<GanttQuickRange>("15D");
    const ganttRightFrameRef = useRef<HTMLDivElement | null>(null);
    const metricsRailRef = useRef<HTMLDivElement | null>(null);
    const [ganttViewportWidth, setGanttViewportWidth] = useState(0);
    const [canScrollMetricsLeft, setCanScrollMetricsLeft] = useState(false);
    const [canScrollMetricsRight, setCanScrollMetricsRight] = useState(false);

    const graphRangeOptions: GraphRangeKey[] = ["1D", "7D", "1M", "3M", "YTD"];
    const healthQuickFilterOptions: Array<{ key: Exclude<HealthPreset, "CUSTOM">; label: string }> = [
        { key: "TODAY", label: "Today" },
        { key: "7D", label: "7D" },
        { key: "15D", label: "15D" },
        { key: "1M", label: "1M" },
        { key: "6M", label: "6M" },
        { key: "12M", label: "12M" },
    ];

    const [healthPreset, setHealthPreset] = useState<HealthPreset>("1M");
    const [healthFrom, setHealthFrom] = useState("");
    const [healthTo, setHealthTo] = useState("");

    const [delayRange, setDelayRange] = useState<GraphRangeKey>("1M");
    const [delayFrom, setDelayFrom] = useState("");
    const [delayTo, setDelayTo] = useState("");

    const [costRange, setCostRange] = useState<GraphRangeKey>("3M");
    const [costFrom, setCostFrom] = useState("");
    const [costTo, setCostTo] = useState("");
    const [costMetrics, setCostMetrics] = useState<Array<"budgeted" | "actual" | "delayCost" | "dprCost" | "actualPlusDelay">>([
        "budgeted",
        "actual",
        "actualPlusDelay",
    ]);
    const [costAggregate, setCostAggregate] = useState<"raw" | "ma7">("raw");

    useEffect(() => {
        if (ganttQuickRange === "CUSTOM") return;
        setGanttDateIntervalDays(ganttRangeToDays(ganttQuickRange));
    }, [ganttQuickRange]);

    useEffect(() => {
        if (ganttQuickRange !== "CUSTOM") return;
        setGanttDateIntervalDays(1);
    }, [ganttQuickRange, advancedFilters.dateFrom, advancedFilters.dateTo]);

    useEffect(() => {
        if (healthPreset === "CUSTOM") return;
        const today = toLocalMidnight(new Date());
        let from = today;
        if (healthPreset === "7D") from = addDays(today, -6);
        if (healthPreset === "15D") from = addDays(today, -14);
        if (healthPreset === "1M") from = addDays(today, -29);
        if (healthPreset === "6M") from = addDays(today, -179);
        if (healthPreset === "12M") from = addDays(today, -364);
        setHealthFrom(toInputDate(from));
        setHealthTo(toInputDate(today));
    }, [healthPreset]);

    useEffect(() => {
        if (!projectId) {
            setTimeline([]);
            setTimelineState("missing");
            return;
        }

        (async () => {
            try {
                setTimelineState("loading");
                const projects = await db.getProjects();
                const project = (projects || []).find((p: any) => String(p.id) === String(projectId));
                if (!project) {
                    setTimeline([]);
                    setTimelineState("missing");
                    return;
                }

                const latestVersion = localStorage.getItem("latestProjectVersion");
                const versions = Array.isArray(project?.projectTimeline) ? project.projectTimeline : [];
                const selected =
                    (latestVersion
                        ? versions.find(
                            (v: any) =>
                                String(v?.version) === String(latestVersion) ||
                                String(v?.timelineId) === String(latestVersion) ||
                                String(v?.versionId) === String(latestVersion)
                        )
                        : null) ||
                    versions[versions.length - 1] ||
                    versions.find((v: any) => v?.timelineId) ||
                    versions[0];

                if (!selected?.timelineId) {
                    setTimeline([]);
                    setTimelineState("missing");
                    return;
                }

                const timelineData = await db.getProjectTimelineById(selected.timelineId);
                let normalized: any[] = [];
                if (Array.isArray(timelineData)) {
                    normalized = timelineData;
                } else if (Array.isArray((timelineData as any)?.data)) {
                    normalized = (timelineData as any).data;
                } else if (Array.isArray((timelineData as any)?.modules)) {
                    normalized = (timelineData as any).modules;
                } else if (Array.isArray((timelineData as any)?.activities)) {
                    normalized = [timelineData];
                }
                setTimeline(normalized);
                setTimelineState(normalized.length ? "ready" : "missing");
            } catch (err) {
                console.error("Failed to fetch timeline:", err);
                setTimeline([]);
                setTimelineState("error");
            }
        })();
    }, [projectId]);

    const modules = useMemo(() => {
        const names = (timeline || []).map((m: any) => m?.moduleName ?? m?.parentModuleCode ?? "Module").filter(Boolean);
        return uniq(names);
    }, [timeline]);

    useEffect(() => {
        const keepOrReset = (value: string, setter: (v: string) => void) => {
            if (value !== "ALL" && !modules.includes(value)) setter("ALL");
        };
        keepOrReset(ganttModule, setGanttModule);
        keepOrReset(healthModule, setHealthModule);
        keepOrReset(delayModule, setDelayModule);
        keepOrReset(costModule, setCostModule);
    }, [modules, ganttModule, healthModule, delayModule, costModule]);

    const tasks: Task[] = useMemo(() => {
        const out: Task[] = [];

        for (const module of timeline || []) {
            const moduleName = module?.moduleName ?? module?.parentModuleCode ?? "Module";
            const groupName = String(module?.groupName ?? module?.parentGroupName ?? module?.group ?? module?.groupCode ?? module?.groupId ?? "Group");

            const activities = module?.activities ?? [];
            for (const a of activities) {
                out.push({
                    id: a?.guicode ?? a?.code ?? crypto.randomUUID(),
                    module: moduleName,
                    group: groupName,
                    activity: a?.activityName ?? a?.code ?? "Activity",
                    owner: a?.owner ?? module?.owner ?? "—",
                    plannedStart: a?.start,
                    plannedEnd: a?.end,
                    actualStart: a?.actualStart,
                    actualEnd: a?.actualFinish,
                    slackDays: asNum(a?.slackDays ?? a?.slack ?? module?.slackDays ?? module?.slack ?? 0),
                    meta: a,
                });
            }
        }

        return out;
    }, [timeline]);

    const { data, projectStart, totalDays, health } = useMemo(() => {
        if (!tasks.length) {
            const now = new Date();
            return {
                data: [] as Row[],
                projectStart: now,
                projectEnd: now,
                totalDays: 1,
                health: {
                    donut: [] as { name: string; value: number }[],
                    totals: {
                        totalActive: 0,
                        pctOnTrack: 0,
                        delayedBeyondSlack: 0,
                        avgDelayDays: 0,
                    },
                },
            };
        }

        const parsed = tasks.map((t) => {
            const fallback = toLocalMidnight(new Date());
            const ps0 = parseAnyDate(t.plannedStart) || parseAnyDate(t.actualStart) || parseAnyDate(t.actualEnd) || fallback;
            const pe0 = parseAnyDate(t.plannedEnd) || parseAnyDate(t.actualEnd) || ps0;
            const as = parseAnyDate(t.actualStart);
            const ae = parseAnyDate(t.actualEnd);
            const ps = ps0;
            const pe = pe0.getTime() < ps0.getTime() ? ps0 : pe0;
            const spanStart = as || ps;
            const spanEndRaw = ae || pe;
            const spanEnd = spanEndRaw.getTime() < spanStart.getTime() ? spanStart : spanEndRaw;
            const slackDays = asNum(t.slackDays ?? 0);
            const status = classifyHealthStatus(ps, pe, as, ae, slackDays);
            const executionStatus = getExecutionStatus(t.meta, as, ae);

            return { ...t, ps, pe, as, ae, spanStart, spanEnd, slackDays, status, executionStatus };
        });

        const matches = parsed;

        const baselineStart = new Date(Math.min(...matches.map((t) => t.ps.getTime())));
        const maxEnd = new Date(Math.max(...matches.map((t) => Math.max(t.pe.getTime(), t.ae?.getTime() ?? 0))));

        const rows: Row[] = matches.map((t) => {
            const plannedOffset = clampNonNeg(diffDays(t.ps, baselineStart));
            const plannedDuration = clampNonNeg(diffDays(t.pe, t.ps)) + 1;

            const rawActualOffset = t.as ? diffDays(t.as, baselineStart) : plannedOffset;
            const actualOffset = t.as ? Math.max(plannedOffset, clampNonNeg(rawActualOffset)) : plannedOffset;
            const actualDuration =
                t.as && t.ae
                    ? clampNonNeg(diffDays(t.ae, t.as)) + 1
                    : t.as && !t.ae
                        ? clampNonNeg(diffDays(toLocalMidnight(new Date()), t.as)) + 1
                        : 0;

            const delayDays = t.ae ? diffDays(t.ae, t.pe) : 0;
            const startSlipDays = t.as ? diffDays(t.as, t.ps) : 0;

            return {
                id: t.id,
                name: t.activity,
                module: t.module,
                group: t.group,
                activity: t.activity,
                owner: t.owner,
                plannedOffset,
                plannedDuration,
                actualOffset,
                actualDuration,
                plannedStart: fmt(t.ps),
                plannedEnd: fmt(t.pe),
                actualStart: fmt(t.as),
                actualEnd: fmt(t.ae),
                plannedStartTs: t.ps.getTime(),
                plannedBaselineStartTs: parseAnyDate(t.plannedStart)?.getTime() ?? null,
                plannedEndTs: t.pe.getTime(),
                actualStartTs: t.as ? t.as.getTime() : null,
                actualEndTs: t.ae ? t.ae.getTime() : null,
                delayDays,
                startSlipDays,
                slackDays: t.slackDays,
                status: t.status,
                executionStatus: t.executionStatus,
                meta: t.meta,
            };
        });

        const totalDays = clampNonNeg(diffDays(maxEnd, baselineStart)) + 1;

        const counts = rows.reduce(
            (acc, r) => {
                acc[r.status] += 1;
                return acc;
            },
            { "On Track": 0, "At Risk": 0, Delayed: 0, Completed: 0 } as Record<Row["status"], number>
        );

        const donut = [
            { name: "On Track", value: counts["On Track"] },
            { name: "At Risk", value: counts["At Risk"] },
            { name: "Delayed", value: counts["Delayed"] },
            { name: "Completed", value: counts["Completed"] },
        ];

        const total = rows.length;
        const active = total - counts["Completed"];
        const pctOnTrack = active ? Math.round((counts["On Track"] / active) * 100) : 0;
        const delayedBeyondSlack = rows.filter((r) => r.status === "Delayed").length;
        const completedDelayDays = rows.filter((r) => r.status === "Completed").map((r) => r.delayDays).filter((n) => Number.isFinite(n));
        const avgDelayDays = completedDelayDays.length ? Math.round((completedDelayDays.reduce((s, n) => s + n, 0) / completedDelayDays.length) * 10) / 10 : 0;

        return {
            data: rows,
            projectStart: baselineStart,
            projectEnd: maxEnd,
            totalDays,
            health: {
                donut,
                totals: {
                    totalActive: active,
                    pctOnTrack,
                    delayedBeyondSlack,
                    avgDelayDays,
                },
            },
        };
    }, [tasks]);

    const ganttDateRange = useMemo(() => {
        const from = advancedFilters.dateFrom ? parseAnyDate(advancedFilters.dateFrom) : null;
        const to = advancedFilters.dateTo ? parseAnyDate(advancedFilters.dateTo) : null;
        const hasFrom = Boolean(from);
        const hasTo = Boolean(to);
        const isValid = Boolean(from && to && from.getTime() < to.getTime());
        const hasInvalidOrder = Boolean(from && to && from.getTime() >= to.getTime());
        const error = hasInvalidOrder ? "" : "";

        return {
            from,
            to,
            hasFrom,
            hasTo,
            isValid,
            error,
        };
    }, [advancedFilters.dateFrom, advancedFilters.dateTo]);

    const { ganttData, ganttProjectStart, ganttTotalDays } = useMemo(() => {
        if (!data.length) {
            const now = new Date();
            return {
                ganttData: [] as Row[],
                ganttProjectStart: now,
                ganttProjectEnd: now,
                ganttTotalDays: 1,
            };
        }

        const todayTs = toLocalMidnight(new Date()).getTime();
        const filtered = data
            .filter((r) => {
                if (!rowInModule(r, ganttModule)) return false;

                const spanStartTs = r.actualStartTs ?? r.plannedStartTs;
                const spanEndTsBase = r.actualEndTs ?? r.plannedEndTs;
                const spanEndTs =
                    r.actualStartTs != null && r.actualEndTs == null && r.executionStatus === "In Progress"
                        ? Math.max(spanEndTsBase, todayTs)
                        : spanEndTsBase;

                if (ganttDateRange.from && spanEndTs < ganttDateRange.from.getTime()) return false;
                if (ganttDateRange.to && spanStartTs > ganttDateRange.to.getTime()) return false;
                return true;
            })
            .sort((a, b) => (a.plannedBaselineStartTs ?? a.plannedStartTs) - (b.plannedBaselineStartTs ?? b.plannedStartTs));

        if (!filtered.length) {
            const now = new Date();
            return {
                ganttData: [] as Row[],
                ganttProjectStart: now,
                ganttProjectEnd: now,
                ganttTotalDays: 1,
            };
        }

        const plannedStartTsList = filtered
            .map((r) => r.plannedBaselineStartTs)
            .filter((ts): ts is number => Number.isFinite(ts));

        const baselineStartTs = plannedStartTsList.length ? Math.min(...plannedStartTsList) : Math.min(...filtered.map((r) => r.plannedStartTs));
        const baselineStart = toLocalMidnight(new Date(baselineStartTs));
        const recomputed = filtered.map((r) => {
            const ps = new Date(r.plannedBaselineStartTs ?? r.plannedStartTs);
            const pe = new Date(r.plannedEndTs);
            const as = r.actualStartTs != null ? new Date(r.actualStartTs) : null;
            const ae = r.actualEndTs != null ? new Date(r.actualEndTs) : null;
            const plannedOffset = clampNonNeg(diffDays(ps, baselineStart));
            const plannedDuration = clampNonNeg(diffDays(pe, ps)) + 1;
            const actualOffset = as ? clampNonNeg(diffDays(as, baselineStart)) : plannedOffset;
            const actualDuration =
                as && ae
                    ? clampNonNeg(diffDays(ae, as)) + 1
                    : as && !ae && r.executionStatus === "In Progress"
                        ? clampNonNeg(diffDays(toLocalMidnight(new Date()), as)) + 1
                        : 0;
            return { ...r, plannedOffset, plannedDuration, actualOffset, actualDuration };
        });

        const maxVisibleOffset = recomputed.reduce((maxOffset, row) => {
            const plannedEndOffset = row.plannedOffset + Math.max(0, row.plannedDuration - 1);
            const actualEndOffset = row.actualDuration > 0 ? row.actualOffset + Math.max(0, row.actualDuration - 1) : row.actualOffset;
            return Math.max(maxOffset, plannedEndOffset, actualEndOffset);
        }, 0);
        const ganttTotalDays = Math.max(1, maxVisibleOffset + 1);
        const maxEnd = addDays(baselineStart, Math.max(0, ganttTotalDays - 1));

        return {
            ganttData: recomputed,
            ganttProjectStart: baselineStart,
            ganttProjectEnd: maxEnd,
            ganttTotalDays,
        };
    }, [data, ganttModule, ganttDateRange.from, ganttDateRange.to]);

    useEffect(() => {
        const el = ganttRightFrameRef.current;
        if (!el) return;

        const update = () => setGanttViewportWidth(el.clientWidth);
        update();

        if (typeof ResizeObserver !== "undefined") {
            const observer = new ResizeObserver(() => update());
            observer.observe(el);
            return () => observer.disconnect();
        }

        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, [ganttData.length]);

    const ganttAxisTickFormatter = useCallback(
        (value: number) => {
            const dayOffset = Math.max(0, Math.round(Number(value || 0)));
            return fmt(addDays(ganttProjectStart, dayOffset));
        },
        [ganttProjectStart]
    );
    const { ganttAxisTicks, ganttAxisEndOffset } = useMemo(() => {
        if (ganttTotalDays <= 1) return { ganttAxisTicks: [0], ganttAxisEndOffset: 0 };

        const lastOffset = ganttTotalDays - 1;
        const stepDays = Math.max(1, Number.isFinite(ganttDateIntervalDays) ? Math.floor(ganttDateIntervalDays) : 1);
        const uniqueSorted = (arr: number[]) => Array.from(new Set(arr)).sort((a, b) => a - b);

        const ticks = [0];
        let cursor = stepDays;
        while (cursor < lastOffset) {
            ticks.push(cursor);
            cursor += stepDays;
        }
        ticks.push(lastOffset);
        const sorted = uniqueSorted(ticks);
        return { ganttAxisTicks: sorted, ganttAxisEndOffset: sorted[sorted.length - 1] ?? lastOffset };
    }, [ganttDateIntervalDays, ganttTotalDays]);
    const ganttLabelColumnWidth = 150;
    const ganttLabelTickWidth = 188;
    const ganttPxPerDay = useMemo(() => {
        if (ganttQuickRange === "1D") return 14;
        if (ganttQuickRange === "7D") return 10;
        if (ganttQuickRange === "15D") return 7.2;
        if (ganttQuickRange === "1M") return 5.5;
        if (ganttQuickRange === "6M") return 4.2;
        if (ganttQuickRange === "12M") return 3.4;

        const interval = Math.max(1, ganttDateIntervalDays);
        const pxPerInterval = Math.max(56, Math.min(116, Math.round(118 - Math.log2(interval) * 12)));
        return Math.max(3, pxPerInterval / interval);
    }, [ganttDateIntervalDays, ganttQuickRange]);
    const ganttContentWidth = useMemo(() => {
        const baseWidth = Math.ceil((ganttAxisEndOffset + 1) * ganttPxPerDay);
        const viewport = Math.max(1, ganttViewportWidth || 0);

        // Preserve progressive scrolling feel for each quick range.
        const minWidthFactor =
            ganttQuickRange === "1D"
                ? 3.8
                : ganttQuickRange === "7D"
                    ? 2.9
                    : ganttQuickRange === "15D"
                        ? 2.3
                        : ganttQuickRange === "1M"
                            ? 1.9
                            : ganttQuickRange === "6M"
                                ? 1.45
                                : ganttQuickRange === "12M"
                                    ? 1.22
                                    : 1.6;

        return Math.max(baseWidth, Math.ceil(viewport * minWidthFactor));
    }, [ganttAxisEndOffset, ganttPxPerDay, ganttQuickRange, ganttViewportWidth]);
    const ganttInnerWidth = Math.max(ganttViewportWidth, ganttContentWidth);

    const healthRows = useMemo(() => {
        const today = toLocalMidnight(new Date());
        let from: Date | null = null;
        let to: Date | null = null;

        if (healthPreset === "TODAY") {
            from = today;
            to = today;
        } else if (healthPreset === "7D") {
            from = addDays(today, -6);
            to = today;
        } else if (healthPreset === "15D") {
            from = addDays(today, -14);
            to = today;
        } else if (healthPreset === "1M") {
            from = addDays(today, -29);
            to = today;
        } else if (healthPreset === "6M") {
            from = addDays(today, -179);
            to = today;
        } else if (healthPreset === "12M") {
            from = addDays(today, -364);
            to = today;
        } else {
            from = healthFrom ? parseAnyDate(healthFrom) : null;
            to = healthTo ? parseAnyDate(healthTo) : null;
        }

        return data.filter((r) => rowInWindow(r, from, to) && rowInModule(r, healthModule));
    }, [data, healthPreset, healthFrom, healthTo, healthModule]);

    const delayRows = useMemo(() => {
        const { from, to } = resolveGraphWindow(delayRange, delayFrom, delayTo);
        return data
            .filter((r) => rowInWindow(r, from, to) && rowInModule(r, delayModule))
            .filter((r) => r.status === "Delayed" || (r.actualDuration > 0 && r.delayDays > 0));
    }, [data, delayRange, delayFrom, delayTo, delayModule]);

    const costRows = useMemo(() => {
        const { from, to } = resolveGraphWindow(costRange, costFrom, costTo);
        return data.filter((r) => rowInWindow(r, from, to) && rowInModule(r, costModule));
    }, [data, costRange, costFrom, costTo, costModule]);

    const sectionHealth = useMemo(() => {
        const counts = healthRows.reduce(
            (acc, r) => {
                acc[r.status] += 1;
                return acc;
            },
            { "On Track": 0, "At Risk": 0, Delayed: 0, Completed: 0 } as Record<Row["status"], number>
        );
        const donut = [
            { name: "On Track", value: counts["On Track"] },
            { name: "At Risk", value: counts["At Risk"] },
            { name: "Delayed", value: counts["Delayed"] },
            { name: "Completed", value: counts["Completed"] },
        ];
        const total = healthRows.length;
        const active = total - counts.Completed;
        const pctOnTrack = active ? Math.round((counts["On Track"] / active) * 100) : 0;
        const delayedBeyondSlack = healthRows.filter((r) => r.status === "Delayed").length;
        const completedDelayDays = healthRows.filter((r) => r.status === "Completed").map((r) => r.delayDays);
        const avgDelayDays = completedDelayDays.length
            ? Math.round((completedDelayDays.reduce((s, n) => s + n, 0) / completedDelayDays.length) * 10) / 10
            : 0;
        return {
            donut,
            totals: { totalActive: active, pctOnTrack, delayedBeyondSlack, avgDelayDays },
        };
    }, [healthRows]);

    const delayBreakdown = useMemo(() => {
        const bucketKeys = [
            "Activity dependency (prerequisite)",
            "Resource / RASI",
            "External / document pending",
            "Commercial / budget hold",
        ] as const;

        const init = bucketKeys.reduce((acc, k) => {
            acc[k] = { name: k, delayDays: 0, count: 0 };
            return acc;
        }, {} as Record<(typeof bucketKeys)[number], { name: string; delayDays: number; count: number }>);

        const categorize = (m: any) => {
            const prereq = m?.prerequisite ?? m?.prerequisites ?? m?.dependsOn ?? m?.dependencies;
            const prereqStatus = m?.prerequisiteStatus ?? m?.dependencyStatus ?? m?.dependsOnStatus ?? m?.dependency_state ?? m?.prereq_status;

            const hasPrereq = Array.isArray(prereq) ? prereq.length > 0 : !!prereq;
            const prereqBlocked =
                String(prereqStatus || "").toLowerCase().includes("pending") ||
                String(prereqStatus || "").toLowerCase().includes("blocked") ||
                asNum(m?.prerequisiteDelayDays ?? m?.dependencyDelayDays ?? 0) > 0;

            if (hasPrereq || prereqBlocked) return bucketKeys[0];

            const rasiMissing =
                m?.rasiMissing ||
                m?.rasiPending ||
                m?.rasi_required_missing ||
                m?.responsibleMissing ||
                m?.accountableMissing ||
                String(m?.rasiStatus || "").toLowerCase().includes("pending") ||
                String(m?.resourceStatus || "").toLowerCase().includes("pending");

            const ownerMissing = !m?.owner && !m?.responsible && !m?.assignedTo;

            if (rasiMissing || ownerMissing) return bucketKeys[1];

            const docsPending =
                m?.documentsPending ||
                m?.docsPending ||
                m?.documents_pending ||
                String(m?.docStatus || "").toLowerCase().includes("pending") ||
                String(m?.documentStatus || "").toLowerCase().includes("pending") ||
                (m?.attachmentRequired && !m?.documentsUploaded);

            if (docsPending) return bucketKeys[2];

            const commercialHold =
                m?.commercialHold ||
                m?.budgetHold ||
                m?.poPending ||
                m?.contractHold ||
                String(m?.commercialStatus || "").toLowerCase().includes("pending") ||
                String(m?.budgetStatus || "").toLowerCase().includes("pending");

            if (commercialHold) return bucketKeys[3];

            return bucketKeys[2];
        };

        for (const r of delayRows) {
            const magnitude = r.actualDuration > 0 ? Math.max(0, asNum(r.delayDays)) : Math.max(0, asNum(r.startSlipDays));
            if (magnitude <= 0) continue;

            const key = categorize(r.meta);
            init[key].delayDays += magnitude;
            init[key].count += 1;
        }

        const chartData = bucketKeys
            .map((k) => init[k])
            .map((x) => ({ name: x.name, delayDays: Math.round(x.delayDays * 10) / 10, count: x.count }))
            .sort((a, b) => b.delayDays - a.delayDays);

        const totals = chartData.reduce(
            (acc, x) => {
                acc.totalDelayDays += x.delayDays;
                acc.totalDelayedActivities += x.count;
                return acc;
            },
            { totalDelayDays: 0, totalDelayedActivities: 0 }
        );

        return { chartData, totals };
    }, [delayRows]);

    const costBurn = useMemo(() => {
        const getPathValue = (obj: any, path: string) => {
            if (!obj) return undefined;
            if (!path.includes(".")) return obj?.[path];
            return path.split(".").reduce((acc: any, part: string) => acc?.[part], obj);
        };

        const readCost = (m: any, keys: string[]) => {
            const sources = [m, m?.cost, m?.costs, m?.financials, m?.finance];
            for (const source of sources) {
                if (!source) continue;
                for (const k of keys) {
                    const v = getPathValue(source, k);
                    if (v == null || v === "") continue;
                    const n = asNum(v);
                    if (n) return n;
                }
            }
            return 0;
        };

        const daily = Array.from({ length: totalDays }, () => ({
            day: 0,
            date: "",
            budgeted: 0,
            actual: 0,
            delayCost: 0,
            dprCost: 0,
        }));

        for (let i = 0; i < totalDays; i++) {
            daily[i].day = i + 1;
            daily[i].date = fmt(addDays(projectStart, i));
        }

        const addLinear = (key: "budgeted" | "actual" | "delayCost" | "dprCost", start: number, dur: number, totalCost: number) => {
            if (totalCost <= 0 || dur <= 0) return;
            const perDay = totalCost / dur;
            for (let i = 0; i < dur; i++) {
                const idx = start + i;
                if (idx < 0 || idx >= totalDays) continue;
                daily[idx][key] += perDay;
            }
        };

        let anyBudget = false;
        let anyActual = false;
        let anyDelay = false;
        let anyDpr = false;

        for (const r of costRows) {
            const m = r.meta || {};

            const budgetTotal = readCost(m, ["budget", "budgetCost", "budgetedCost", "plannedCost", "plannedBudget", "activityBudget", "projectCost", "cost.projectCost"]);
            const actualTotal = readCost(m, ["actualCost", "actualSpend", "spent", "actualAmount", "expense", "costActual", "opCost", "cost.opCost"]);
            const delayTotal = readCost(m, ["delayCost", "delay_cost", "costDelay", "delayPenalty", "delayPenaltyCost"]);
            const dprTotal = readCost(m, ["dprCost", "dpr_cost", "dailyProgressCost", "progressCost", "dprAmount", "cost.dprCost"]);

            if (budgetTotal > 0) anyBudget = true;
            if (actualTotal > 0) anyActual = true;
            if (delayTotal > 0) anyDelay = true;
            if (dprTotal > 0) anyDpr = true;

            addLinear("budgeted", r.plannedOffset, r.plannedDuration, budgetTotal);

            if (actualTotal > 0) {
                const dur = r.actualDuration > 0 ? r.actualDuration : r.plannedDuration;
                const start = r.actualDuration > 0 ? r.actualOffset : r.plannedOffset;
                addLinear("actual", start, dur, actualTotal);
            }

            if (delayTotal > 0) {
                const delay = Math.max(0, r.delayDays);
                if (delay > 0) {
                    const start = r.plannedOffset + r.plannedDuration;
                    addLinear("delayCost", start, Math.min(delay, totalDays - start), delayTotal);
                } else {
                    addLinear("delayCost", r.plannedOffset, r.plannedDuration, delayTotal);
                }
            }

            if (dprTotal > 0) {
                const dur = r.actualDuration > 0 ? r.actualDuration : r.plannedDuration;
                const start = r.actualDuration > 0 ? r.actualOffset : r.plannedOffset;
                addLinear("dprCost", start, dur, dprTotal);
            }
        }

        let cBudget = 0;
        let cActual = 0;
        let cDelay = 0;
        let cDpr = 0;

        const series = daily.map((d) => {
            cBudget += d.budgeted;
            cActual += d.actual;
            cDelay += d.delayCost;
            cDpr += d.dprCost;
            return {
                ...d,
                budgeted: Math.round(cBudget * 100) / 100,
                actual: Math.round(cActual * 100) / 100,
                delayCost: Math.round(cDelay * 100) / 100,
                dprCost: Math.round(cDpr * 100) / 100,
                actualPlusDelay: Math.round((cActual + cDelay) * 100) / 100,
            };
        });

        const overrunPoints = series.map((p, idx) => ({ ...p, idx })).filter((p) => p.actualPlusDelay > p.budgeted && p.budgeted > 0);
        const firstOverrun = overrunPoints.length ? overrunPoints[0] : null;

        const totals = {
            budgeted: series.length ? series[series.length - 1].budgeted : 0,
            actual: series.length ? series[series.length - 1].actual : 0,
            delayCost: series.length ? series[series.length - 1].delayCost : 0,
            dprCost: series.length ? series[series.length - 1].dprCost : 0,
            actualPlusDelay: series.length ? series[series.length - 1].actualPlusDelay : 0,
            firstOverrunDate: firstOverrun?.date ?? null,
        };

        const hasAny = anyBudget || anyActual || anyDelay || anyDpr;

        return { series, totals, hasAny };
    }, [costRows, totalDays, projectStart]);

    const costView = useMemo(() => {
        const { from, to } = resolveGraphWindow(costRange, costFrom, costTo);
        let series = costBurn.series.filter((p) => {
            const d = parseAnyDate(p.date);
            if (!d) return false;
            if (from && d.getTime() < from.getTime()) return false;
            if (to && d.getTime() > to.getTime()) return false;
            return true;
        });

        if (costAggregate === "ma7" && series.length) {
            const keys: Array<"budgeted" | "actual" | "delayCost" | "dprCost" | "actualPlusDelay"> = ["budgeted", "actual", "delayCost", "dprCost", "actualPlusDelay"];
            series = series.map((point, idx) => {
                const start = Math.max(0, idx - 6);
                const window = series.slice(start, idx + 1);
                const next: any = { ...point };
                keys.forEach((k) => {
                    next[k] = Math.round((window.reduce((s, x: any) => s + Number(x[k] || 0), 0) / window.length) * 100) / 100;
                });
                return next;
            });
        }

        const last = series[series.length - 1];
        const totals = {
            budgeted: last?.budgeted ?? 0,
            actual: last?.actual ?? 0,
            delayCost: last?.delayCost ?? 0,
            dprCost: last?.dprCost ?? 0,
            actualPlusDelay: last?.actualPlusDelay ?? 0,
            firstOverrunDate: costBurn.totals.firstOverrunDate,
        };

        return { series, totals, hasAny: costBurn.hasAny && series.length > 0 };
    }, [costBurn, costRange, costFrom, costTo, costAggregate]);

    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) return null;
        const row: Row = payload[0].payload;

        const delayLabel =
            row.actualDuration === 0
                ? "Actual not available"
                : row.delayDays > 0
                    ? `Finished ${row.delayDays} day(s) late`
                    : row.delayDays < 0
                        ? `Finished ${Math.abs(row.delayDays)} day(s) early`
                        : "On time";

        const startSlipLabel =
            row.actualDuration === 0
                ? "Actual not available"
                : row.startSlipDays > 0
                    ? `Started ${row.startSlipDays} day(s) late`
                    : row.startSlipDays < 0
                        ? `Started ${Math.abs(row.startSlipDays)} day(s) early`
                        : "On time";

        return (
            <div className="tooltipCard">
                <div className="tooltipTitle">{row.activity}</div>
                <div className="tooltipSub">
                    Module: {row.module} • Owner: {row.owner}
                </div>
                <div className="tooltipRow">
                    <span>Status</span>
                    <span>{row.executionStatus}</span>
                </div>

                <div className="tooltipRow">
                    <span>Planned</span>
                    <span>
                        {row.plannedStart} → {row.plannedEnd} ({row.plannedDuration}d)
                    </span>
                </div>

                <div className="tooltipRow">
                    <span>Actual</span>
                    <span>
                        {row.actualStart} → {row.actualEnd} ({row.actualDuration}d)
                    </span>
                </div>

                <div className="tooltipRow">
                    <span>Start variance</span>
                    <span>{startSlipLabel}</span>
                </div>

                <div className="tooltipRow">
                    <span>End variance</span>
                    <span>{delayLabel}</span>
                </div>
            </div>
        );
    };

    const renderGanttYAxisTick = useCallback(
        (props: any) => {
            const { x, y, payload } = props;
            const label = String(payload?.value ?? "");
            return (
                <g>
                    <foreignObject x={x - ganttLabelTickWidth} y={y - 10} width={ganttLabelTickWidth} height={20}>
                        <div className="ganttYAxisTick" title={label}>
                            {label}
                        </div>
                    </foreignObject>
                </g>
            );
        },
        [ganttLabelTickWidth]
    );

    const healthColors: Record<string, string> = {
        "On Track": "#22c55e",
        "At Risk": "#f59e0b",
        Delayed: "#ef4444",
        Completed: "#64748b",
    };

    const ganttStatusColors: Record<Row["executionStatus"], string> = {
        "Yet To Start": "#f59e0b",
        "In Progress": "#0ea5e9",
        Completed: "#22c55e",
    };

    const toggleCostMetric = (value: "budgeted" | "actual" | "delayCost" | "dprCost" | "actualPlusDelay") =>
        setCostMetrics((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));

    const topStats = useMemo(() => {
        const totalActivities = data.length;
        const completedCount = health.donut.find((d) => d.name === "Completed")?.value ?? 0;
        const delayedCount = health.donut.find((d) => d.name === "Delayed")?.value ?? 0;
        const atRiskCount = health.donut.find((d) => d.name === "At Risk")?.value ?? 0;

        const completionPct = totalActivities ? Math.round((completedCount / totalActivities) * 100) : 0;

        const completedOnTime = data.filter((r) => r.status === "Completed" && r.delayDays <= 0).length;
        const onTimeCompletionPct = completedCount ? Math.round((completedOnTime / completedCount) * 100) : 0;
        const lateCompletedCount = Math.max(0, completedCount - completedOnTime);

        const riskLoad = delayedCount + atRiskCount;
        const riskLoadPct = totalActivities ? Math.round((riskLoad / totalActivities) * 100) : 0;

        const totalDelayDays = Math.round(delayBreakdown.totals.totalDelayDays * 10) / 10;
        const totalDelayedActivities = delayBreakdown.totals.totalDelayedActivities;
        const avgDelayPerDelayedActivity = totalDelayedActivities ? Math.round((totalDelayDays / totalDelayedActivities) * 10) / 10 : 0;

        const budgeted = costBurn.totals.budgeted;
        const actualPlusDelay = costBurn.totals.actualPlusDelay;
        const variance = Math.round((actualPlusDelay - budgeted) * 100) / 100;
        const variancePct = budgeted > 0 ? Math.round((variance / budgeted) * 1000) / 10 : 0;

        const topDelayBucket = delayBreakdown.chartData.find((x) => x.delayDays > 0)?.name ?? "No active delay bucket";

        return {
            completionPct,
            completedCount,
            totalActivities,
            onTimeCompletionPct,
            lateCompletedCount,
            riskLoad,
            riskLoadPct,
            totalDelayDays,
            totalDelayedActivities,
            avgDelayPerDelayedActivity,
            topDelayBucket,
            cost: {
                variance,
                variancePct,
                budgeted,
                forecast: actualPlusDelay,
                overrunStart: costBurn.totals.firstOverrunDate,
                hasAny: costBurn.hasAny,
            },
        };
    }, [data, health, delayBreakdown, costBurn]);

    const topMetrics = useMemo(() => {
        const costStatus = !topStats.cost.hasAny
            ? "Cost data unavailable"
            : topStats.cost.overrunStart
                ? `Overrun starts: ${topStats.cost.overrunStart}`
                : "No overrun detected";

        return [
            {
                key: "completion",
                label: "Completion Progress",
                value: `${topStats.completionPct}%`,
                hint: `${topStats.completedCount} of ${topStats.totalActivities} activities closed`,
                meta: `${topStats.totalActivities - topStats.completedCount} activities open`,
            },
            {
                key: "onTime",
                label: "On-Time Completion",
                value: `${topStats.onTimeCompletionPct}%`,
                hint: `${topStats.lateCompletedCount} completed late`,
                meta: `${topStats.completedCount} activities completed`,
            },
            {
                key: "risk",
                label: "Execution Risk Load",
                value: `${topStats.riskLoad}`,
                hint: `${topStats.riskLoadPct}% of portfolio at risk`,
                meta: "Delayed + At Risk + Blocked",
            },
            {
                key: "delay",
                label: "Delay Exposure",
                value: `${topStats.totalDelayDays}D`,
                hint: `${topStats.totalDelayedActivities} delayed activities`,
                meta: `Avg ${topStats.avgDelayPerDelayedActivity}d per delayed activity`,
            },
            {
                key: "cost",
                label: "Cost Variance",
                value: `${Number(topStats.cost.variancePct).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`,
                hint: costStatus,
                meta: `Forecast ${Number(topStats.cost.forecast).toLocaleString(undefined, { maximumFractionDigits: 0 })} • Budget ${Number(topStats.cost.budgeted).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            },
        ];
    }, [topStats]);

    const updateMetricsScrollState = useCallback(() => {
        const el = metricsRailRef.current;
        if (!el) {
            setCanScrollMetricsLeft(false);
            setCanScrollMetricsRight(false);
            return;
        }

        const left = el.scrollLeft > 2;
        const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
        setCanScrollMetricsLeft(left);
        setCanScrollMetricsRight(right);
    }, []);

    useEffect(() => {
        if (timelineState !== "ready") return;

        const rafId = window.requestAnimationFrame(updateMetricsScrollState);
        window.addEventListener("resize", updateMetricsScrollState);
        return () => {
            window.cancelAnimationFrame(rafId);
            window.removeEventListener("resize", updateMetricsScrollState);
        };
    }, [updateMetricsScrollState, timelineState, topMetrics]);

    const scrollMetrics = (dir: "left" | "right") => {
        const el = metricsRailRef.current;
        if (!el) return;

        const card = el.querySelector(".statCard") as HTMLElement | null;
        const cardStep = card ? card.getBoundingClientRect().width + 12 : el.clientWidth;
        const distance = cardStep * 4;
        el.scrollBy({ left: dir === "right" ? distance : -distance, behavior: "smooth" });
    };

    if (timelineState === "loading") {
        return (
            <div className="chartsPage">
                <div className="timelineEmptyState">
                    <div className="timelineEmptyTitle">Loading timeline insights...</div>
                    <div className="timelineEmptySub">Please wait while we prepare your project charts.</div>
                </div>
            </div>
        );
    }

    if (timelineState === "missing") {
        return (
            <div className="chartsPage">
                    <div className="timelineEmptyState">
                        <div className="timelineEmptyTitle">No timeline content available</div>
                        <div className="timelineEmptySub">
                            This project does not have a published timeline yet. Create a timeline version to unlock schedule and cost analytics.
                        </div>
                    </div>
                </div>
            );
    }

    if (timelineState === "error") {
        return (
            <div className="chartsPage">
                <div className="timelineEmptyState">
                    <div className="timelineEmptyTitle">Unable to load timeline content</div>
                    <div className="timelineEmptySub">Please refresh the page or verify timeline data for this project.</div>
                </div>
            </div>
        );
    }

    return (
        <div className="chartsPage">
            <div className="topStatsWrap">
                {canScrollMetricsLeft ? (
                    <button className="metricsArrow metricsArrowLeft" onClick={() => scrollMetrics("left")} aria-label="Scroll metrics left">
                        ‹
                    </button>
                ) : null}

                <div className="topStatsRail" ref={metricsRailRef} onScroll={updateMetricsScrollState}>
                    {topMetrics.map((metric) => (
                        <div className={`statCard statCard--${metric.key}`} key={metric.key}>
                            <div className="statLabel">{metric.label}</div>
                            <div className="statValue">{metric.value}</div>
                            <div className="statHint">{metric.hint}</div>
                            <div className="statMeta">{metric.meta}</div>
                        </div>
                    ))}
                </div>

                {canScrollMetricsRight ? (
                    <button className="metricsArrow metricsArrowRight" onClick={() => scrollMetrics("right")} aria-label="Scroll metrics right">
                        ›
                    </button>
                ) : null}
            </div>

            <div className="panel">
                <div className="panelHeader">
                    <div>
                        <div className="panelTitle">Project Timeline</div>
                        <div className="panelSubTitle">Activity schedule comparison between planned baseline and actual execution.</div>
                    </div>
                    <div className="timelineHeaderModuleFilter">
                        <div className="filterItem">
                            <span className="filterLabel">Module</span>
                            <select
                                className="select"
                                value={ganttModule}
                                onChange={(e) => setGanttModule(e.target.value)}
                            >
                                <option value="ALL">Project View</option>
                                {modules.map((m) => (
                                    <option key={m} value={m}>
                                        {m}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="filterItem quickFiltersItem">
                            <span className="filterLabel quick-filter-label">Quick Filters</span>
                            <div className="quickFiltersButtons">
                                <button
                                    type="button"
                                    className={`quickBtn ${ganttQuickRange === "1D" ? "quickBtnActive" : ""}`}
                                    onClick={() => setGanttQuickRange("1D")}
                                >
                                    1D
                                </button>
                                <button
                                    type="button"
                                    className={`quickBtn ${ganttQuickRange === "7D" ? "quickBtnActive" : ""}`}
                                    onClick={() => setGanttQuickRange("7D")}
                                >
                                    7D
                                </button>
                                <button
                                    type="button"
                                    className={`quickBtn ${ganttQuickRange === "15D" ? "quickBtnActive" : ""}`}
                                    onClick={() => setGanttQuickRange("15D")}
                                >
                                    15D
                                </button>
                                <button
                                    type="button"
                                    className={`quickBtn ${ganttQuickRange === "1M" ? "quickBtnActive" : ""}`}
                                    onClick={() => setGanttQuickRange("1M")}
                                >
                                    1M
                                </button>
                                <button
                                    type="button"
                                    className={`quickBtn ${ganttQuickRange === "6M" ? "quickBtnActive" : ""}`}
                                    onClick={() => setGanttQuickRange("6M")}
                                >
                                    6M
                                </button>
                                <button
                                    type="button"
                                    className={`quickBtn ${ganttQuickRange === "12M" ? "quickBtnActive" : ""}`}
                                    onClick={() => setGanttQuickRange("12M")}
                                >
                                    12M
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {!ganttData.length ? (
                    <div className="emptyState">No Content</div>
                ) : (
                    <div className="chartWrap ganttChartWrap" style={{ height: Math.max(520, ganttData.length * 44) }}>
                        <div className="ganttSplit">
                            <div className="ganttFixedY" style={{ width: `${ganttLabelColumnWidth}px`, flex: `0 0 ${ganttLabelColumnWidth}px` }}>
                                <ResponsiveContainer>
                                    <BarChart
                                        data={ganttData}
                                        layout="vertical"
                                        margin={{ top: 10, right: 0, bottom: 10, left: 24 }}
                                        barCategoryGap={14}
                                        barGap={8}
                                    >
                                        <XAxis type="number" hide domain={[0, ganttAxisEndOffset]} />

                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            width={ganttLabelTickWidth}
                                            tick={renderGanttYAxisTick}
                                            axisLine={false}
                                            tickLine={false}
                                        />

                                        <Bar dataKey="plannedDuration" fill="rgba(0,0,0,0)" isAnimationActive={false} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="ganttRightFrame" ref={ganttRightFrameRef}>
                                <div className="ganttScrollShell">
                                    <div className="ganttInner" style={{ width: `${ganttInnerWidth}px` }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={ganttData}
                                                layout="vertical"
                                                margin={{ top: 10, right: 30, bottom: 10, left: 26 }}
                                                barCategoryGap={14}
                                                barGap={8}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />

                                                <XAxis
                                                    type="number"
                                                    domain={[0, ganttAxisEndOffset]}
                                                    ticks={ganttAxisTicks}
                                                    interval="preserveStartEnd"
                                                    tickMargin={10}
                                                    height={58}
                                                    tick={{ fontSize: 12 }}
                                                    tickFormatter={ganttAxisTickFormatter}
                                                    allowDecimals={false}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />

                                                <YAxis type="category" dataKey="name" hide />

                                                <Tooltip content={<CustomTooltip />} />

                                                <Bar dataKey="plannedOffset" stackId="planned" fill="rgba(0,0,0,0)" legendType="none" />
                                                <Bar dataKey="plannedDuration" stackId="planned" name="Planned (Baseline)" fill="#64748b" radius={[10, 10, 10, 10]}>
                                                    {ganttData.map((row) => (
                                                        <Cell
                                                            key={`planned-${row.id}`}
                                                            fill={row.executionStatus === "Yet To Start" ? ganttStatusColors["Yet To Start"] : "#64748b"}
                                                        />
                                                    ))}
                                                </Bar>

                                                <Bar dataKey="actualOffset" stackId="actual" fill="rgba(0,0,0,0)" legendType="none" />
                                                <Bar dataKey="actualDuration" stackId="actual" name="Actual" fill="#0ea5e9" radius={[10, 10, 10, 10]}>
                                                    {ganttData.map((row) => (
                                                        <Cell key={`actual-${row.id}`} fill={ganttStatusColors[row.executionStatus]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="ganttLegendRow">
                            <div className="ganttLegendItem">
                                <span className="ganttLegendDot ganttLegendPlanned" />
                                <span>Planned (Baseline)</span>
                            </div>
                            <div className="ganttLegendItem">
                                <span className="ganttLegendDot ganttLegendYetToStart" />
                                <span>Yet To Start</span>
                            </div>
                            <div className="ganttLegendItem">
                                <span className="ganttLegendDot ganttLegendInProgress" />
                                <span>In Progress</span>
                            </div>
                            <div className="ganttLegendItem">
                                <span className="ganttLegendDot ganttLegendCompleted" />
                                <span>Completed</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="spacer" />

                <div className="panelSection">
                    <div className="sectionGrid">
                        <div className="sectionLeft">
                            <div className="panelHeader">
                                <div>
                                    <div className="sectionTitle">Project Health Distribution</div>
                                    <div className="sectionSub">On Track • At Risk • Delayed • Completed</div>
                                </div>
                            </div>
                            <div className="advancedFilterPanel">
                                <div className="advancedFilterRow sectionSingleFilterRow healthFilterRow">
                                    <div className="filterItem">
                                        <span className="filterLabel">Module</span>
                                        <select className="select" value={healthModule} onChange={(e) => setHealthModule(e.target.value)}>
                                            <option value="ALL">All Modules</option>
                                            {modules.map((m) => (
                                                <option key={`health-module-${m}`} value={m}>
                                                    {m}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="sectionInlineField">
                                        <span className="filterLabel">From</span>
                                        <input
                                            type="date"
                                            className="select filterInput"
                                            value={healthFrom}
                                            onChange={(e) => {
                                                setHealthPreset("CUSTOM");
                                                setHealthFrom(e.target.value);
                                            }}
                                        />
                                    </div>
                                    <div className="sectionInlineField">
                                        <span className="filterLabel">To</span>
                                        <input
                                            type="date"
                                            className="select filterInput"
                                            value={healthTo}
                                            onChange={(e) => {
                                                setHealthPreset("CUSTOM");
                                                setHealthTo(e.target.value);
                                            }}
                                        />
                                    </div>
                                    <div className="filterItem filterChipsBlock">
                                        <span className="filterLabel">Quick Filters</span>
                                        <div className="rangePills">
                                            {healthQuickFilterOptions.map((opt) => (
                                                <button
                                                    key={`health-${opt.key}`}
                                                    className={`rangePill ${healthPreset === opt.key ? "rangePillActive" : ""}`}
                                                    onClick={() => {
                                                        const today = toLocalMidnight(new Date());
                                                        let from = today;
                                                        if (opt.key === "7D") from = addDays(today, -6);
                                                        if (opt.key === "15D") from = addDays(today, -14);
                                                        if (opt.key === "1M") from = addDays(today, -29);
                                                        if (opt.key === "6M") from = addDays(today, -179);
                                                        if (opt.key === "12M") from = addDays(today, -364);

                                                        setHealthPreset(opt.key);
                                                        setHealthFrom(toInputDate(from));
                                                        setHealthTo(toInputDate(today));
                                                    }}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {!healthRows.length ? (
                                <div className="emptyState">No Content</div>
                            ) : (
                                <div className="chartWrap" style={{ height: 260, marginTop: 10 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={sectionHealth.donut} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="90%" paddingAngle={2}>
                                                {sectionHealth.donut.map((entry) => (
                                                    <Cell key={entry.name} fill={healthColors[entry.name] || "#94a3b8"} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="spacer" />

                <div className="panelSection">
                    <div className="sectionGrid">
                        <div className="sectionLeft">
                            <div className="panelHeader">
                                <div>
                                    <div className="sectionTitle">Delay Root Cause Breakdown</div>
                                    <div className="sectionSub">
                                        Total {delayBreakdown.totals.totalDelayedActivities} delayed activities • {Math.round(delayBreakdown.totals.totalDelayDays * 10) / 10} delay-days
                                    </div>
                                </div>
                            </div>
                            <div className="advancedFilterPanel">
                                <div className="advancedFilterRow sectionSingleFilterRow">
                                    <div className="filterItem">
                                        <span className="filterLabel">Module</span>
                                        <select className="select" value={delayModule} onChange={(e) => setDelayModule(e.target.value)}>
                                            <option value="ALL">All Modules</option>
                                            {modules.map((m) => (
                                                <option key={`delay-module-${m}`} value={m}>
                                                    {m}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="filterItem filterChipsBlock">
                                        <span className="filterLabel">Quick Filters</span>
                                        <div className="rangePills">
                                            {graphRangeOptions.map((range) => (
                                                <button
                                                    key={`delay-${range}`}
                                                    className={`rangePill ${delayRange === range ? "rangePillActive" : ""}`}
                                                    onClick={() => setDelayRange(range)}
                                                >
                                                    {range}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="sectionFilterDates">
                                        <input
                                            type="date"
                                            className="select filterInput"
                                            value={delayFrom}
                                            onChange={(e) => {
                                                setDelayRange("CUSTOM");
                                                setDelayFrom(e.target.value);
                                            }}
                                        />
                                        <input
                                            type="date"
                                            className="select filterInput"
                                            value={delayTo}
                                            onChange={(e) => {
                                                setDelayRange("CUSTOM");
                                                setDelayTo(e.target.value);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                            {!delayBreakdown.chartData.some((x) => x.delayDays > 0) ? (
                                <div className="emptyState">No Content</div>
                            ) : (
                                <div className="chartWrap" style={{ height: 260, marginTop: 10 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={delayBreakdown.chartData} layout="vertical" margin={{ top: 10, right: 24, bottom: 10, left: 210 }} barCategoryGap={12}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" tick={{ fontSize: 12 }} />
                                            <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 12 }} />
                                            <Tooltip
                                                formatter={(v: any, n: any, ctx: any) => {
                                                    const p = ctx?.payload;
                                                    if (n === "delayDays") return [`${v} days`, "Total delay"];
                                                    if (n === "count") return [p?.count ?? 0, "Activities"];
                                                    return [v, n];
                                                }}
                                                labelFormatter={() => ""}
                                                contentStyle={{ borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", boxShadow: "0 10px 30px rgba(0,0,0,0.12)" }}
                                            />
                                            <Legend />
                                            <Bar dataKey="delayDays" name="Delay (days)" fill="#ef4444" radius={[10, 10, 10, 10]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="spacer" />

                <div className="panelSection">
                    <div className="sectionGrid">
                        <div className="sectionLeft">
                            <div className="panelHeader">
                                <div>
                                    <div className="sectionTitle">Planned vs Actual Cost Burn</div>
                                    <div className="sectionSub">
                                        Budgeted {costView.totals.budgeted.toLocaleString()} • Actual {costView.totals.actual.toLocaleString()} • Delay {costView.totals.delayCost.toLocaleString()} • DPR {costView.totals.dprCost.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                            <div className="advancedFilterPanel">
                                <div className="advancedFilterRow sectionSingleFilterRow">
                                    <div className="filterItem">
                                        <span className="filterLabel">Module</span>
                                        <select className="select" value={costModule} onChange={(e) => setCostModule(e.target.value)}>
                                            <option value="ALL">All Modules</option>
                                            {modules.map((m) => (
                                                <option key={`cost-module-${m}`} value={m}>
                                                    {m}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="filterItem filterChipsBlock">
                                        <span className="filterLabel">Quick Filters</span>
                                        <div className="rangePills">
                                            {graphRangeOptions.map((range) => (
                                                <button
                                                    key={`cost-${range}`}
                                                    className={`rangePill ${costRange === range ? "rangePillActive" : ""}`}
                                                    onClick={() => setCostRange(range)}
                                                >
                                                    {range}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="sectionFilterDates">
                                        <input
                                            type="date"
                                            className="select filterInput"
                                            value={costFrom}
                                            onChange={(e) => {
                                                setCostRange("CUSTOM");
                                                setCostFrom(e.target.value);
                                            }}
                                        />
                                        <input
                                            type="date"
                                            className="select filterInput"
                                            value={costTo}
                                            onChange={(e) => {
                                                setCostRange("CUSTOM");
                                                setCostTo(e.target.value);
                                            }}
                                        />
                                    </div>
                                    <div className="sectionInlineField">
                                        <span className="filterLabel">Aggregate</span>
                                        <select className="select" value={costAggregate} onChange={(e) => setCostAggregate(e.target.value as "raw" | "ma7")}>
                                            <option value="raw">Raw</option>
                                            <option value="ma7">Moving Avg (7)</option>
                                        </select>
                                    </div>
                                    <div className="filterChips">
                                        {[
                                            ["budgeted", "Budgeted"],
                                            ["actual", "Actual"],
                                            ["delayCost", "Delay"],
                                            ["dprCost", "DPR"],
                                            ["actualPlusDelay", "Actual + Delay"],
                                        ].map(([key, label]) => (
                                            <button
                                                key={`cost-metric-${key}`}
                                                className={`chipBtn ${costMetrics.includes(key as any) ? "chipBtnActive" : ""}`}
                                                onClick={() => toggleCostMetric(key as any)}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="tagRow">
                                    {costView.totals.firstOverrunDate ? <span className="tag tagRed">Overrun starts: {costView.totals.firstOverrunDate}</span> : <span className="tag tagGreen">No overrun detected</span>}
                                </div>
                            </div>
                            {!costView.hasAny ? (
                                <div className="emptyState">No Content</div>
                            ) : (
                                <div className="chartWrap" style={{ height: 300, marginTop: 10 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={costView.series} margin={{ top: 10, right: 24, bottom: 10, left: 10 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={24} />
                                            <YAxis tick={{ fontSize: 12 }} />
                                            <Tooltip
                                                formatter={(v: any, name: any) => [Number(v).toLocaleString(), name]}
                                                labelFormatter={(l: any) => `Date: ${l}`}
                                                contentStyle={{ borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", boxShadow: "0 10px 30px rgba(0,0,0,0.12)" }}
                                            />
                                            <Legend />
                                            {costMetrics.includes("budgeted") ? <Line type="monotone" dataKey="budgeted" name="Budgeted (cumulative)" stroke="#64748b" strokeWidth={2} dot={false} /> : null}
                                            {costMetrics.includes("actual") ? <Line type="monotone" dataKey="actual" name="Actual (cumulative)" stroke="#0ea5e9" strokeWidth={2} dot={false} /> : null}
                                            {costMetrics.includes("delayCost") ? <Line type="monotone" dataKey="delayCost" name="Delay cost (cumulative)" stroke="#ef4444" strokeWidth={2} dot={false} /> : null}
                                            {costMetrics.includes("dprCost") ? <Line type="monotone" dataKey="dprCost" name="DPR cost (cumulative)" stroke="#f59e0b" strokeWidth={2} dot={false} /> : null}
                                            {costMetrics.includes("actualPlusDelay") ? <Line type="monotone" dataKey="actualPlusDelay" name="Actual + Delay" stroke="#111827" strokeWidth={2} dot={false} /> : null}
                                            {costView.totals.firstOverrunDate ? (
                                                <ReferenceDot
                                                    x={costView.totals.firstOverrunDate}
                                                    y={costView.series.find((s) => s.date === costView.totals.firstOverrunDate)?.actualPlusDelay ?? 0}
                                                    r={6}
                                                    fill="#ef4444"
                                                    stroke="#ef4444"
                                                />
                                            ) : null}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Charts;
