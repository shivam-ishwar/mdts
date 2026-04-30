import React, { useEffect, useMemo, useState } from "react";
import { Table, Select, Typography, Space, InputNumber, Button, Tooltip, Spin } from "antd";
import { HistoryOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { db } from "../Utils/dataStorege";
import { getLatestProjectModules } from "../Utils/projectTimeline";
import "../styles/commercialactivityplanner.css";
import { ToastContainer } from "react-toastify";
import { notify } from "../Utils/ToastNotify";

const { Text } = Typography;
const { Option } = Select;

interface TimelineInfo {
    status: string;
    version: string;
    updatedAt: string;
}

interface RevisionEntry {
    amount: number;
    date: string;
}

interface CommercialActivityRow {
    key: string;
    projectId: string;
    moduleCode?: string;
    moduleName?: string;
    activityCode: string;
    activityName: string;
    plannedStart?: string | null;
    plannedFinish?: string | null;
    actualStart?: string | null;
    actualFinish?: string | null;
    commercialUndertaken: boolean;
    leadTimeDays: number | null;
    budgetAmount?: number | null;
    isModule?: boolean;
    children?: CommercialActivityRow[];
    hasRevisedBudget?: boolean;
}

const CommercialActivityPlanner: React.FC = () => {
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [rows, setRows] = useState<CommercialActivityRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
    const [timelineInfo, setTimelineInfo] = useState<TimelineInfo | null>(null);
    const [savingAll, setSavingAll] = useState(false);

    useEffect(() => {
        (async () => {
            const all = await db.getProjects();
            setProjects(all || []);
            if (all && all.length > 0) {
                const firstId = String(all[0].id);
                setSelectedProjectId(firstId);
                await loadRowsForProject(firstId);
            }
        })();
    }, []);

    const loadRowsForProject = async (projectId: string) => {
        setLoading(true);

        const all = await db.getProjects();
        const proj = all.find((p: any) => String(p.id) === String(projectId));

        if (!proj) {
            setRows([]);
            setTimelineInfo(null);
            setLoading(false);
            return;
        }

        if (Array.isArray(proj.projectTimeline) && proj.projectTimeline.length > 0) {
            const latest = proj.projectTimeline[proj.projectTimeline.length - 1];

            setTimelineInfo({
                status: latest.status ?? "",
                version: latest.version ?? "",
                updatedAt: latest.updatedAt ?? latest.createdAt ?? "",
            });
        } else {
            setTimelineInfo(null);
        }

        const modules = await getLatestProjectModules(proj);

        if (!modules.length) {
            setRows([]);
            setLoading(false);
            return;
        }

        const budgets = await db.getActivityBudgetsForProject(String(projectId));
        const budgetMap = new Map<string, any>();

        budgets.forEach((b: any) => {
            const history: RevisionEntry[] = Array.isArray(b.revisionHistory) ? b.revisionHistory : [];
            const last = history.length > 0 ? history[history.length - 1] : null;

            const currentBudget =
                (last?.amount ?? null) ??
                (typeof b.originalBudget === "number" ? b.originalBudget : null) ??
                (typeof b.totalBudget === "number" ? b.totalBudget : null) ??
                (typeof b.budgetAmount === "number" ? b.budgetAmount : null);

            const hasRevisedBudget = history.length > 0;

            if (currentBudget != null) {
                budgetMap.set(String(b.activityCode), {
                    ...b,
                    currentBudget,
                    hasRevisedBudget,
                });
            }
        });

        const existingCommercial = await db.getCommercialActivitiesForProject(String(projectId));
        const commercialMap = new Map<string, any>();
        existingCommercial.forEach((c: any) => commercialMap.set(String(c.activityCode), c));

        const flatRows: CommercialActivityRow[] = [];

        modules.forEach((module: any, moduleIndex: number) => {
            const moduleName = module.moduleName || module.keyActivity || `Module ${moduleIndex + 1}`;
            const moduleCode = module.parentModuleCode || module.Code || "";

            (module.activities || []).forEach((activity: any, actIndex: number) => {
                const code = activity.code || activity.guicode || `act-${moduleIndex}-${actIndex}`;
                const budget = budgetMap.get(String(code));
                if (!budget) return;

                const existing = commercialMap.get(String(code));
                const plannedStartIso: string | null = activity.start || activity.plannedStart || null;
                const plannedFinishIso: string | null = activity.end || activity.plannedFinish || null;

                const budgetAmount: number | null =
                    typeof budget.currentBudget === "number"
                        ? budget.currentBudget
                        : budget.originalBudget ?? budget.totalBudget ?? budget.budgetAmount ?? null;

                flatRows.push({
                    key: `${projectId}-${code}`,
                    projectId: String(projectId),
                    moduleCode: moduleCode || undefined,
                    moduleName,
                    activityCode: String(code),
                    activityName: activity.activityName || activity.keyActivity || "",
                    plannedStart: existing?.plannedStart ?? plannedStartIso,
                    plannedFinish: existing?.plannedFinish ?? plannedFinishIso,
                    actualStart: existing?.actualStart ?? activity.actualStart ?? null,
                    actualFinish: existing?.actualFinish ?? activity.actualFinish ?? null,
                    commercialUndertaken: existing?.commercialUndertaken ?? false,
                    leadTimeDays: existing?.leadTimeDays !== undefined ? existing.leadTimeDays : null,
                    budgetAmount,
                    hasRevisedBudget: !!budget.hasRevisedBudget,
                });
            });
        });

        setRows(flatRows);
        setLoading(false);
    };

    const handleProjectChange = async (projectId: string) => {
        setSelectedProjectId(projectId);
        await loadRowsForProject(projectId);
    };

    const updateRow = (key: string, partial: Partial<CommercialActivityRow>) => {
        setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...partial } : r)));
    };

    const persistRow = async (row: CommercialActivityRow) => {
        await db.upsertCommercialActivity({
            projectId: row.projectId,
            moduleCode: row.moduleCode,
            moduleName: row.moduleName,
            activityCode: row.activityCode,
            activityName: row.activityName,
            plannedStart: row.plannedStart ?? null,
            plannedFinish: row.plannedFinish ?? null,
            actualStart: row.actualStart ?? null,
            actualFinish: row.actualFinish ?? null,
            commercialUndertaken: row.commercialUndertaken,
            leadTimeDays: row.leadTimeDays,
        });
    };

    const handleCommercialUndertakenChange = (row: CommercialActivityRow, value: "Yes" | "No") => {
        const undertaken = value === "Yes";
        const updated: CommercialActivityRow = {
            ...row,
            commercialUndertaken: undertaken,
            leadTimeDays: undertaken ? row.leadTimeDays : null,
        };
        updateRow(row.key, updated);
        void persistRow(updated);
    };

    const handleLeadTimeChange = (row: CommercialActivityRow, value: number | null) => {
        const updated: CommercialActivityRow = { ...row, leadTimeDays: value ?? null };
        updateRow(row.key, updated);
        void persistRow(updated);
    };

    const numericParser = (value: string | undefined): number => {
        const cleaned = (value || "").replace(/[^\d]/g, "");
        return cleaned ? Number(cleaned) : NaN;
    };

    const tableData: CommercialActivityRow[] = useMemo(() => {
        const groups = new Map<
            string,
            { moduleName: string | undefined; moduleCode: string | undefined; rows: CommercialActivityRow[] }
        >();

        rows.forEach((r) => {
            const key = `${r.moduleCode || ""}::${r.moduleName || ""}`;
            if (!groups.has(key)) groups.set(key, { moduleName: r.moduleName, moduleCode: r.moduleCode, rows: [] });
            groups.get(key)!.rows.push(r);
        });

        const parents: CommercialActivityRow[] = [];
        let idx = 0;

        groups.forEach((group, key) => {
            parents.push({
                key: `module-${idx}-${key}`,
                projectId: selectedProjectId || "",
                moduleCode: group.moduleCode,
                moduleName: group.moduleName,
                activityCode: "",
                activityName: "",
                plannedStart: null,
                plannedFinish: null,
                actualStart: null,
                actualFinish: null,
                commercialUndertaken: false,
                leadTimeDays: null,
                isModule: true,
                children: group.rows,
                budgetAmount: null,
            });
            idx++;
        });

        return parents;
    }, [rows, selectedProjectId]);

    useEffect(() => {
        setExpandedKeys(tableData.map((p) => p.key));
    }, [tableData]);

    const handleSaveAll = async () => {
        if (!selectedProjectId) return;
        setSavingAll(true);
        try {
            for (const row of rows) {
                await persistRow(row);
            }
            notify.success("Commercial activity details saved");
            await loadRowsForProject(String(selectedProjectId));
        } catch (e) {
            console.error(e);
            notify.error("Failed to save commercial activity details");
        } finally {
            setSavingAll(false);
        }
    };

    const columns = [
        {
            title: "Module",
            dataIndex: "moduleName",
            key: "moduleName",
            width: 220,
            render: (_: any, row: CommercialActivityRow) => (row.isModule ? <b>{row.moduleName}</b> : row.moduleName),
        },
        {
            title: "Activity",
            dataIndex: "activityName",
            key: "activityName",
            width: 320,
            render: (val: string, row: CommercialActivityRow) => (row.isModule ? "" : val),
        },
        {
            title: "Budget (₹)",
            dataIndex: "budgetAmount",
            key: "budgetAmount",
            width: 180,
            align: "right" as const,
            render: (val: any, row: any) => {
                if (row.isModule) return "";
                const display = val != null ? val.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "-";
                return (
                    <span className="cap-budget-cell">
                        <span>{display}</span>
                        {row.hasRevisedBudget ? (
                            <Tooltip title="Budget revised">
                                <HistoryOutlined className="revised-icon" />
                            </Tooltip>
                        ) : (
                            <span className="dash-placeholder">-</span>
                        )}
                    </span>
                );
            },
        },
        {
            title: "Planned Start",
            dataIndex: "plannedStart",
            key: "plannedStart",
            width: 160,
            align: "center" as const,
            render: (val: string | null | undefined, row: CommercialActivityRow) =>
                row.isModule ? "" : val ? dayjs(val).format("DD-MM-YYYY") : "-",
        },
        {
            title: "Planned Finish",
            dataIndex: "plannedFinish",
            key: "plannedFinish",
            width: 160,
            align: "center" as const,
            render: (val: string | null | undefined, row: CommercialActivityRow) =>
                row.isModule ? "" : val ? dayjs(val).format("DD-MM-YYYY") : "-",
        },
        {
            title: "Actual Start",
            dataIndex: "actualStart",
            key: "actualStart",
            width: 160,
            align: "center" as const,
            render: (val: string | null | undefined, row: CommercialActivityRow) =>
                row.isModule ? "" : val ? dayjs(val).format("DD-MM-YYYY") : "-",
        },
        {
            title: "Actual Finish",
            dataIndex: "actualFinish",
            key: "actualFinish",
            width: 160,
            align: "center" as const,
            render: (val: string | null | undefined, row: CommercialActivityRow) =>
                row.isModule ? "" : val ? dayjs(val).format("DD-MM-YYYY") : "-",
        },
        {
            title: "Commercial Activity Undertaken",
            key: "commercialUndertaken",
            width: 240,
            render: (_: any, row: CommercialActivityRow) =>
                row.isModule ? null : (
                    <Select
                        className="cap-select"
                        value={row.commercialUndertaken ? "Yes" : "No"}
                        style={{ width: "100%" }}
                        onChange={(val: "Yes" | "No") => handleCommercialUndertakenChange(row, val)}
                    >
                        <Option value="Yes">Yes</Option>
                        <Option value="No">No</Option>
                    </Select>
                ),
        },
        {
            title: "Lead Time (Days)",
            key: "leadTime",
            width: 180,
            render: (_: any, row: CommercialActivityRow) =>
                row.isModule ? null : (
                    <InputNumber<number>
                        className="cap-input"
                        style={{ width: "100%" }}
                        min={0}
                        precision={0}
                        parser={numericParser}
                        disabled={!row.commercialUndertaken}
                        value={row.leadTimeDays ?? undefined}
                        onChange={(val) => handleLeadTimeChange(row, (val ?? null) as number | null)}
                    />
                ),
        },
    ];

    return (
        <>
            <div className="cap-heading">
                <div className="cap-heading-inner">
                    <div>
                        <p className="page-heading-title">Commercial Activity Planner</p>
                        <span className="pl-subtitle">Track commercial readiness module-wise</span>
                    </div>

                    <Space size={12} align="center" wrap>
                        <Space size={8} align="center">
                            <Text className="cap-meta-label">Project:</Text>
                            <Select
                                className="cap-project-select"
                                value={selectedProjectId ?? undefined}
                                onChange={handleProjectChange}
                                showSearch
                                optionFilterProp="children"
                            >
                                {projects.map((p) => (
                                    <Option key={p.id} value={String(p.id)}>
                                        {p.projectParameters?.projectName || p.name || `Project ${p.id}`}
                                    </Option>
                                ))}
                            </Select>
                        </Space>

                        {timelineInfo && (
                            <Space size={8} align="center">
                                <Text className="cap-meta-label">Version:</Text>
                                <Text className="cap-meta-value">{timelineInfo.version}</Text>
                            </Space>
                        )}

                        {timelineInfo && (
                            <Space size={8} align="center">
                                <Text className="cap-meta-label">Status:</Text>
                                <Text className="cap-meta-value">{timelineInfo.status}</Text>
                            </Space>
                        )}

                        {timelineInfo && (
                            <Space size={8} align="center">
                                <Text className="cap-meta-label">Updated:</Text>
                                <Text className="cap-meta-value">
                                    {timelineInfo.updatedAt ? dayjs(timelineInfo.updatedAt).format("DD-MM-YYYY") : "-"}
                                </Text>
                            </Space>
                        )}
                    </Space>
                </div>
            </div>

            <div className="cap-main">
                <div className="cap-content">
                    {loading && rows.length === 0 ? (
                        <div className="cap-loading">
                            <Spin />
                        </div>
                    ) : (
                        <div className="cap-table-shell">
                            <Table
                                columns={columns as any}
                                dataSource={tableData}
                                rowKey="key"
                                pagination={false}
                                bordered
                                loading={loading}
                                size="small"
                                expandable={{
                                    expandedRowKeys: expandedKeys,
                                    onExpand: (expanded, record: any) => {
                                        if (expanded) setExpandedKeys((prev) => [...prev, record.key]);
                                        else setExpandedKeys((prev) => prev.filter((k) => k !== record.key));
                                    },
                                    rowExpandable: (record: any) => Array.isArray(record.children) && record.children.length > 0,
                                    expandIconColumnIndex: 0,
                                }}
                                rowClassName={(record: any) => (record.isModule ? "cap-module-header-row" : "cap-activity-row")}
                                scroll={{ x: "max-content", y: "calc(100vh - 300px)" }}
                                className="cap-table"
                            />
                        </div>
                    )}
                </div>
                <div className="save-btn">
                    <Button
                        type="primary"
                        className="save-button"
                        onClick={handleSaveAll}
                        loading={savingAll}
                        disabled={!selectedProjectId}
                    >
                        Save
                    </Button>
                </div>
            </div>

            <ToastContainer />
        </>
    );
};

export default CommercialActivityPlanner;
