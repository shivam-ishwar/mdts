import React, { useEffect, useMemo, useState } from "react";
import { Table, Select, InputNumber, Typography, Space, Spin, Button } from "antd";
import dayjs from "dayjs";
import { db } from "../Utils/dataStorege";
import type { ActivityCost as ActivityCostType } from "../Utils/dataStorege";
import { getLatestProjectModules } from "../Utils/projectTimeline";
import "../styles/activitycost.css";
import { ToastContainer } from "react-toastify";
import { notify } from "../Utils/ToastNotify";

const { Option } = Select;
const { Text } = Typography;

interface ActivityRow {
  key: string;
  SrNo: string | number | null;
  Code: string | null;
  keyActivity: string;
  plannedStart: string;
  plannedFinish: string;
  activityCode: string;
  activityName: string;
  projectCost?: number | null;
  opportunityCost?: number | null;
  moduleName?: string;
  isModule?: boolean;
  children?: ActivityRow[];
}

interface ModulePanel {
  moduleKey: string;
  moduleName: string;
  rows: ActivityRow[];
}

export type ActivityCostPageProps = {
  presetProjectId?: string | null;
  /** Hide title row and project picker (e.g. inside Status Update modal). */
  embedded?: boolean;
};

const parseCostValue = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const ActivityCost: React.FC<ActivityCostPageProps> = ({
  presetProjectId = null,
  embedded = false,
}) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [modulesPanels, setModulesPanels] = useState<ModulePanel[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await db.getProjects();
      if (cancelled) return;
      setProjects(all || []);

      if (embedded && presetProjectId != null && String(presetProjectId) !== "") {
        const pid = String(presetProjectId);
        setSelectedProjectId(pid);
        await loadModulesForProject(pid);
        return;
      }

      if (!embedded && all && all.length > 0) {
        const firstId = String(all[0].id);
        setSelectedProjectId(firstId);
        await loadModulesForProject(firstId);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [embedded, presetProjectId]);

  useEffect(() => {
    setExpandedKeys(modulesPanels.map((p) => p.moduleKey));
  }, [modulesPanels]);

  const loadModulesForProject = async (projectId: string) => {
    setLoading(true);
    const all = await db.getProjects();
    const proj = all.find((p: any) => String(p.id) === String(projectId));
    const modules = proj ? await getLatestProjectModules(proj) : [];

    await buildPanelsFromModules(projectId, modules);
    setLoading(false);
  };

  const buildPanelsFromModules = async (projectId: string, modules: any[]) => {
    const costs = await db.getActivityCostsForProject(projectId);
    const map = new Map<string, ActivityCostType>();
    costs.forEach((c) => map.set(String(c.activityCode), c));

    const panels: ModulePanel[] = [];

    modules.forEach((module: any, moduleIndex: number) => {
      const moduleName = module.moduleName || module.keyActivity || `Module ${moduleIndex + 1}`;
      const parentCode = module.parentModuleCode || module.Code || "";

      const rows: ActivityRow[] = (module.activities || []).map((activity: any, actIndex: number) => {
        const activityCode = String(activity.code || activity.guicode || `act-${moduleIndex}-${actIndex}`);
        const actName = activity.activityName || activity.keyActivity || "";
        const c = map.get(activityCode);
        const timelineProjectCost = parseCostValue(activity?.cost?.projectCost);
        const timelineOpportunityCost = parseCostValue(
          activity?.cost?.opCost ?? activity?.cost?.opportunityCost
        );

        return {
          key: `activity-${moduleIndex}-${actIndex}`,
          SrNo: parentCode || "",
          Code: activity.code || "",
          keyActivity: actName,
          plannedStart: activity.start ? dayjs(activity.start).format("DD-MM-YYYY") : "-",
          plannedFinish: activity.end ? dayjs(activity.end).format("DD-MM-YYYY") : "-",
          activityCode,
          activityName: actName,
          projectCost: c?.projectCost ?? timelineProjectCost,
          opportunityCost: c?.opportunityCost ?? timelineOpportunityCost,
          moduleName,
          isModule: false,
        };
      });

      panels.push({
        moduleKey: `module-${moduleIndex}`,
        moduleName,
        rows,
      });
    });

    setModulesPanels(panels);
  };

  const handleProjectChange = async (projectId: string) => {
    setSelectedProjectId(projectId);
    await loadModulesForProject(projectId);
  };

  const handleProjectCostChange = (rowKey: string, val: number | null) => {
    setModulesPanels((prev) =>
      prev.map((p) => ({
        ...p,
        rows: p.rows.map((r) => (r.key === rowKey ? { ...r, projectCost: val } : r)),
      }))
    );
  };

  const handleOpportunityCostChange = (rowKey: string, val: number | null) => {
    setModulesPanels((prev) =>
      prev.map((p) => ({
        ...p,
        rows: p.rows.map((r) => (r.key === rowKey ? { ...r, opportunityCost: val } : r)),
      }))
    );
  };

  const handleProjectCostBlur = async (row: ActivityRow, moduleName: string) => {
    if (!selectedProjectId) return;

    if (row.projectCost === null || row.projectCost === undefined || Number.isNaN(row.projectCost)) {
      if (row.opportunityCost == null || Number.isNaN(row.opportunityCost)) {
        await db.deleteActivityCost(String(selectedProjectId), row.activityCode);
        await loadModulesForProject(String(selectedProjectId));
      }
      return;
    }

    await db.upsertActivityCost({
      projectId: String(selectedProjectId),
      activityCode: row.activityCode,
      activityName: row.activityName,
      moduleName,
      projectCost: Number(row.projectCost),
      opportunityCost:
        row.opportunityCost != null && !Number.isNaN(row.opportunityCost) ? Number(row.opportunityCost) : undefined,
    });
  };

  const handleOpportunityCostBlur = async (row: ActivityRow, moduleName: string) => {
    if (!selectedProjectId) return;

    if (
      row.opportunityCost === null ||
      row.opportunityCost === undefined ||
      Number.isNaN(row.opportunityCost)
    ) {
      if (row.projectCost == null || Number.isNaN(row.projectCost)) {
        await db.deleteActivityCost(String(selectedProjectId), row.activityCode);
        await loadModulesForProject(String(selectedProjectId));
      }
      return;
    }

    await db.upsertActivityCost({
      projectId: String(selectedProjectId),
      activityCode: row.activityCode,
      activityName: row.activityName,
      moduleName,
      projectCost:
        row.projectCost != null && !Number.isNaN(row.projectCost) ? Number(row.projectCost) : undefined,
      opportunityCost: Number(row.opportunityCost),
    });
  };

  const numericParser = (value: string | undefined): number => {
    const cleaned = (value || "").replace(/[^\d]/g, "");
    return cleaned ? Number(cleaned) : NaN;
  };

  const tableData: any[] = useMemo(
    () =>
      modulesPanels.map((panel) => ({
        key: panel.moduleKey,
        SrNo: panel.rows[0]?.SrNo || "",
        Code: panel.rows[0]?.SrNo || "",
        keyActivity: panel.moduleName,
        plannedStart: "",
        plannedFinish: "",
        activityCode: "",
        activityName: "",
        projectCost: null,
        opportunityCost: null,
        moduleName: panel.moduleName,
        isModule: true,
        children: panel.rows,
      })),
    [modulesPanels]
  );

  const columns = [
    {
      title: "Sr No / Module Code",
      dataIndex: "SrNo",
      key: "SrNo",
      align: "center" as const,
      width: 140,
      render: (text: any, record: ActivityRow) => (record.isModule ? <b>{text}</b> : text),
    },
    {
      title: "Activity Code",
      dataIndex: "Code",
      key: "Code",
      align: "center" as const,
      width: 140,
      render: (text: any, record: ActivityRow) => (record.isModule ? "" : text),
    },
    {
      title: "Activity / Module",
      dataIndex: "keyActivity",
      key: "keyActivity",
      width: 280,
      render: (text: any, record: ActivityRow) =>
        record.isModule ? <span className="activity-module-title">{text}</span> : text,
    },
    {
      title: "Planned Start",
      dataIndex: "plannedStart",
      key: "plannedStart",
      align: "center" as const,
      width: 140,
      render: (text: any, record: ActivityRow) => (record.isModule ? "" : text),
    },
    {
      title: "Planned Finish",
      dataIndex: "plannedFinish",
      key: "plannedFinish",
      align: "center" as const,
      width: 140,
      render: (text: any, record: ActivityRow) => (record.isModule ? "" : text),
    },
    {
      title: "Project Cost (₹)",
      key: "projectCost",
      align: "right" as const,
      width: 170,
      render: (_: any, row: ActivityRow) =>
        row.isModule ? null : (
          <InputNumber<number>
            className="activity-cost-input"
            style={{ width: "100%" }}
            min={0}
            precision={0}
            parser={numericParser}
            value={row.projectCost ?? undefined}
            onChange={(v) => handleProjectCostChange(row.key, v ?? null)}
            onBlur={() => handleProjectCostBlur(row, row.moduleName || "")}
          />
        ),
    },
    {
      title: "Opportunity Cost (₹)",
      key: "opportunityCost",
      align: "right" as const,
      width: 190,
      render: (_: any, row: ActivityRow) =>
        row.isModule ? null : (
          <InputNumber<number>
            className="activity-cost-input"
            style={{ width: "100%" }}
            min={0}
            precision={0}
            parser={numericParser}
            value={row.opportunityCost ?? undefined}
            onChange={(v) => handleOpportunityCostChange(row.key, v ?? null)}
            onBlur={() => handleOpportunityCostBlur(row, row.moduleName || "")}
          />
        ),
    },
  ];

  const handleSaveAll = async () => {
    if (!selectedProjectId) return;
    setSavingAll(true);

    try {
      const ops: Promise<any>[] = [];

      modulesPanels.forEach((panel) => {
        panel.rows.forEach((row) => {
          const bothEmpty =
            (row.projectCost == null || Number.isNaN(row.projectCost)) &&
            (row.opportunityCost == null || Number.isNaN(row.opportunityCost));

          if (bothEmpty) {
            ops.push(db.deleteActivityCost(String(selectedProjectId), row.activityCode));
          } else {
            ops.push(
              db.upsertActivityCost({
                projectId: String(selectedProjectId),
                activityCode: row.activityCode,
                activityName: row.activityName,
                moduleName: row.moduleName || "",
                projectCost:
                  row.projectCost != null && !Number.isNaN(row.projectCost) ? Number(row.projectCost) : undefined,
                opportunityCost:
                  row.opportunityCost != null && !Number.isNaN(row.opportunityCost)
                    ? Number(row.opportunityCost)
                    : undefined,
              })
            );
          }
        });
      });

      await Promise.all(ops);
      notify.success("Activity cost saved");
      await loadModulesForProject(String(selectedProjectId));
    } catch (err) {
      console.error(err);
      notify.error("Failed to save activity cost");
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <>
      {!embedded ? (
        <div className="activity-cost-heading">
          <div className="activity-cost-heading-inner">
            <div>
              <p className="page-heading-title">Activity Cost Builder</p>
              <span className="pl-subtitle">Manage project activity costs module-wise</span>
            </div>

            <Space size={10} align="center">
              <Text className="activity-cost-label">Select Project:</Text>
              <Select
                className="activity-cost-project-select"
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
          </div>
        </div>
      ) : null}

      <div className={embedded ? "activity-cost-main activity-cost-main--embedded" : "activity-cost-main"}>
        <div className="activity-cost-content">
          {loading && modulesPanels.length === 0 ? (
            <div className="activity-cost-loading">
              <Spin />
            </div>
          ) : (
            <div className="activity-cost-table-shell">
              <Table
                columns={columns as any}
                dataSource={tableData}
                rowKey="key"
                pagination={false}
                bordered
                loading={loading}
                expandable={{
                  expandedRowKeys: expandedKeys,
                  onExpand: (expanded, record: any) => {
                    if (expanded) setExpandedKeys((prev) => [...prev, record.key]);
                    else setExpandedKeys((prev) => prev.filter((k) => k !== record.key));
                  },
                  rowExpandable: (record: any) => Array.isArray(record.children) && record.children.length > 0,
                  expandIconColumnIndex: 0,
                }}
                rowClassName={(record: any) => (record.isModule ? "activity-module-header-row" : "activity-row")}
                scroll={{
                  x: "max-content",
                  y: embedded ? 400 : "calc(100vh - 300px)",
                }}
                className="activity-cost-table"
              />
            </div>
          )}
        </div>
        <div className={embedded ? "save-btn save-btn--embedded" : "save-btn"}>
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

export default ActivityCost;
