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

    delayDays: number;
    startSlipDays: number;
    slackDays: number;
    status: "On Track" | "At Risk" | "Delayed" | "Completed";
    meta?: any;
};

const dayMs = 24 * 60 * 60 * 1000;

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

    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;

    const d2 = new Date(str + "T00:00:00");
    return isNaN(d2.getTime()) ? null : d2;
};

const toDay = (d: Date) => Math.floor(d.getTime() / dayMs);
const diffDays = (a: Date, b: Date) => toDay(a) - toDay(b);
const clampNonNeg = (n: number) => (n < 0 ? 0 : n);

const fmt = (d: Date | null) => {
    if (!d) return "-";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
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

const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));

const toArray = (v: any): string[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
    if (typeof v === "string") {
        const s = v.trim();
        if (!s) return [];
        if (s.includes(",")) return s.split(",").map((x) => x.trim()).filter(Boolean);
        if (s.includes(";")) return s.split(";").map((x) => x.trim()).filter(Boolean);
        return [s];
    }
    return [String(v)].filter(Boolean);
};

const Charts = (props: any) => {
    const projectId = props?.id ?? props?.code ?? props?.projectId;

    const [timeline, setTimeline] = useState<any[]>([]);
    const [timelineState, setTimelineState] = useState<"loading" | "ready" | "missing" | "error">("loading");
    const [userLabelMap, setUserLabelMap] = useState<Record<string, string>>({});
    const [selectedModule, setSelectedModule] = useState<string>("__INIT__");
    const [selectedGroup, setSelectedGroup] = useState<string>("ALL");
    const metricsRailRef = useRef<HTMLDivElement | null>(null);
    const userChangedModuleRef = useRef(false);
    const userChangedGroupRef = useRef(false);
    const [canScrollMetricsLeft, setCanScrollMetricsLeft] = useState(false);
    const [canScrollMetricsRight, setCanScrollMetricsRight] = useState(false);

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
                const versions = project?.projectTimeline || [];
                const selected = latestVersion ? versions.find((v: any) => String(v.version) === String(latestVersion)) : versions[0];

                if (!selected?.timelineId) {
                    setTimeline([]);
                    setTimelineState("missing");
                    return;
                }

                const timelineData = await db.getProjectTimelineById(selected.timelineId);
                const normalized = Array.isArray(timelineData) ? timelineData : [];
                setTimeline(normalized);
                setTimelineState(normalized.length ? "ready" : "missing");
            } catch (err) {
                console.error("Failed to fetch timeline:", err);
                setTimeline([]);
                setTimelineState("error");
            }
        })();
    }, [projectId]);

    useEffect(() => {
        let active = true;

        (async () => {
            try {
                const allUsers = (await db.getUsers()) || [];
                const orgIds = uniq((timeline || []).map((m: any) => String(m?.orgId || "")).filter(Boolean));
                const users = orgIds.length ? allUsers.filter((u: any) => orgIds.includes(String(u?.orgId || ""))) : allUsers;

                const map: Record<string, string> = {};
                for (const user of users) {
                    const label = String(
                        user?.name ??
                        user?.employeeFullName ??
                        user?.fullName ??
                        user?.displayName ??
                        user?.email ??
                        user?.primaryEmail ??
                        ""
                    ).trim();

                    if (!label) continue;

                    const keys = [user?.id, user?.guiId, user?.userGuiId, user?.employeeId];
                    for (const key of keys) {
                        const keyStr = String(key ?? "").trim();
                        if (keyStr) map[keyStr] = label;
                    }
                }

                if (active) setUserLabelMap(map);
            } catch (err) {
                console.error("Failed to fetch users for RASI labels:", err);
                if (active) setUserLabelMap({});
            }
        })();

        return () => {
            active = false;
        };
    }, [timeline]);

    const modules = useMemo(() => {
        const names = (timeline || []).map((m: any) => m?.moduleName ?? m?.parentModuleCode ?? "Module").filter(Boolean);
        return uniq(names);
    }, [timeline]);

    const groups = useMemo(() => {
        const names = (timeline || [])
            .map((m: any) => m?.groupName ?? m?.parentGroupName ?? m?.group ?? m?.groupCode ?? m?.groupId ?? "Group")
            .filter(Boolean)
            .map((x: any) => String(x));
        return uniq(names);
    }, [timeline]);

    useEffect(() => {
        if (!modules.length) return;

        if (!userChangedModuleRef.current) {
            if (selectedModule === "__INIT__") setSelectedModule(modules[0]);
            else if (selectedModule !== "ALL" && !modules.includes(selectedModule)) setSelectedModule(modules[0]);
        } else {
            if (selectedModule !== "ALL" && !modules.includes(selectedModule)) setSelectedModule("ALL");
        }
    }, [modules, selectedModule]);

    useEffect(() => {
        if (!groups.length) return;

        if (!userChangedGroupRef.current) {
            if (selectedGroup !== "ALL" && !groups.includes(selectedGroup)) setSelectedGroup("ALL");
        } else {
            if (selectedGroup !== "ALL" && !groups.includes(selectedGroup)) setSelectedGroup("ALL");
        }
    }, [groups, selectedGroup]);

    const tasks: Task[] = useMemo(() => {
        const out: Task[] = [];

        for (const module of timeline || []) {
            const moduleName = module?.moduleName ?? module?.parentModuleCode ?? "Module";
            const groupName = String(module?.groupName ?? module?.parentGroupName ?? module?.group ?? module?.groupCode ?? module?.groupId ?? "Group");

            if (selectedGroup !== "ALL" && groupName !== selectedGroup) continue;
            if (selectedModule !== "ALL" && selectedModule !== "__INIT__" && moduleName !== selectedModule) continue;

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
    }, [timeline, selectedModule, selectedGroup]);

    const { data, projectStart, projectEnd, totalDays, health } = useMemo(() => {
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

        const plannedStarts = tasks.map((t) => parseAnyDate(t.plannedStart)).filter(Boolean) as Date[];
        const plannedEnds = tasks.map((t) => parseAnyDate(t.plannedEnd)).filter(Boolean) as Date[];

        const actualStarts = tasks.map((t) => parseAnyDate(t.actualStart)).filter(Boolean) as Date[];
        const actualEnds = tasks.map((t) => parseAnyDate(t.actualEnd)).filter(Boolean) as Date[];

        const baselineStart = plannedStarts.length
            ? new Date(Math.min(...plannedStarts.map((d) => d.getTime())))
            : new Date(Math.min(...[...actualStarts, ...plannedEnds].map((d) => d.getTime())));

        const baselineEnd = plannedEnds.length ? new Date(Math.max(...plannedEnds.map((d) => d.getTime()))) : new Date(Math.max(...actualEnds.map((d) => d.getTime())));

        const maxEnd = new Date(Math.max(baselineEnd.getTime(), ...(actualEnds.length ? actualEnds.map((d) => d.getTime()) : [baselineEnd.getTime()])));

        const today = new Date();

        const classify = (ps: Date, pe: Date, as: Date | null, ae: Date | null, slackDays: number) => {
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

        const rows: Row[] = tasks.map((t) => {
            const ps = parseAnyDate(t.plannedStart) ?? baselineStart;
            const pe = parseAnyDate(t.plannedEnd) ?? ps;

            const as = parseAnyDate(t.actualStart);
            const ae = parseAnyDate(t.actualEnd);

            const plannedOffset = clampNonNeg(diffDays(ps, baselineStart));
            const plannedDuration = clampNonNeg(diffDays(pe, ps)) + 1;

            const rawActualOffset = as ? diffDays(as, baselineStart) : plannedOffset;
            const actualOffset = as ? Math.max(plannedOffset, clampNonNeg(rawActualOffset)) : plannedOffset;
            const actualDuration = as && ae ? clampNonNeg(diffDays(ae, as)) + 1 : 0;

            const delayDays = ae ? diffDays(ae, pe) : 0;
            const startSlipDays = as ? diffDays(as, ps) : 0;

            const slackDays = asNum(t.slackDays ?? 0);
            const status = classify(ps, pe, as, ae, slackDays);

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
                plannedStart: fmt(ps),
                plannedEnd: fmt(pe),
                actualStart: fmt(as),
                actualEnd: fmt(ae),
                delayDays,
                startSlipDays,
                slackDays,
                status,
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

        const completedDelayDays = rows
            .filter((r) => r.status === "Completed")
            .map((r) => r.delayDays)
            .filter((n) => Number.isFinite(n));

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

        const delayedRows = data.filter((r) => r.status === "Delayed" || (r.actualDuration > 0 && r.delayDays > 0));

        for (const r of delayedRows) {
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
    }, [data]);

    const activityStatus = useMemo(() => {
        const normalize = (s: any) => String(s || "").trim().toLowerCase();

        const stageOf = (r: Row) => {
            if (r.status === "Completed" || r.actualEnd !== "-") return "Completed";
            const m = r.meta || {};
            const st = normalize(m?.workStatus ?? m?.status ?? m?.activityStatus ?? m?.state ?? m?.executionStatus ?? m?.progressStatus) || "";
            const blocked =
                m?.blocked === true ||
                normalize(m?.blockerStatus).includes("blocked") ||
                normalize(m?.blockReason).length > 0 ||
                normalize(m?.state).includes("blocked") ||
                normalize(m?.status).includes("blocked");
            if (blocked || st === "blocked") return "Blocked";
            const started = r.actualStart !== "-" || st === "in progress" || st === "inprogress" || st === "started";
            if (!started) return "Not Started";
            return "In Progress";
        };

        const counts = data.reduce(
            (acc, r) => {
                const stage = stageOf(r) as "Not Started" | "In Progress" | "Blocked" | "Completed";
                acc[stage] += 1;
                return acc;
            },
            { "Not Started": 0, "In Progress": 0, Blocked: 0, Completed: 0 } as Record<"Not Started" | "In Progress" | "Blocked" | "Completed", number>
        );

        const total = data.length || 1;

        const chartData = [{ name: "Activities", "Not Started": counts["Not Started"], "In Progress": counts["In Progress"], Blocked: counts["Blocked"], Completed: counts["Completed"] }];

        return { counts, total, chartData };
    }, [data]);

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

        for (const r of data) {
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
    }, [data, totalDays, projectStart]);

    const responsibilityLoad = useMemo(() => {
        const roleKeys = ["R", "A", "S", "I"] as const;

        const getRasi = (m: any) => {
            const rasi = m?.rasi ?? m?.RASI ?? m?.raci ?? m?.RACI ?? null;

            const pick = (obj: any, keys: string[]) => {
                for (const k of keys) {
                    const v = obj?.[k];
                    if (v != null) return v;
                }
                return undefined;
            };

            const responsible = toArray(pick(rasi, ["responsible", "Responsible", "R", "r"]) ?? pick(m, ["responsible", "Responsible", "R", "r", "assignedTo"]));
            const accountable = toArray(pick(rasi, ["accountable", "Accountable", "A", "a"]) ?? pick(m, ["accountable", "Accountable", "A", "a"]));
            const consulted = toArray(pick(rasi, ["consulted", "Consulted", "C", "c", "S", "s"]) ?? pick(m, ["consulted", "Consulted", "C", "c", "S", "s"]));
            const informed = toArray(pick(rasi, ["informed", "Informed", "I", "i"]) ?? pick(m, ["informed", "Informed", "I", "i"]));

            return { R: responsible, A: accountable, S: consulted, I: informed };
        };

        const map = new Map<string, { user: string; R: number; A: number; S: number; I: number; total: number }>();

        for (const r of data) {
            const roles = getRasi(r.meta || {});
            for (const key of roleKeys) {
                for (const u of roles[key]) {
                    const rawId = String(u || "").trim();
                    if (!rawId) continue;
                    const user = userLabelMap[rawId] || rawId;
                    const prev = map.get(user) || { user, R: 0, A: 0, S: 0, I: 0, total: 0 };
                    prev[key] += 1;
                    prev.total += 1;
                    map.set(user, prev);
                }
            }
        }

        const rows = Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 20);
        const overloaded = rows.filter((x) => x.R >= 8).map((x) => x.user);

        return { rows, overloaded };
    }, [data, userLabelMap]);

    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) return null;
        const row: Row = payload[0].payload;

        const delayLabel =
            row.actualDuration === 0 ? "Actual not available" : row.delayDays > 0 ? `+${row.delayDays}d delayed` : row.delayDays < 0 ? `${row.delayDays}d ahead` : "On time";

        const startSlipLabel =
            row.actualDuration === 0
                ? "Actual not available"
                : row.startSlipDays > 0
                    ? `+${row.startSlipDays}d start slip`
                    : row.startSlipDays < 0
                        ? `${row.startSlipDays}d early start`
                        : "Start on time";

        return (
            <div className="tooltipCard">
                <div className="tooltipTitle">{row.activity}</div>
                <div className="tooltipSub">
                    {row.group} • {row.module} • Owner: {row.owner}
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

    const healthColors: Record<string, string> = {
        "On Track": "#22c55e",
        "At Risk": "#f59e0b",
        Delayed: "#ef4444",
        Completed: "#64748b",
    };

    const stageColors: Record<string, string> = {
        "Not Started": "#94a3b8",
        "In Progress": "#0ea5e9",
        Blocked: "#ef4444",
        Completed: "#22c55e",
    };

    const rasiColors: Record<string, string> = {
        R: "#ef4444",
        A: "#f59e0b",
        S: "#0ea5e9",
        I: "#64748b",
    };

    const topStats = useMemo(() => {
        const totalActivities = data.length;
        const completedCount = health.donut.find((d) => d.name === "Completed")?.value ?? 0;
        const delayedCount = health.donut.find((d) => d.name === "Delayed")?.value ?? 0;
        const atRiskCount = health.donut.find((d) => d.name === "At Risk")?.value ?? 0;
        const blockedCount = activityStatus.counts.Blocked ?? 0;

        const completionPct = totalActivities ? Math.round((completedCount / totalActivities) * 100) : 0;

        const completedOnTime = data.filter((r) => r.status === "Completed" && r.delayDays <= 0).length;
        const onTimeCompletionPct = completedCount ? Math.round((completedOnTime / completedCount) * 100) : 0;
        const lateCompletedCount = Math.max(0, completedCount - completedOnTime);

        const riskLoad = delayedCount + atRiskCount + blockedCount;
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
    }, [data, health, delayBreakdown, costBurn, activityStatus]);

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
                value: `${topStats.totalDelayDays}d`,
                hint: `${topStats.totalDelayedActivities} delayed activities`,
                meta: `Avg ${topStats.avgDelayPerDelayedActivity}d per delayed activity`,
            },
            {
                key: "cost",
                label: "Cost Variance vs Budget",
                value: `${Number(topStats.cost.variancePct).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`,
                hint: `Forecast ${Number(topStats.cost.forecast).toLocaleString(undefined, { maximumFractionDigits: 0 })} vs Budget ${Number(topStats.cost.budgeted).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                meta: `${costStatus} • Top delay driver: ${topStats.topDelayBucket}`,
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
        updateMetricsScrollState();
        window.addEventListener("resize", updateMetricsScrollState);
        return () => window.removeEventListener("resize", updateMetricsScrollState);
    }, [updateMetricsScrollState, topMetrics.length]);

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
                        This project does not have a published timeline yet. Create a timeline version to unlock schedule, cost, and RASI analytics.
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
                        <div className="statCard" key={metric.key}>
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
                        <div className="panelTitle">Project Timeline (Gantt)</div>
                        <div className="panelSubTitle">
                            Baseline vs Actual • {fmt(projectStart)} → {fmt(projectEnd)} • Total {totalDays} days
                        </div>
                    </div>

                    <div className="filters">
                        <div className="filterItem">
                            <span className="filterLabel">Module</span>
                            <select
                                className="select"
                                value={selectedModule === "__INIT__" ? "ALL" : selectedModule}
                                onChange={(e) => {
                                    userChangedModuleRef.current = true;
                                    setSelectedModule(e.target.value);
                                }}
                            >
                                <option value="ALL">All Modules</option>
                                {modules.map((m) => (
                                    <option key={m} value={m}>
                                        {m}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {!data.length ? (
                    <div className="emptyState">No activities found for the selected filters</div>
                ) : (
                    <>
                        <div className="chartWrap" style={{ height: Math.max(520, data.length * 44) }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data} layout="vertical" margin={{ top: 10, right: 24, bottom: 10, left: 260 }} barCategoryGap={14} barGap={8}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" domain={[0, totalDays]} tick={{ fontSize: 12 }} />
                                    <YAxis type="category" dataKey="name" width={250} tick={{ fontSize: 12 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Bar dataKey="plannedOffset" stackId="planned" fill="rgba(0,0,0,0)" />
                                    <Bar dataKey="plannedDuration" stackId="planned" name="Planned (Baseline)" fill="#64748b" radius={[10, 10, 10, 10]} />
                                    <Bar dataKey="actualOffset" stackId="actual" fill="rgba(0,0,0,0)" />
                                    <Bar dataKey="actualDuration" stackId="actual" name="Actual" fill="#0ea5e9" radius={[10, 10, 10, 10]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="spacer" />

                        <div className="panelSection">
                            <div className="sectionGrid">
                                <div className="sectionLeft">
                                    <div className="sectionTitle">Project Health Distribution</div>
                                    <div className="sectionSub">On Track • At Risk • Delayed • Completed</div>

                                    <div className="chartWrap" style={{ height: 260, marginTop: 10 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={health.donut} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="90%" paddingAngle={2}>
                                                    {health.donut.map((entry) => (
                                                        <Cell key={entry.name} fill={healthColors[entry.name] || "#94a3b8"} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="sectionRight">
                                    <div className="miniStatsGrid">
                                        <div className="miniCard">
                                            <div className="miniLabel">Total Active Activities</div>
                                            <div className="miniValue">{health.totals.totalActive}</div>
                                        </div>
                                        <div className="miniCard">
                                            <div className="miniLabel">% Activities On Track</div>
                                            <div className="miniValue">
                                                {health.totals.pctOnTrack}
                                                <span className="statSuffix">%</span>
                                            </div>
                                        </div>
                                        <div className="miniCard">
                                            <div className="miniLabel">Activities Delayed Beyond Slack</div>
                                            <div className="miniValue">{health.totals.delayedBeyondSlack}</div>
                                        </div>
                                        <div className="miniCard">
                                            <div className="miniLabel">Avg Delay (days)</div>
                                            <div className="miniValue">{health.totals.avgDelayDays}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="spacer" />

                        <div className="panelSection">
                            <div className="sectionGrid">
                                <div className="sectionLeft">
                                    <div className="sectionTitle">Delay Root Cause Breakdown</div>
                                    <div className="sectionSub">
                                        Total {delayBreakdown.totals.totalDelayedActivities} delayed activities • {Math.round(delayBreakdown.totals.totalDelayDays * 10) / 10} delay-days
                                    </div>
                                </div>

                                <div className="sectionRight">
                                    {!delayBreakdown.chartData.some((x) => x.delayDays > 0) ? (
                                        <div className="emptyState">No delay reasons available for current selection</div>
                                    ) : (
                                        <div className="chartWrap" style={{ height: 260 }}>
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
                                    <div className="sectionTitle">Activity Status Funnel</div>
                                    <div className="sectionSub">
                                        {activityStatus.counts["Not Started"]} Not Started • {activityStatus.counts["In Progress"]} In Progress • {activityStatus.counts.Blocked} Blocked • {activityStatus.counts.Completed} Completed
                                    </div>
                                </div>

                                <div className="sectionRight">
                                    <div className="chartWrap" style={{ height: 260 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={activityStatus.chartData} layout="vertical" margin={{ top: 10, right: 24, bottom: 10, left: 120 }} barCategoryGap={16} barGap={6}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" tick={{ fontSize: 12 }} />
                                                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                                                <Tooltip
                                                    formatter={(v: any, name: any) => [v, name]}
                                                    labelFormatter={() => ""}
                                                    contentStyle={{ borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", boxShadow: "0 10px 30px rgba(0,0,0,0.12)" }}
                                                />
                                                <Legend />
                                                <Bar dataKey="Not Started" stackId="stage" fill={stageColors["Not Started"]} radius={[10, 0, 0, 10]} />
                                                <Bar dataKey="In Progress" stackId="stage" fill={stageColors["In Progress"]} />
                                                <Bar dataKey="Blocked" stackId="stage" fill={stageColors["Blocked"]} />
                                                <Bar dataKey="Completed" stackId="stage" fill={stageColors["Completed"]} radius={[0, 10, 10, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="spacer" />

                        <div className="panelSection">
                            <div className="sectionGrid">
                                <div className="sectionLeft">
                                    <div className="sectionTitle">Planned vs Actual Cost Burn</div>
                                    <div className="sectionSub">
                                        Budgeted {costBurn.totals.budgeted.toLocaleString()} • Actual {costBurn.totals.actual.toLocaleString()} • Delay {costBurn.totals.delayCost.toLocaleString()} • DPR {costBurn.totals.dprCost.toLocaleString()}
                                    </div>
                                    <div className="tagRow" style={{ marginTop: 10 }}>
                                        {costBurn.totals.firstOverrunDate ? <span className="tag tagRed">Overrun starts: {costBurn.totals.firstOverrunDate}</span> : <span className="tag tagGreen">No overrun detected</span>}
                                    </div>
                                </div>

                                <div className="sectionRight">
                                    {!costBurn.hasAny ? (
                                        <div className="emptyState">No cost data available for current selection</div>
                                    ) : (
                                        <div className="chartWrap" style={{ height: 300 }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={costBurn.series} margin={{ top: 10, right: 24, bottom: 10, left: 10 }}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={24} />
                                                    <YAxis tick={{ fontSize: 12 }} />
                                                    <Tooltip
                                                        formatter={(v: any, name: any) => [Number(v).toLocaleString(), name]}
                                                        labelFormatter={(l: any) => `Date: ${l}`}
                                                        contentStyle={{ borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", boxShadow: "0 10px 30px rgba(0,0,0,0.12)" }}
                                                    />
                                                    <Legend />
                                                    <Line type="monotone" dataKey="budgeted" name="Budgeted (cumulative)" stroke="#64748b" strokeWidth={2} dot={false} />
                                                    <Line type="monotone" dataKey="actual" name="Actual (cumulative)" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                                                    <Line type="monotone" dataKey="delayCost" name="Delay cost (cumulative)" stroke="#ef4444" strokeWidth={2} dot={false} />
                                                    <Line type="monotone" dataKey="dprCost" name="DPR cost (cumulative)" stroke="#f59e0b" strokeWidth={2} dot={false} />
                                                    <Line type="monotone" dataKey="actualPlusDelay" name="Actual + Delay" stroke="#111827" strokeWidth={2} dot={false} />
                                                    {costBurn.totals.firstOverrunDate ? (
                                                        <ReferenceDot
                                                            x={costBurn.totals.firstOverrunDate}
                                                            y={costBurn.series.find((s) => s.date === costBurn.totals.firstOverrunDate)?.actualPlusDelay ?? 0}
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

                        <div className="spacer" />

                        <div className="panelSection">
                            <div className="sectionGrid">
                                <div className="sectionLeft">
                                    <div className="sectionTitle">Responsibility Load Map (RASI)</div>
                                    <div className="sectionSub">Top users by assigned activities • Split by R / A / S / I</div>

                                    {responsibilityLoad.overloaded.length ? (
                                        <div className="tagRow" style={{ marginTop: 10 }}>
                                            {responsibilityLoad.overloaded.slice(0, 4).map((u) => (
                                                <span key={u} className="tag tagRed">
                                                    Overloaded: {u}
                                                </span>
                                            ))}
                                            {responsibilityLoad.overloaded.length > 4 ? <span className="tag tagRed">+{responsibilityLoad.overloaded.length - 4} more</span> : null}
                                        </div>
                                    ) : (
                                        <div className="tagRow" style={{ marginTop: 10 }}>
                                            <span className="tag tagGreen">No overload flags</span>
                                        </div>
                                    )}
                                </div>

                                <div className="sectionRight">
                                    {!responsibilityLoad.rows.length ? (
                                        <div className="emptyState">No RASI data available for current selection</div>
                                    ) : (
                                        <div className="chartWrap" style={{ height: Math.max(320, responsibilityLoad.rows.length * 26) }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={responsibilityLoad.rows} layout="vertical" margin={{ top: 10, right: 24, bottom: 10, left: 160 }} barCategoryGap={10} barGap={4}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis type="number" tick={{ fontSize: 12 }} />
                                                    <YAxis type="category" dataKey="user" width={150} tick={{ fontSize: 12 }} />
                                                    <Tooltip
                                                        formatter={(v: any, name: any) => [v, name]}
                                                        labelFormatter={(l: any) => `User: ${l}`}
                                                        contentStyle={{ borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", boxShadow: "0 10px 30px rgba(0,0,0,0.12)" }}
                                                    />
                                                    <Legend />
                                                    <Bar dataKey="R" name="Responsible (R)" stackId="rasi" fill={rasiColors.R} radius={[10, 0, 0, 10]} />
                                                    <Bar dataKey="A" name="Accountable (A)" stackId="rasi" fill={rasiColors.A} />
                                                    <Bar dataKey="S" name="Consulted (S)" stackId="rasi" fill={rasiColors.S} />
                                                    <Bar dataKey="I" name="Informed (I)" stackId="rasi" fill={rasiColors.I} radius={[0, 10, 10, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Charts;
