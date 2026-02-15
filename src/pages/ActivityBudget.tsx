import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  Select,
  InputNumber,
  Typography,
  Space,
  Button,
  Modal,
  Input,
  Tooltip,
  DatePicker
} from "antd";
import {
  FileTextOutlined,
  UploadOutlined,
  EyeOutlined,
  DownloadOutlined,
  DeleteOutlined,
  HistoryOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  PlusCircleOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { db, ActivityBudgetDocument } from "../Utils/dataStorege";
import "../styles/activitybudget.css";
import { ToastContainer } from "react-toastify";
import { notify } from "../Utils/ToastNotify";
import type { Dayjs } from "dayjs";
const { Option } = Select;
const { Text } = Typography;

interface RevisionEntry {
  amount: number;
  date: string;
}

interface TimelineInfo {
  status: string;
  version: string;
  updatedAt: string;
}

interface ActivityRow {
  key: string;
  SrNo: string | number | null;
  Code: string | null;
  keyActivity: string;
  plannedStart: string;
  plannedFinish: string;
  activityCode: string;
  activityName: string;
  originalBudget?: number | null;
  originalBudgetDate?: string | null;
  currentBudget?: number | null;
  currentBudgetDate?: string | null;
  revisionHistory?: RevisionEntry[];
}

interface ModulePanel {
  moduleKey: string;
  moduleName: string;
  rows: ActivityRow[];
}

type TableRow = ActivityRow & {
  isModule?: boolean;
  moduleName?: string;
  children?: TableRow[];
};

const ActivityBudget: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [modulesPanels, setModulesPanels] = useState<ModulePanel[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [timelineInfo, setTimelineInfo] = useState<TimelineInfo | null>(null);
  const [docModalVisible, setDocModalVisible] = useState(false);
  const [docModalActivity, setDocModalActivity] = useState<{
    activityCode: string;
    activityName: string;
    moduleName: string;
  } | null>(null);
  const [docModalDocs, setDocModalDocs] = useState<ActivityBudgetDocument[]>([]);
  const [docName, setDocName] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docPreviewVisible, setDocPreviewVisible] = useState(false);
  const [docPreviewContent, setDocPreviewContent] = useState<string | null>(null);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyModalRow, setHistoryModalRow] = useState<TableRow | null>(null);
  const [editingRowKey, setEditingRowKey] = useState<React.Key | null>(null);
  const [editOriginalValue, setEditOriginalValue] = useState<number | null>(null);
  const [revisionModalVisible, setRevisionModalVisible] = useState(false);
  const [revisionRow, setRevisionRow] = useState<TableRow | null>(null);
  const [revisionValue, setRevisionValue] = useState<number | null>(null);
  const [selectedActivityRow, setSelectedActivityRow] = useState<TableRow | null>(null);
  const [revisionDate, setRevisionDate] = useState<Dayjs | null>(dayjs());
  useEffect(() => {
    (async () => {
      const all = await db.getProjects();
      setProjects(all || []);
      if (all && all.length > 0) {
        const firstId = String(all[0].id);
        setSelectedProjectId(firstId);
        await loadModulesForProject(firstId);
      }
    })();
  }, []);

  const resetEditing = () => {
    setEditingRowKey(null);
    setEditOriginalValue(null);
  };

  const resetRevision = () => {
    setRevisionModalVisible(false);
    setRevisionRow(null);
    setRevisionValue(null);
    setRevisionDate(null);
  };

  const loadModulesForProject = async (projectId: string) => {
    setLoading(true);
    resetEditing();
    resetRevision();
    const all = await db.getProjects();
    const proj = all.find((p: any) => String(p.id) === String(projectId));
    let latestTimeline: any | null = null;

    if (proj?.projectTimeline?.length) {
      latestTimeline = proj.projectTimeline[proj.projectTimeline.length - 1];

      setTimelineInfo({
        status: latestTimeline.status ?? "",
        version: latestTimeline.version ?? "",
        updatedAt: latestTimeline.updatedAt ?? latestTimeline.createdAt ?? "",
      });
    } else {
      setTimelineInfo(null);
    }

    let modules: any[] = [];

    if (proj?.processedTimelineData?.length) {
      modules = proj.processedTimelineData;
    } else if (proj?.projectTimeline?.length) {
      const latest = proj.projectTimeline[proj.projectTimeline.length - 1];
      const timelineId = latest.timelineId || latest.versionId;
      if (timelineId) {
        const t = await db.getProjectTimelineById(timelineId);
        modules = Array.isArray(t) ? t : [];
      }
    }

    await buildPanelsFromModules(projectId, modules);
    setLoading(false);
  };

  const buildPanelsFromModules = async (projectId: string, modules: any[]) => {
    const budgets = await db.getActivityBudgetsForProject(projectId);
    const map = new Map<string, any>();
    budgets.forEach((b: any) => map.set(String(b.activityCode), b));

    const panels: ModulePanel[] = [];

    modules.forEach((module: any, moduleIndex: number) => {
      const moduleName =
        module.moduleName || module.keyActivity || `Module ${moduleIndex + 1}`;
      const parentCode = module.parentModuleCode || module.Code || "";

      const rows: ActivityRow[] = (module.activities || []).map(
        (activity: any, actIndex: number) => {
          const code =
            activity.code || activity.guicode || `act-${moduleIndex}-${actIndex}`;
          const actName = activity.activityName || activity.keyActivity || "";
          const b = map.get(String(code));
          const history: RevisionEntry[] =
            b?.revisionHistory && Array.isArray(b.revisionHistory)
              ? b.revisionHistory
              : b?.revisedBudget && b?.revisedBudgetDate
                ? [
                  {
                    amount: b.revisedBudget,
                    date: b.revisedBudgetDate,
                  },
                ]
                : [];

          const originalBudget: number | null =
            typeof b?.originalBudget === "number" ? b.originalBudget : null;
          const originalBudgetDate: string | null = b?.originalBudgetDate ?? null;

          const lastHistory = history.length > 0 ? history[history.length - 1] : null;
          const currentBudget =
            lastHistory?.amount ?? originalBudget ?? null;
          const currentBudgetDate =
            lastHistory?.date ?? originalBudgetDate ?? null;

          return {
            key: `activity-${moduleIndex}-${actIndex}`,
            SrNo: parentCode || "",
            Code: activity.code || "",
            keyActivity: actName,
            plannedStart: activity.start
              ? dayjs(activity.start).format("DD-MM-YYYY")
              : "-",
            plannedFinish: activity.end
              ? dayjs(activity.end).format("DD-MM-YYYY")
              : "-",
            activityCode: code,
            activityName: actName,
            originalBudget,
            originalBudgetDate,
            currentBudget,
            currentBudgetDate,
            revisionHistory: history,
          };
        }
      );

      panels.push({
        moduleKey: `module-${moduleIndex}`,
        moduleName,
        rows,
      });
    });

    setModulesPanels(panels);
    setExpandedKeys(panels.map((p) => p.moduleKey));
    resetEditing();
    resetRevision();
  };

  const handleProjectChange = async (projectId: string) => {
    setSelectedProjectId(projectId);
    await loadModulesForProject(projectId);
  };

  const handleBudgetChange = (rowKey: string, val: number | null) => {
    setModulesPanels((prev) =>
      prev.map((p) => ({
        ...p,
        rows: p.rows.map((r) =>
          r.key === rowKey ? { ...r, currentBudget: val } : r
        ),
      }))
    );
  };

  const handleInitialBudgetBlur = async (row: TableRow, moduleName: string) => {
    if (!selectedProjectId || row.isModule) return;

    const value = row.currentBudget;
    if (value === null || value === undefined || Number.isNaN(value)) return;

    const existing = await db.getActivityBudget(
      String(selectedProjectId),
      row.activityCode
    );
    if (existing) return;

    const now = new Date().toISOString();

    await db.upsertActivityBudget({
      projectId: String(selectedProjectId),
      activityCode: row.activityCode,
      activityName: row.activityName,
      moduleName,
      originalBudget: Number(value),
      originalBudgetDate: now,
      revisionHistory: [],
    });

    setModulesPanels((prev) =>
      prev.map((p) => ({
        ...p,
        rows: p.rows.map((r) =>
          r.key === row.key
            ? {
              ...r,
              originalBudget: Number(value),
              originalBudgetDate: now,
              currentBudget: Number(value),
              currentBudgetDate: now,
              revisionHistory: [],
            }
            : r
        ),
      }))
    );
  };

  const numericParser = (value: string | undefined): number => {
    const cleaned = (value || "").replace(/[^\d]/g, "");
    return cleaned ? Number(cleaned) : NaN;
  };

  const tableData: TableRow[] = useMemo(
    () =>
      modulesPanels.map((panel) => ({
        key: panel.moduleKey,
        SrNo: panel.rows[0]?.SrNo ?? "",
        Code: panel.rows[0]?.Code ?? "",
        keyActivity: panel.moduleName,
        plannedStart: "",
        plannedFinish: "",
        activityCode: "",
        activityName: "",
        originalBudget: null,
        originalBudgetDate: null,
        currentBudget: null,
        currentBudgetDate: null,
        revisionHistory: [],
        isModule: true,
        moduleName: panel.moduleName,
        children: panel.rows.map((row) => ({
          ...row,
          isModule: false,
          moduleName: panel.moduleName,
        })),
      })),
    [modulesPanels]
  );

  const openHistoryModal = (row: TableRow) => {
    if (row.isModule) return;
    setHistoryModalRow(row);
    setHistoryModalVisible(true);
  };

  const startEdit = (row: TableRow) => {
    if (row.isModule) return;
    setEditingRowKey(row.key);
    setEditOriginalValue(
      typeof row.currentBudget === "number" ? row.currentBudget : null
    );
  };

  const cancelEdit = () => {
    if (editingRowKey == null) return;
    const key = editingRowKey;
    setModulesPanels((prev) =>
      prev.map((p) => ({
        ...p,
        rows: p.rows.map((r) =>
          r.key === key ? { ...r, currentBudget: editOriginalValue ?? null } : r
        ),
      }))
    );
    resetEditing();
  };

  const saveEdit = async () => {
    if (!selectedProjectId || editingRowKey == null) return;

    let targetRow: TableRow | null = null;
    let targetModuleName = "";

    for (const panel of modulesPanels) {
      const found = panel.rows.find((r) => r.key === editingRowKey);
      if (found) {
        targetRow = { ...found, moduleName: panel.moduleName };
        targetModuleName = panel.moduleName;
        break;
      }
    }

    if (!targetRow) {
      resetEditing();
      return;
    }

    const value = targetRow.currentBudget;
    if (value === null || value === undefined || Number.isNaN(value)) {
      notify.error("Budget value is invalid");
      cancelEdit();
      return;
    }

    const now = new Date().toISOString();
    const existing = await db.getActivityBudget(
      String(selectedProjectId),
      targetRow.activityCode
    );

    if (!existing) {
      await db.upsertActivityBudget({
        projectId: String(selectedProjectId),
        activityCode: targetRow.activityCode,
        activityName: targetRow.activityName,
        moduleName: targetModuleName,
        originalBudget: Number(value),
        originalBudgetDate: now,
        revisionHistory: [],
      });

      setModulesPanels((prev) =>
        prev.map((p) => ({
          ...p,
          rows: p.rows.map((r) =>
            r.key === editingRowKey
              ? {
                ...r,
                originalBudget: Number(value),
                originalBudgetDate: now,
                currentBudget: Number(value),
                currentBudgetDate: now,
                revisionHistory: [],
              }
              : r
          ),
        }))
      );

      resetEditing();
      return;
    }

    const existingHistory: RevisionEntry[] = existing.revisionHistory || [];

    if (existingHistory.length > 0) {
      const updatedHistory: RevisionEntry[] = [...existingHistory];
      const idx = updatedHistory.length - 1;
      updatedHistory[idx] = {
        ...updatedHistory[idx],
        amount: Number(value),
        date: now,
      };

      await db.upsertActivityBudget({
        projectId: String(selectedProjectId),
        activityCode: targetRow.activityCode,
        activityName: targetRow.activityName,
        moduleName: targetModuleName,
        originalBudget: existing.originalBudget,
        originalBudgetDate: existing.originalBudgetDate,
        revisionHistory: updatedHistory,
      });

      setModulesPanels((prev) =>
        prev.map((p) => ({
          ...p,
          rows: p.rows.map((r) =>
            r.key === editingRowKey
              ? {
                ...r,
                originalBudget: existing.originalBudget ?? r.originalBudget,
                originalBudgetDate:
                  existing.originalBudgetDate ?? r.originalBudgetDate,
                currentBudget: Number(value),
                currentBudgetDate: now,
                revisionHistory: updatedHistory,
              }
              : r
          ),
        }))
      );

      resetEditing();
      return;
    }

    await db.upsertActivityBudget({
      projectId: String(selectedProjectId),
      activityCode: targetRow.activityCode,
      activityName: targetRow.activityName,
      moduleName: targetModuleName,
      originalBudget: Number(value),
      originalBudgetDate: existing.originalBudgetDate ?? now,
      revisionHistory: [],
    });

    setModulesPanels((prev) =>
      prev.map((p) => ({
        ...p,
        rows: p.rows.map((r) =>
          r.key === editingRowKey
            ? {
              ...r,
              originalBudget: Number(value),
              originalBudgetDate: existing.originalBudgetDate ?? now,
              currentBudget: Number(value),
              currentBudgetDate: now,
              revisionHistory: [],
            }
            : r
        ),
      }))
    );

    resetEditing();
  };

  const openRevisionModal = (row: TableRow) => {
    if (row.isModule) return;
    const hasPersistedBudget =
      (typeof row.originalBudget === "number" && row.originalBudgetDate) ||
      (row.revisionHistory && row.revisionHistory.length > 0);
    if (!hasPersistedBudget) {
      notify.error("There is no budget added for this activity. Please add a initial budget");
      return;
    }
    setRevisionRow(row);
    setRevisionValue(null);
    setRevisionDate(dayjs());
    setRevisionModalVisible(true);
  };

  const handleRevisionSave = async () => {
    if (!selectedProjectId || !revisionRow) {
      resetRevision();
      return;
    }
    if (
      revisionValue === null ||
      revisionValue === undefined ||
      Number.isNaN(revisionValue)
    ) {
      notify.error("Please enter revised budget.");
      return;
    }

    if (!revisionDate) {
      notify.error("Please select revision date.");
      return;
    }

    if (revisionDate.isAfter(dayjs(), "day")) {
      notify.error("Future date can not be in future");
      return;
    }

    const revisionDateIso = revisionDate.endOf("day").toDate().toISOString(); // ⬅️ date to ISO

    const existing = await db.getActivityBudget(
      String(selectedProjectId),
      revisionRow.activityCode
    );

    if (!existing) {
      notify.error("Existing budget nahi mila revise karne ke liye.");
      resetRevision();
      return;
    }

    const existingHistory: RevisionEntry[] = existing.revisionHistory || [];
    const newHistory: RevisionEntry[] = [
      ...existingHistory,
      {
        amount: Number(revisionValue),
        date: revisionDateIso,
      },
    ];

    await db.upsertActivityBudget({
      projectId: String(selectedProjectId),
      activityCode: revisionRow.activityCode,
      activityName: revisionRow.activityName,
      moduleName: revisionRow.moduleName || "",
      originalBudget: existing.originalBudget,
      originalBudgetDate: existing.originalBudgetDate,
      revisionHistory: newHistory,
    });

    setModulesPanels((prev) =>
      prev.map((p) => ({
        ...p,
        rows: p.rows.map((r) =>
          r.key === revisionRow.key
            ? {
              ...r,
              originalBudget: existing.originalBudget ?? r.originalBudget,
              originalBudgetDate:
                existing.originalBudgetDate ?? r.originalBudgetDate,
              currentBudget: Number(revisionValue),
              currentBudgetDate: revisionDateIso,
              revisionHistory: newHistory,
            }
            : r
        ),
      }))
    );

    resetRevision();
  };

  const renderColumns = (): ColumnsType<TableRow> => [
    {
      title: "Module Code",
      dataIndex: "SrNo",
      key: "SrNo",
      width: 130,
    },
    {
      title: "Activity Code",
      dataIndex: "Code",
      key: "Code",
      width: 120,
      render: (value, record) => (record.isModule ? "" : value),
    },
    {
      title: "Activity / Module",
      dataIndex: "keyActivity",
      key: "keyActivity",
      width: 250,
      render: (text, record) =>
        record.isModule ? <strong>{text}</strong> : text,
    },
    {
      title: "Planned Start",
      dataIndex: "plannedStart",
      key: "plannedStart",
      width: 120,
      render: (value, record) => (record.isModule ? "" : value),
    },
    {
      title: "Planned Finish",
      dataIndex: "plannedFinish",
      key: "plannedFinish",
      width: 120,
      render: (value, record) => (record.isModule ? "" : value),
    },
    {
      title: "Budget (₹)",
      key: "currentBudget",
      width: 170,
      render: (_: any, row: TableRow) => {
        if (row.isModule) return null;

        const hasAnyBudget =
          typeof row.currentBudget === "number" ||
          typeof row.originalBudget === "number" ||
          (row.revisionHistory && row.revisionHistory.length > 0);

        const hasPersistedBudget =
          (typeof row.originalBudget === "number" && row.originalBudgetDate) ||
          (row.revisionHistory && row.revisionHistory.length > 0);

        const hasRevisionHistory =
          row.revisionHistory && row.revisionHistory.length > 0;

        const isEditing = editingRowKey === row.key;
        const disabled = hasAnyBudget && !isEditing;
        const isHistoryActive = historyModalRow?.key === row.key;

        return (
          <div className="budget-cell rev-budg">
            <InputNumber<number>
              className={
                isEditing
                  ? "budget-input budget-input--editing"
                  : "budget-input"
              }
              style={{ width: "100%" }}
              min={0}
              precision={0}
              parser={numericParser}
              value={row.currentBudget ?? undefined}
              onChange={(v) => handleBudgetChange(row.key, v ?? null)}
              onBlur={() => {
                if (!hasAnyBudget && !isEditing) {
                  handleInitialBudgetBlur(row, row.moduleName || "");
                }
              }}
              disabled={disabled}
            />

            {hasPersistedBudget ? (
              hasRevisionHistory ? (
                <Tooltip title="View revision history">
                  <Button
                    type="link"
                    size="small"
                    icon={<HistoryOutlined />}
                    onClick={() => openHistoryModal(row)}
                    className={
                      isHistoryActive
                        ? "revision-btn revision-btn--history revision-btn--active"
                        : "revision-btn revision-btn--history"
                    }
                    style={{ paddingInline: 4 }}
                  />
                </Tooltip>
              ) : (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 12,
                    color: "#999",
                    display: "inline-block",
                    width: 18,
                    textAlign: "center",
                  }}
                >
                  –
                </span>
              )
            ) : null}
          </div>

        );
      },
    },
    {
      title: "Budgeted On",
      key: "budgetedOn",
      width: 140,
      render: (_: any, row: TableRow) => {
        if (row.isModule) return "";
        const date =
          row.currentBudgetDate ||
          (row.revisionHistory && row.revisionHistory.length
            ? row.revisionHistory[row.revisionHistory.length - 1].date
            : row.originalBudgetDate);
        return date ? dayjs(date).format("DD-MM-YYYY HH:mm") : "-";
      },
    },
    // {
    //   title: "Revision History",
    //   key: "history",
    //   width: 120,
    //   render: (_: any, row: TableRow) => {
    //     if (row.isModule) return null;

    //     const hasPersistedBudget =
    //       (typeof row.originalBudget === "number" && row.originalBudgetDate) ||
    //       (row.revisionHistory && row.revisionHistory.length > 0);

    //     const hasRevisionHistory =
    //       row.revisionHistory && row.revisionHistory.length > 0;

    //     const isHistoryActive = historyModalRow?.key === row.key;

    //     if (!hasPersistedBudget) {
    //       return <span className="revision-cell revision-cell--empty">-</span>;
    //     }

    //     return (
    //       <div className="revision-cell">
    //         {hasRevisionHistory ? (
    //           <Tooltip title="View revision history">
    //             <Button
    //               type="link"
    //               size="small"
    //               icon={<HistoryOutlined />}
    //               onClick={() => openHistoryModal(row)}
    //               className={
    //                 isHistoryActive
    //                   ? "revision-btn revision-btn--history revision-btn--active"
    //                   : "revision-btn revision-btn--history"
    //               }
    //             />
    //           </Tooltip>
    //         ) : (
    //           <span className="revision-cell__placeholder">&nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;&nbsp;</span>
    //         )}

    //         <Tooltip title="Add revision">
    //           <Button
    //             type="link"
    //             size="small"
    //             icon={<PlusCircleOutlined />}
    //             onClick={() => openRevisionModal(row)}
    //             className="revision-btn revision-btn--add"
    //           />
    //         </Tooltip>
    //       </div>
    //     );
    //   },
    // },
    {
      title: "Docs",
      key: "docs",
      width: 90,
      render: (_: any, row: TableRow) =>
        row.isModule ? null : (
          <Button
            type="link"
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => openDocsModal(row)}
          >
            Docs
          </Button>
        ),
    },
    {
      title: "Action",
      key: "actions",
      align: "center",
      width: 110,
      render: (_: any, row: TableRow) => {
        if (row.isModule) return null;

        const hasPersistedBudget =
          (typeof row.originalBudget === "number" && row.originalBudgetDate) ||
          (row.revisionHistory && row.revisionHistory.length > 0);

        if (!hasPersistedBudget) return null;

        const isEditing = editingRowKey === row.key;

        if (isEditing) {
          return (
            <Space>
              <Tooltip title="Save">
                <Button
                  type="link"
                  icon={<CheckOutlined />}
                  onClick={saveEdit}
                  className="budget-action-btn budget-action-btn--save budget-action-btn--active"
                />
              </Tooltip>
              <Tooltip title="Cancel">
                <Button
                  type="link"
                  icon={<CloseOutlined />}
                  onClick={cancelEdit}
                  className="budget-action-btn budget-action-btn--cancel budget-action-btn--active"
                />
              </Tooltip>
            </Space>
          );
        }

        return (
          <Space>
            <Tooltip title="Edit budget">
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => startEdit(row)}
                className="budget-action-btn budget-action-btn--edit"
              />
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  const handleSaveAll = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      await loadModulesForProject(selectedProjectId);
      notify.success("Budgets refreshed.");
    } finally {
      setLoading(false);
    }
  };

  const openDocsModal = async (row: TableRow) => {
    if (!selectedProjectId || row.isModule) return;

    const activityCode = row.activityCode;
    const activityName = row.activityName;
    const moduleName = row.moduleName || "";

    const docs = await db.getActivityBudgetDocs(
      String(selectedProjectId),
      activityCode
    );

    setDocModalActivity({ activityCode, activityName, moduleName });
    setDocModalDocs(docs);
    setDocName("");
    setDocFile(null);
    setDocModalVisible(true);
  };

  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setDocFile(f);
  };

  const handleSaveDoc = async () => {
    if (!selectedProjectId || !docModalActivity) {
      notify.error("Project / activity missing.");
      return;
    }
    const name = docName.trim();
    if (!name) {
      notify.error("Please enter document name.");
      return;
    }
    if (!docFile) {
      notify.error("Please select a file.");
      return;
    }

    try {
      const base64 = await readFileAsDataUrl(docFile);
      const path = `activity-budget/${selectedProjectId}/${docModalActivity.activityCode}/${Date.now()}-${docFile.name}`;

      await db.addDiskEntry(path, base64);

      const userRaw = localStorage.getItem("user");
      const user = userRaw ? JSON.parse(userRaw) : null;

      const nowIso = new Date().toISOString();

      await db.addActivityBudgetDoc({
        projectId: String(selectedProjectId),
        activityCode: docModalActivity.activityCode,
        activityName: docModalActivity.activityName,
        moduleName: docModalActivity.moduleName,
        name,
        filePath: path,
        uploadedAt: nowIso,
        uploadedBy: user?.name || undefined,
      });

      const updated = await db.getActivityBudgetDocs(
        String(selectedProjectId),
        docModalActivity.activityCode
      );
      setDocModalDocs(updated);
      setDocName("");
      setDocFile(null);
      notify.success("Document saved.");
    } catch (e) {
      console.error(e);
      notify.error("Failed to save document.");
    }
  };

  const handlePreviewDoc = async (doc: ActivityBudgetDocument) => {
    const content = await db.getDiskEntry(doc.filePath);
    if (!content) {
      notify.error("File not found.");
      return;
    }
    setDocPreviewContent(content);
    setDocPreviewVisible(true);
  };

  const handleDownloadDoc = async (doc: ActivityBudgetDocument) => {
    const content = await db.getDiskEntry(doc.filePath);
    if (!content) {
      notify.error("File not found.");
      return;
    }
    downloadBase64File(content, doc.name || "document");
  };

  const handleDeleteDoc = async (doc: ActivityBudgetDocument) => {
    try {
      if (doc.id != null) {
        await db.deleteActivityBudgetDoc(doc.id);
      }
      if (doc.filePath) {
        await db.deleteDiskEntry(doc.filePath);
      }
      if (selectedProjectId && docModalActivity) {
        const updated = await db.getActivityBudgetDocs(
          String(selectedProjectId),
          docModalActivity.activityCode
        );
        setDocModalDocs(updated);
      }
      notify.success("Document deleted.");
    } catch (e) {
      console.error(e);
      notify.error("Failed to delete document.");
    }
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const downloadBase64File = (base64: string, filename: string) => {
    try {
      const [meta, data] = base64.split(",");
      const mimeMatch = meta.match(/:(.*?);/);
      const mime = mimeMatch?.[1] || "application/octet-stream";

      const binary = atob(data);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);

      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      notify.error("Failed to download file.");
    }
  };

  const historyModalData = useMemo(() => {
    if (!historyModalRow) return [];
    const rows: {
      key: string;
      type: string;
      amount: number | null;
      date: string | null;
    }[] = [];

    if (
      typeof historyModalRow.originalBudget === "number" ||
      historyModalRow.originalBudgetDate
    ) {
      rows.push({
        key: "original",
        type: "Original",
        amount: historyModalRow.originalBudget ?? null,
        date: historyModalRow.originalBudgetDate ?? null,
      });
    }

    (historyModalRow.revisionHistory || []).forEach((h, idx) => {
      rows.push({
        key: `rev-${idx}`,
        type: `Revision #${idx + 1}`,
        amount: h.amount,
        date: h.date,
      });
    });

    return rows;
  }, [historyModalRow]);

  return (
    <div className="budget-main-container">
      <div className="budget-heading budget-heading--top">
        <div className="budget-heading-left">
          <p className="page-heading-title">Activity Budget</p>
            <span className="pl-subtitle">Set and revise activity budgets module-wise</span>
        </div>

        <div className="budget-heading-right">
          <div className="budget-field">
            <div className="budget-field-label">Project</div>
            <Select
              value={selectedProjectId ?? undefined}
              onChange={handleProjectChange}
              className="budget-field-control"
            >
              {projects.map((p) => (
                <Option key={p.id} value={String(p.id)}>
                  {p.projectParameters?.projectName || p.name}
                </Option>
              ))}
            </Select>
          </div>

          <div className="budget-field">
            <div className="budget-field-label">Version</div>
            <div className="budget-field-value">
              {timelineInfo ? timelineInfo.version : "-"}
            </div>
          </div>

          <div className="budget-field">
            <div className="budget-field-label">Status</div>
            <div className="budget-field-value">
              {timelineInfo ? timelineInfo.status : "-"}
            </div>
          </div>

          <div className="budget-field">
            <div className="budget-field-label">Updated At</div>
            <div className="budget-field-value">
              {timelineInfo ? dayjs(timelineInfo.updatedAt).format("DD-MM-YYYY HH:mm") : "-"}
            </div>
          </div>

          <div className="budget-field budget-field--button">
            <Button
              size="middle"
              type="primary"
              icon={<PlusCircleOutlined />}
              disabled={!selectedActivityRow}
              onClick={() => {
                if (!selectedActivityRow) {
                  notify.error("Please select an activity row first.");
                  return;
                }
                openRevisionModal(selectedActivityRow);
              }}
              className="budget-add-revision-btn"
            >
              Add Revision
            </Button>
          </div>
        </div>
      </div>
      
      <div className="budget-table-container">
        <Table<TableRow>
          columns={renderColumns()}
          dataSource={tableData}
          rowKey="key"
          pagination={false}
          bordered
          loading={loading}
          size="small"
          expandable={{
            expandedRowKeys: expandedKeys,
            onExpand: (expanded, record) => {
              setExpandedKeys((prev) =>
                expanded ? [...prev, record.key] : prev.filter((k) => k !== record.key)
              );
            },
            rowExpandable: (record: any) => record.isModule && !!record.children?.length,
          }}
          rowClassName={(record) =>
            record.isModule
              ? "module-header"
              : record.key === selectedActivityRow?.key
                ? "activity-row activity-row--selected"
                : "activity-row"
          }
          onRow={(record) => ({
            onClick: () => {
              if (record.isModule) return;
              setSelectedActivityRow((prev) => (prev?.key === record.key ? null : record));
            },
          })}
          scroll={{ x: true, y: "calc(100vh - 260px)" }}
          className="budget-table"
        />
      </div>

      <div className="budget-footer">
        <Button
          type="primary"
          className="save-button"
          onClick={handleSaveAll}
          disabled={!selectedProjectId}
        >
          Save
        </Button>
      </div>

      <Modal
        open={docModalVisible}
        title={
          docModalActivity
            ? `Documents – ${docModalActivity.activityName} (${docModalActivity.activityCode})`
            : "Documents"
        }
        onCancel={() => setDocModalVisible(false)}
        footer={null}
        width="50%"
        className="modal-container"
      >
        <div className="budget-docs-modal-body">
          <Table<ActivityBudgetDocument>
            dataSource={docModalDocs}
            rowKey="id"
            size="small"
            pagination={false}
            bordered
            className="budget-docs-table"
            columns={[
              { title: "Name", dataIndex: "name", key: "name" },
              {
                title: "Uploaded At",
                dataIndex: "uploadedAt",
                key: "uploadedAt",
                width: 160,
                render: (val: string) => (val ? dayjs(val).format("DD-MM-YYYY HH:mm") : "-"),
              },
              {
                title: "Uploaded By",
                dataIndex: "uploadedBy",
                key: "uploadedBy",
                width: 140,
                render: (v: string) => v || "-",
              },
              {
                title: "Actions",
                key: "actions",
                width: 170,
                render: (_: any, rec: ActivityBudgetDocument) => (
                  <Space>
                    <Button size="small" icon={<EyeOutlined />} onClick={() => handlePreviewDoc(rec)} />
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownloadDoc(rec)}
                    />
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteDoc(rec)}
                    />
                  </Space>
                ),
              },
            ]}
          />

          <div className="budget-docs-uploader">
            <div className="budget-docs-uploader-row">
              <Input
                placeholder="Document name"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                className="budget-docs-name-input"
              />

              <Button
                icon={<UploadOutlined />}
                onClick={() => document.getElementById("activity-doc-file-input")?.click()}
                className="budget-docs-choose-btn"
              >
                {docFile ? "Change file" : "Choose file"}
              </Button>

              <span className="budget-docs-file-name">
                {docFile ? docFile.name : "No file selected"}
              </span>

              <Button
                type="primary"
                size="small"
                onClick={handleSaveDoc}
                className="budget-docs-save-btn"
              >
                Save
              </Button>
            </div>

            <input
              id="activity-doc-file-input"
              type="file"
              className="budget-docs-hidden-file"
              onChange={handleDocFileChange}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={docPreviewVisible}
        onCancel={() => setDocPreviewVisible(false)}
        footer={null}
        width="80%"
        title="Preview Document"
        className="modal-container"
      >
        <div className="budget-preview-wrap">
          {docPreviewContent?.startsWith("data:application/pdf") ? (
            <iframe src={docPreviewContent} title="PDF Preview" className="budget-preview-iframe" />
          ) : docPreviewContent?.startsWith("data:image/") ? (
            <img src={docPreviewContent} alt="Document Preview" className="budget-preview-img" />
          ) : (
            <p className="budget-preview-fallback">Preview not available. Download to view.</p>
          )}
        </div>
      </Modal>

      <Modal
        open={revisionModalVisible}
        onCancel={resetRevision}
        onOk={handleRevisionSave}
        className="modal-container"
        okText="Save"
        title={
          revisionRow
            ? `Add Revision – ${revisionRow.activityName} (${revisionRow.activityCode})`
            : "Add Revision"
        }
      >
        <Space direction="vertical" className="budget-revision-form">
          <Text>Revised Budget (₹)</Text>
          <InputNumber<number>
            min={0}
            precision={0}
            parser={numericParser}
            value={revisionValue ?? undefined}
            onChange={(v) => setRevisionValue(v ?? null)}
            className="budget-revision-input"
          />

          <Text>Revision Date</Text>
          <DatePicker
            format="DD-MM-YYYY"
            value={revisionDate}
            onChange={(value) => setRevisionDate(value)}
            disabledDate={(current) => (current ? current > dayjs().endOf("day") : false)}
            className="budget-revision-date"
          />
        </Space>
      </Modal>

      <Modal
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        footer={null}
        width="40%"
        className="modal-container"
        title={
          historyModalRow
            ? `Budget History – ${historyModalRow.activityName} (${historyModalRow.activityCode})`
            : "Budget History"
        }
      >
        <div className="budget-history-body">
          {historyModalData.length ? (
            <Table
              size="small"
              bordered
              pagination={false}
              rowKey="key"
              dataSource={historyModalData}
              className="budget-history-table"
              columns={[
                { title: "Type", dataIndex: "type", key: "type", width: 120 },
                {
                  title: "Amount (₹)",
                  dataIndex: "amount",
                  key: "amount",
                  width: 120,
                  render: (val: number | null) =>
                    typeof val === "number" ? val.toLocaleString("en-IN") : "-",
                },
                {
                  title: "Date",
                  dataIndex: "date",
                  key: "date",
                  render: (val: string | null) => (val ? dayjs(val).format("DD-MM-YYYY HH:mm") : "-"),
                },
              ]}
            />
          ) : (
            <p className="budget-history-empty">No history available.</p>
          )}
        </div>
      </Modal>

      <ToastContainer />
    </div>
  );

};

export default ActivityBudget;
