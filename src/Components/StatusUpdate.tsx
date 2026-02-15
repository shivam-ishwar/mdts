import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/status-update.css";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { FolderOpenOutlined, SaveOutlined } from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { Button, Select, Modal, Input, Table, DatePicker, List, Typography, Form, Row, Col, Tag, Space, Tooltip, Tabs, Spin } from "antd";
import { ClockCircleOutlined, CloseCircleOutlined, DeleteOutlined, DollarOutlined, DownloadOutlined, EditOutlined, EyeOutlined, FileSyncOutlined, FileTextOutlined, FormOutlined, InfoCircleOutlined, LikeOutlined, PlusOutlined, ReloadOutlined, ShareAltOutlined, SyncOutlined, UploadOutlined } from "@ant-design/icons";
import eventBus from "../Utils/EventEmitter";
import { db } from "../Utils/dataStorege.ts";
import { getCurrentUser } from '../Utils/moduleStorage';
import TextArea from "antd/es/input/TextArea";
import { ToastContainer } from 'react-toastify';
import { notify } from "../Utils/ToastNotify.tsx";
import { UserOutlined } from '@ant-design/icons';
import customParseFormat from "dayjs/plugin/customParseFormat";
import type { ActivityBudget, ActivityCost } from "../Utils/dataStorege";

dayjs.extend(customParseFormat);
interface Activity {
  code: string;
  activityName: string;
  prerequisite: string;
  slack: string;
  level: string;
  duration: number;
  start: string | null;
  end: string | null
  activityStatus: string | null;
  actualStart?: string | null;
  actualFinish?: string | null;
  actualDuration?: number;
}

interface Module {
  parentModuleCode: string;
  moduleName: string;
  activities: Activity[];
}

const { Option } = Select;
const { TabPane } = Tabs;


export const StatusUpdate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedKeys, setExpandedKeys] = useState<any>([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [sequencedModules, setSequencedModules] = useState<Module[]>([]);
  const [dataSource, setDataSource] = useState<any>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProjectTimeline, setSelectedProjectTimeline] = useState<any>([]);
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [allVersions, setAllVersions] = useState<any>();
  const [isReviseModalOpen, setIsReviseModalOpen] = useState(false);
  const [reviseRemarks, setReviseRemarks] = useState("");
  const [selectedActivityKey, setSelectedActivityKey] = useState<any>(null);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [editNoteId, setEditNoteId] = useState<string | null>(null);
  const [openCostCalcModal, setOpenCostCalcModal] = useState(false);
  const [form] = Form.useForm();
  const [_formValid, setFormValid] = useState(false);
  const [replaneMode, setIsReplanMode] = useState(false);
  const [discardReplaneMode, setIsDiscardReplanMode] = useState(false);
  const [confirmReplan, setConfirmReplan] = useState(false);
  const [userOptions, setUserOptions] = useState<any>([]);
  const [openResponsibilityModal, setOpenResponsibilityModal] = useState(false);
  const [raciForm] = Form.useForm();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isEditUser, setIsEditUser] = useState(false);
  const [isStatusUpdateMode, setIsStatusUpdateMode] = useState(false);
  const [editedUserId, setEditedUserId] = useState(selectedProjectTimeline?.assignedUserId);
  const [docModalVisible, setDocModalVisible] = useState(false);
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [selectedActivityDocs, setSelectedActivityDocs] = useState<any[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [docMilestone, setDocMilestone] = useState("");
  const [docActivity, setDocActivity] = useState("");
  const [docNameOptions, setDocNameOptions] = useState<string[]>([]);
  const [addNameOpen, setAddNameOpen] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [docTypeOptions, setDocTypeOptions] = useState<any[]>([]);
  const [addTypeOpen, setAddTypeOpen] = useState(false);
  const [newDocType, setNewDocType] = useState("");
  const [description, setDescription] = useState<string>("");
  const [docForm] = Form.useForm();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [costInfoOpen, setCostInfoOpen] = useState(false);
  const [costInfoData, _setCostInfoData] = useState<any | null>(null);
  const [detailsActiveTab, setDetailsActiveTab] = useState<string>('notes');
  const [activityBudget, setActivityBudget] = useState<ActivityBudget | null>(null);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [activityCost, setActivityCost] = useState<ActivityCost | null>(null);
  const [costLoading, setCostLoading] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [activityDetailsVisible, setActivityDetailsVisible] = useState(false);
  const userMap = useMemo(
    () => Object.fromEntries(userOptions.map((u: any) => [u.id, u.name])),
    [userOptions]
  );


  useEffect(() => {
    const fetchUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (currentUser && currentUser.orgId) {
      defaultSetup();
    }
  }, [currentUser]);

  useEffect(() => {
    if (location.state && location.state.currentProject) {
      const selectedActiveProject = location.state.currentProject;
      if (selectedActiveProject?.id) {
        setSelectedProjectId(selectedActiveProject.id);
        setSelectedProject(selectedActiveProject);
        if (selectedActiveProject?.projectTimeline && Array.isArray(selectedActiveProject.projectTimeline)) {
          handleLibraryChange(selectedActiveProject.projectTimeline);
        } else if (selectedActiveProject?.initialStatus?.items && Array.isArray(selectedActiveProject.initialStatus.items)) {
          handleLibraryChange(selectedActiveProject.initialStatus.items.filter(
            (item: any) => item?.status?.toLowerCase() !== "completed"
          ));
        }
      }
      setTimeout(() => navigate(".", { replace: true }), 0);
    }
  }, [location.state]);

  useEffect(() => {
    if (openCostCalcModal && selectedActivityKey) {
      const activity = findActivityByKey(dataSource, selectedActivityKey);
      if (activity?.cost) {
        form.setFieldsValue({
          projectCost: activity.cost.projectCost,
          opCost: activity.cost.opCost
        });
      }
    }
  }, [openCostCalcModal, selectedActivityKey]);

  useEffect(() => {
    if (openResponsibilityModal && selectedActivityKey) {
      const activity = findActivityByKey(dataSource, selectedActivityKey);
      if (activity?.raci) {
        raciForm.setFieldsValue({
          responsible: activity.raci.responsible,
          accountable: activity.raci.accountable,
          consulted: activity.raci.consulted || [],
          informed: activity.raci.informed || []
        });
      }
    }
  }, [openResponsibilityModal, selectedActivityKey]);

  useEffect(() => {
    if (replaneMode) {
      const updated = dataSource.map((item: any) => {
        const recursiveUpdate = (activity: any): any => {
          if (activity.fin_status == 'yetToStart') {
            if (activity.actualStart) {
              activity.plannedStart = activity.actualStart;
            }
            if (activity.actualFinish) {
              activity.plannedFinish = activity.actualFinish;
            }
            if (activity.expectedDuration) {
              activity.duration = activity.expectedDuration;
            }
          }

          if (activity.children) {
            activity.children = activity.children.map((child: any) =>
              recursiveUpdate(child)
            );
          }

          return activity;
        };

        return recursiveUpdate(item);
      });

      setDataSource(updated);
    }

  }, [replaneMode]);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleOpenCostCalcModal = () => setOpenCostCalcModal(true);

  const handleCancel = () => {
    setIsModalOpen(false);
    setEmail("");
  };

  const getProjectTimeline = async (project: any) => {
    if (Array.isArray(project?.projectTimeline)) {
      try {
        const latestVersionId = localStorage.getItem("latestProjectVersion");

        const foundTimeline = project.projectTimeline.filter(
          (item: any) => item.version == latestVersionId
        );

        const timelineId =
          !latestVersionId || foundTimeline.length == 0
            ? project.projectTimeline[0].timelineId
            : foundTimeline[0].timelineId;

        const timeline = await db.getProjectTimelineById(timelineId);
        if (timeline[0]?.orgId != currentUser.orgId) return;
        if (!Array.isArray(timeline)) {
          console.warn("Timeline is not an array or is undefined", timeline);
          return [];
        }

        const finTimeline = timeline.map(({ id, ...rest }: any) => rest);
        return finTimeline;
      } catch (err) {
        console.error("Error fetching timeline:", err);
        return [];
      }
    }

    if (Array.isArray(project?.initialStatus?.items)) {
      return project.initialStatus.items.filter(
        (item: any) => item?.status?.toLowerCase() !== "completed"
      );
    }

    return [];
  };

  const defaultSetup = async () => {
    try {
      const storedData: any = (await db.getProjects()).filter((p) => p.orgId == currentUser.orgId);
      setAllProjects(storedData);

      const allUsers = (await db.getUsers()).filter((u) => u.orgId == currentUser.orgId);
      setUserOptions(allUsers);

      let selectedProject = null;
      const lastVisitedProjectId = localStorage.getItem("selectedProjectId");

      if (storedData.length == 1) {
        selectedProject = storedData[0];
      } else if (lastVisitedProjectId) {
        selectedProject = storedData.find((p: any) => p.id == lastVisitedProjectId) || null;
      }

      if (selectedProject) {
        setSelectedProjectId(selectedProject.id);
        setSelectedProject(selectedProject);

        const timelineData = await getProjectTimeline(selectedProject);
        handleLibraryChange(timelineData);
      } else {
        handleLibraryChange([]);
      }

      const projectTimeline = selectedProject?.projectTimeline || [];

      const latestVersionId = localStorage.getItem("latestProjectVersion");
      const extractedTimelines = projectTimeline.map((version: any) => ({
        versionId: version.timelineId,
        version: version.version,
        status: version.status,
        addedBy: version.addedBy,
        addedByUserId: version.userGuiId,
        addedUserEmail: version.addedUserEmail,
        currentStatus: version.currentStatus ? version.currentStatus : '',
        createdAt: version.createdAt || new Date().toISOString(),
        updatedAt: version.updatedAt || new Date().toISOString(),
        approver: version.approver || null,
        timelineId: version.timelineId || null,
        revisedByLog: version.revisedByLog || null,
      }));

      setAllVersions(extractedTimelines);
      if (extractedTimelines.length > 0) {
        const selectedTimeline = latestVersionId
          ? extractedTimelines.find((timeline: any) => timeline.version == latestVersionId) || extractedTimelines[0]
          : extractedTimelines[0];

        setSelectedVersionId(latestVersionId ?? extractedTimelines[0].versionId);
        setSelectedProjectTimeline(selectedTimeline);
      } else {
        console.warn("No project timeline data available.");
      }
    } catch (error) {
      console.error("An unexpected error occurred while fetching projects:", error);
    }
  };

  const handleProjectChange = async (projectId: any) => {
    setSelectedActivityKey(null);
    setSelectedProjectId(projectId);
    const project = allProjects.find((p) => p.id == projectId);
    localStorage.setItem('selectedProjectId', projectId);
    if (project?.projectTimeline?.length > 0) {
      setSelectedProjectTimeline(project.projectTimeline[0]);
    }

    defaultSetup();
    if (!project?.projectTimeline?.length) {
      return;
    }

    const timelineId = project.projectTimeline[0].timelineId;

    const timeline = await db.getProjectTimelineById(timelineId);
    const finTimeline = timeline.map(({ id, ...rest }: any) => rest);
    setSelectedProject(project);
    if (project?.projectTimeline) {
      handleLibraryChange(finTimeline);
    } else {
      handleLibraryChange([]);
    }
  };

  const handleDownload = async () => {
    const workbook: any = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Project Report");
    const currentUser = getCurrentUser();
    const titleStyle = {
      font: { bold: true, size: 16, color: { argb: "004d99" } },
      alignment: { horizontal: "center", vertical: "middle" },
    };

    const subtitleStyle = {
      font: { bold: true, size: 12, color: { argb: "333333" } },
      alignment: { horizontal: "center", vertical: "middle" },
    };

    const tableHeaderStyle = {
      font: { bold: true, size: 12, color: { argb: "FFFFFF" } },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "258790" } },
      alignment: { horizontal: "center", vertical: "middle" },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      },
    };

    const moduleHeaderStyle = {
      font: { bold: true, size: 12, color: { argb: "000000" } },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "DDDDDD" } },
      alignment: { horizontal: "left", vertical: "middle" },
    };

    const dataRowStyle = {
      font: { size: 11 },
      alignment: { horizontal: "left", vertical: "middle" },
      border: { top: { style: "thin" }, bottom: { style: "thin" } },
    };

    worksheet.mergeCells("B1:G1");
    const projectTitle = worksheet.getCell("B1");
    projectTitle.value = `Project Report: ${selectedProject?.projectParameters.projectName}`;
    projectTitle.font = titleStyle.font;
    projectTitle.alignment = titleStyle.alignment;

    worksheet.mergeCells("B2:G2");
    const companyTitle = worksheet.getCell("B2");
    companyTitle.value = `Company: ${currentUser.company}`;
    companyTitle.font = subtitleStyle.font;
    companyTitle.alignment = subtitleStyle.alignment;

    worksheet.mergeCells("B3:G3");
    const timestamp = worksheet.getCell("B3");
    timestamp.value = `Generated On: ${dayjs().format("DD-MM-YYYY HH:mm:ss")}`;
    timestamp.font = { italic: true, size: 12, color: { argb: "555555" } };
    timestamp.alignment = subtitleStyle.alignment;

    worksheet.addRow([]);

    const globalHeader = [
      "Sr No.",
      "Key Activity",
      "Expected Duration (Days)",
      "Actual Duration (Days)",
      "Pre-Requisite",
      "Slack",
      "Planned Start",
      "Planned Finish",
      "Actual Start",
      "Actual Finish",
      "Status",
    ];

    const headerRow = worksheet.addRow(globalHeader);

    headerRow.eachCell((cell: any) => {
      Object.assign(cell, tableHeaderStyle);
    });

    worksheet.getRow(5).height = 25;
    let rowIndex = 6;
    sequencedModules.forEach((module, moduleIndex) => {
      const moduleHeaderRow = worksheet.addRow([
        `Module: ${module.parentModuleCode}`,
        module.moduleName,
        "",
        "",
        "",
        "",
        "",
      ]);

      moduleHeaderRow.eachCell((cell: any) => {
        Object.assign(cell, moduleHeaderStyle);
      });

      const formatDate = (val: any) =>
        val && dayjs(val, ["YYYY-MM-DD", "DD-MM-YYYY"], true).isValid()
          ? dayjs(val, ["YYYY-MM-DD", "DD-MM-YYYY"], true).format("DD-MMM-YYYY")
          : "-";

      const formatStatus = (status: any) =>
        status
          ? status
            .replace(/([a-z])([A-Z])/g, "$1 $2")
            .replace(/^\w/, (c: any) => c.toUpperCase())
          : "-";

      rowIndex++;
      module.activities.forEach((activity, activityIndex) => {
        const row = worksheet.addRow([
          `${moduleIndex + 1}.${activityIndex + 1}`,
          activity.activityName,
          activity.duration || 0,
          activity.actualDuration || 0,
          activity.prerequisite || "-",
          activity.slack || 0,
          formatDate(activity.start),
          formatDate(activity.end),
          formatDate(activity.actualStart),
          formatDate(activity.actualFinish),
          formatStatus(activity.activityStatus),
        ]);

        row.eachCell((cell: any) => {
          Object.assign(cell, dataRowStyle);
        });
        if (activityIndex % 2 == 0) {
          row.eachCell((cell: any) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "F7F7F7" },
            };
          });
        }
        rowIndex++;
      });

      worksheet.addRow([]);
      rowIndex++;
    });

    worksheet.columns = [
      { width: 20 },
      { width: 45 },
      { width: 20 },
      { width: 20 },
      { width: 30 },
      { width: 15 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
    ];

    worksheet.mergeCells(`B${rowIndex + 2}:G${rowIndex + 2}`);
    const createdByRow = worksheet.getCell(`B${rowIndex + 2}`);
    createdByRow.value = `Created by: ${currentUser.name || ""}`;
    createdByRow.font = { italic: true, size: 12, color: { argb: "777777" } };
    createdByRow.alignment = { horizontal: "right", vertical: "middle" };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `${selectedProject?.projectParameters.projectName}.xlsx`);
    notify.success("Download started!");
  };

  const handleShare = () => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      notify.error("Please enter a valid email address.");
      return;
    }
    notify.success(`Shared to ${email}`);
    setIsModalOpen(false);
    setEmail("");
  };

  const timelineKey = (t: any) => String(t?.versionId ?? t?.timelineId ?? "");
  const selectedTimelineKey = () => String(selectedProjectTimeline?.versionId ?? selectedProjectTimeline?.timelineId ?? "");

  const handleApproveTimeline = async () => {
    const selId = selectedTimelineKey();
    if (!selId) return;

    const updatedProjectTimeline = (selectedProject?.projectTimeline || []).map((t: any) =>
      timelineKey(t) === selId ? { ...t, status: "Approved" } : t
    );

    const updatedSelectedProject = {
      ...selectedProject,
      projectTimeline: updatedProjectTimeline,
    };

    await db.updateProject(selectedProjectId, updatedSelectedProject);
    notify.success("Timeline approved successfully");
    setIsApproveModalOpen(false);
    defaultSetup();
  };

  const handleLibraryChange = (libraryItems: any) => {
    if (libraryItems) {
      setSequencedModules(libraryItems);
      let editingRequired = false;
      const finDataSource = libraryItems.map((module: any, moduleIndex: number) => {
        const children = (module.activities || []).map((activity: any, actIndex: number) => {
          if (activity.activityStatus == "completed" || activity.activityStatus == "inProgress") {
            editingRequired = true;
          }

          return {
            key: `activity-${moduleIndex}-${actIndex}`,
            SrNo: module.parentModuleCode,
            Code: activity.code,
            keyActivity: activity.activityName,
            duration: activity.duration ?? "",
            preRequisite: activity.prerequisite ?? "-",
            slack: activity.slack ?? "0",
            plannedStart: activity.start ? dayjs(activity.start).format("DD-MM-YYYY") : "-",
            plannedFinish: activity.end ? dayjs(activity.end).format("DD-MM-YYYY") : "-",
            actualStart: activity.actualStart || null,
            actualFinish: activity.actualFinish || null,
            expectedStart: activity.expectedStart ? dayjs(activity.expectedStart).format("DD-MM-YYYY") : "",
            expectedFinish: activity.expectedFinish ? dayjs(activity.expectedFinish).format("DD-MM-YYYY") : "",
            actualDuration: activity.actualDuration ?? "",
            remarks: activity.remarks ?? "",
            isModule: false,
            activityStatus: activity.activityStatus || "yetToStart",
            fin_status: activity.fin_status || '',
            notes: activity.notes || [],
            raci: activity.raci || {},
            cost: activity.cost || {},
            documents: activity.documents || {},
            activityDocuments: activity?.activityDocuments || {},
            projectCost: activity?.cost?.projectCost || "",
            opCost: activity?.cost?.opCost || "",
            totalCost: (parseInt(activity?.cost?.projectCost) || 0) +
              (parseInt(activity?.cost?.opCost) || 0)
          };
        });

        return {
          key: `module-${moduleIndex}`,
          SrNo: module.parentModuleCode,
          Code: module.parentModuleCode,
          keyActivity: module.moduleName,
          isModule: true,
          children,
        };
      });
      setDataSource(finDataSource);
      setExpandedKeys(finDataSource.map((_: any, index: any) => `module-${index}`));
      if (editingRequired) {
        setIsEditing(true);
      } else {
        setIsEditing(false);
      }
    } else {
      setSequencedModules([]);
      setDataSource([]);
      setIsEditing(false);
    }
  };

  const editTimeBuilder = () => {
    eventBus.emit("updateTab", "/create/timeline-builder");
    navigate("/create/timeline-builder", { state: { selectedProject: selectedProject, selectedTimeline: selectedProjectTimeline } });
  };

  const rePlanTimeline = () => {
    eventBus.emit("updateTab", "/create/timeline-builder");
    setIsReplanMode(true);
    navigate("/create/timeline-builder", {
      state: {
        selectedProject,
        selectedTimeline: selectedProjectTimeline,
        rePlanTimeline: true,
      },
    });
  };

  const getAllActivities = (data: any[]): any[] => {
    const result: any[] = [];
    const traverse = (items: any[]) => {
      for (const item of items) {
        result.push(item);
        if (item.children) traverse(item.children);
      }
    };
    traverse(data);
    return result;
  };

  const renderStatusSelect = (
    status: string,
    record: any,
    dataSource: any[],
    replaneMode?: boolean
  ) => {

    const flatList = getAllActivities(dataSource);

    const isBlockedByPreRequisite = () => {
      if (!record.preRequisite) return false;

      const preReqCodes = record.preRequisite
        .split(',')
        .map((c: string) => c.trim().toLowerCase());

      return preReqCodes.some((code: any) => {
        const act = flatList.find((x) => (x.Code || '').toLowerCase() == code);
        return !act || (act.activityStatus || '').toLowerCase() !== 'completed';
      });
    };

    const isBlockedByChildStatus = () => {
      if (!record.children || !Array.isArray(record.children)) return false;
      return record.children.some((child: any) => {
        const st = (child.activityStatus || '').toLowerCase();
        return st == 'inprogress' || st == 'completed';
      });
    };

    const isBlockedByDependents = () => {
      const currentCode = (record.Code || '').toLowerCase();

      return flatList.some((item) => {
        const preReqs = (item.preRequisite || '')
          .split(',')
          .map((c: string) => c.trim().toLowerCase());

        return preReqs.includes(currentCode) &&
          ['inprogress', 'completed'].includes((item.activityStatus || '').toLowerCase());
      });
    };

    const disabled =
      isBlockedByPreRequisite() ||
      isBlockedByChildStatus() ||
      isBlockedByDependents() ||
      (replaneMode && ["completed", "inProgress"].includes(record.fin_status));

    return (
      <Select
        value={status}
        onChange={(value) => handleFieldChange(value, record.key, "activityStatus")}
        options={[
          { label: "Yet to Start", value: "yetToStart" },
          { label: "In Progress", value: "inProgress" },
          { label: "Completed", value: "completed" },
        ]}
        disabled={disabled}
        className={`status-select ${status}`}
        style={{ width: "130px", fontWeight: "bold" }}
        title={undefined}
      />
    );
  };

  const getWorkingDaysDiff = (start: dayjs.Dayjs, end: dayjs.Dayjs): number => {
    let count = 0;
    let current = start.clone();
    while (current.isBefore(end, 'day') || current.isSame(end, 'day')) {
      const day = current.day();
      if (day !== 0 && day !== 6) {
        count++;
      }
      current = current.add(1, 'day');
    }
    return count - 1;
  };

  function getBusinessDays(start: dayjs.Dayjs, end: dayjs.Dayjs): number {
    let count = 0;
    let current = start.clone();

    while (current.isBefore(end, 'day') || current.isSame(end, 'day')) {
      const day = current.day();
      if (day !== 0 && day !== 5) {
        count++;
      }
      current = current.add(1, 'day');
    }

    return count;
  }

  const baseColumns: ColumnsType = [
    { title: "Sr No", dataIndex: "Code", key: "Code", width: 100, align: "center" },
    {
      title: "Key Activity",
      dataIndex: "keyActivity",
      key: "keyActivity",
      width: 350,
      align: "left",
      render: (_: any, record: any) => {
        const {
          activityStatus,
          keyActivity,
          duration,
          actualStart,
          actualFinish,
          plannedStart,
          plannedFinish,
          isModule,
        } = record;

        // ⬇️ If it's a module row, just show text (no icons)
        if (isModule) {
          return (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontWeight: 600,
              }}
            >
              {keyActivity}
            </span>
          );
        }

        const plannedStartDate = plannedStart
          ? dayjs(plannedStart, "DD-MM-YYYY")
          : null;
        const actualStartDate = actualStart
          ? dayjs(actualStart, "DD-MM-YYYY")
          : null;
        const plannedFinishDate = plannedFinish
          ? dayjs(plannedFinish, "DD-MM-YYYY")
          : null;
        const actualFinishDate = actualFinish
          ? dayjs(actualFinish, "DD-MM-YYYY")
          : null;

        let iconSrc = "";
        const isStartSame =
          plannedStartDate &&
          actualStartDate &&
          plannedStartDate.isSame(actualStartDate, "day");
        const isFinishSame =
          plannedFinishDate &&
          actualFinishDate &&
          plannedFinishDate.isSame(actualFinishDate, "day");
        const isWithinPlannedDuration =
          plannedStartDate &&
          plannedFinishDate &&
          actualStartDate &&
          getBusinessDays(actualStartDate, dayjs()) <=
          getBusinessDays(plannedStartDate, plannedFinishDate);

        if (activityStatus === "completed") {
          const isCompletedOnTime = isStartSame && isFinishSame;
          iconSrc = isCompletedOnTime
            ? "/images/icons/completed.png"
            : "/images/icons/overdue.png";
        } else if (activityStatus === "inProgress") {
          iconSrc = isWithinPlannedDuration
            ? "/images/icons/inprogress.png"
            : "/images/icons/overdue.png";
        } else {
          iconSrc = "/images/icons/yettostart.png";
        }

        return (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: "pointer",
            }}
            onClick={() => {
              // only for activity rows
              if (record.duration !== undefined) {
                setSelectedActivityKey((prevKey: any) =>
                  prevKey === record.key ? null : record.key
                );
              }
            }}
          >

            <span
              onClick={(e) => openActivityDetails(record, e)}
              title="View Activity Details"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                cursor: "pointer",
              }}
            >
              <InfoCircleOutlined style={{ fontSize: 20, color: "#1890ff" }} />
            </span>

            {/* Status icon */}
            {duration ? (
              <img
                src={iconSrc}
                alt={activityStatus}
                style={{ width: 34, height: 34 }}
              />
            ) : (
              <span style={{ width: 34, height: 34 }} />
            )}

            {keyActivity}
          </span>
        );
      },
    },
    {
      title: "Duration",
      dataIndex: "duration",
      key: "duration",
      width: 80,
      align: "center",
      render: (_, record) => `${record.duration ? record.duration : ''}`
    },
    { title: "Pre-Requisite", dataIndex: "preRequisite", key: "preRequisite", width: 120, align: "center" },
    { title: "Slack", dataIndex: "slack", key: "slack", width: 80, align: "center" },
    { title: "Planned Start", dataIndex: "plannedStart", key: "plannedStart", width: 120, align: "center" },
    { title: "Planned Finish", dataIndex: "plannedFinish", key: "plannedFinish", width: 120, align: "center" }
  ];

  const editingColumns: ColumnsType = [
    {
      title: "Actual/Expected Duration",
      key: "durations",
      width: 200,
      align: "center",
      render: (_, record) => {
        const { actualStart, actualFinish, expectedDuration, duration, activityStatus, isModule } = record;

        const start = actualStart && dayjs(actualStart, 'DD-MM-YYYY').isValid()
          ? dayjs(actualStart, 'DD-MM-YYYY')
          : null;
        const finish = actualFinish && dayjs(actualFinish, 'DD-MM-YYYY').isValid()
          ? dayjs(actualFinish, 'DD-MM-YYYY')
          : null;

        const calculatedDuration = start && finish ? getWorkingDaysDiff(start, finish) : null;

        const displayDuration = expectedDuration ?? calculatedDuration ?? duration;

        const isEditable =
          isEditing && isStatusUpdateMode &&
          !isModule &&
          activityStatus == "inProgress" &&
          !(replaneMode && ["completed", "inProgress"].includes(record.fin_status));
        return isEditable ? (
          <Input
            type="number"
            min={1}
            value={displayDuration}
            onChange={(e) => handleFieldChange(e.target.value, record.key, "expectedDuration")}
            style={{ width: 80 }}
          />
        ) : (
          displayDuration != null ? `${displayDuration}` : ""
        );
      }
    },
    {
      title: "Status",
      dataIndex: "activityStatus",
      key: "activityStatus",
      width: 240,
      align: "center",
      render: (_, record) => {
        const statusNode =
          (isEditing && isStatusUpdateMode && !record.isModule)
            ? renderStatusSelect(record.activityStatus, record, dataSource, replaneMode)
            : getStatusTag(record.activityStatus);

        const isInProgress = String(record.activityStatus || '').toLowerCase() === 'inprogress';
        const delayed = isActivityDelayed(record);

        const projDelayCost = parseMoney(record.projectCost ?? record?.cost?.projectCost);
        const oppCostPerDay = parseMoney(record.opCost ?? record?.cost?.opCost);

        const dd = (isInProgress && delayed) ? delayDaysFor(record) : 0;

        const dependentsImpactSum = (isInProgress && delayed)
          ? impactedDependentsDelayCost(record, dataSource)
          : 0;

        const ownImpact = projDelayCost + (oppCostPerDay * dd);

        const finalSum = ownImpact + dependentsImpactSum;

        const showMoney = isInProgress && delayed;

        const tooltip = showMoney ? (
          <div style={{ minWidth: 240, lineHeight: 1.5 }}>
            <div>Delay Days: <b>{dd}</b></div>
            <div>Dependents Impact Sum: <b>₹{dependentsImpactSum.toLocaleString('en-IN')}</b></div>
            <div>Own Impact: <b>₹{ownImpact.toLocaleString('en-IN')}</b></div>
            <div style={{ borderTop: '1px solid #eee', marginTop: 6, paddingTop: 6 }}>
              Final Sum: <b>₹{finalSum.toLocaleString('en-IN')}</b>
            </div>
          </div>
        ) : null;

        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {statusNode}
            {showMoney && (
              <Tooltip title={tooltip} placement="topRight">
                <Space size={4} style={{ cursor: 'pointer' }}>
                  <DollarOutlined style={{ color: '#e67e22' }} />
                  <Typography.Text strong>
                    ₹{finalSum.toLocaleString('en-IN')}
                  </Typography.Text>
                </Space>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: "Actual / Expected Start",
      dataIndex: "actualStart",
      key: "actualStart",
      width: 180,
      align: "center",
      render: (_, record) => {
        const { actualStart, activityStatus, key, isModule, preRequisite, children, Code, plannedStart } = record;
        const disableDueToReplan =
          replaneMode && ["completed", "inProgress"].includes(record.fin_status)
        const flatList = getAllActivities(dataSource);
        const isBlocked = (() => {
          const isBlockedByPreRequisite = () => {
            if (!preRequisite) return false;
            const preReqCodes = preRequisite.split(',').map((c: string) => c.trim().toLowerCase());
            return preReqCodes.some((code: any) => {
              const act = flatList.find((x) => (x.Code || '').toLowerCase() == code);
              return !act || (act.activityStatus || '').toLowerCase() !== 'completed';
            });
          };

          const isBlockedByChildStatus = () => {
            if (!children || !Array.isArray(children)) return false;
            return children.some((child: any) => {
              const st = (child.activityStatus || '').toLowerCase();
              return st == 'inprogress' || st == 'completed';
            });
          };

          const isBlockedByDependents = () => {
            const currentCode = (Code || '').toLowerCase();
            return flatList.some((item) => {
              const preReqs = (item.preRequisite || '')
                .split(',')
                .map((c: string) => c.trim().toLowerCase());
              return preReqs.includes(currentCode) &&
                ['inprogress', 'completed'].includes((item.activityStatus || '').toLowerCase());
            });
          };

          return isBlockedByPreRequisite() || isBlockedByChildStatus() || isBlockedByDependents();
        })();

        const shouldDisable =
          activityStatus == "yetToStart" || (activityStatus == "completed" && isBlocked);

        return isEditing && isStatusUpdateMode && !isModule ? (
          <DatePicker
            format="DD-MM-YYYY"
            value={
              actualStart && dayjs(actualStart, 'DD-MM-YYYY').isValid()
                ? dayjs(actualStart, 'DD-MM-YYYY')
                : null
            }
            onChange={(date) =>
              handleFieldChange(date ? dayjs(date).format('DD-MM-YYYY') : null, key, "actualStart")
            }
            disabled={shouldDisable || disableDueToReplan}
          />
        ) : (
          actualStart || plannedStart
        );
      },
    },
    {
      title: "Actual / Expected Finish",
      dataIndex: "actualFinish",
      key: "actualFinish",
      width: 180,
      align: "center",
      render: (_, record) => {
        const { actualFinish, activityStatus, key, isModule, preRequisite, children, Code, plannedFinish } = record;
        const disableDueToReplan =
          replaneMode && ["completed", "inProgress"].includes(record.fin_status)
        const flatList = getAllActivities(dataSource);
        const isBlocked = (() => {
          const isBlockedByPreRequisite = () => {
            if (!preRequisite) return false;
            const preReqCodes = preRequisite.split(',').map((c: string) => c.trim().toLowerCase());
            return preReqCodes.some((code: any) => {
              const act = flatList.find((x) => (x.Code || '').toLowerCase() == code);
              return !act || (act.activityStatus || '').toLowerCase() !== 'completed';
            });
          };

          const isBlockedByChildStatus = () => {
            if (!children || !Array.isArray(children)) return false;
            return children.some((child: any) => {
              const st = (child.activityStatus || '').toLowerCase();
              return st == 'inprogress' || st == 'completed';
            });
          };

          const isBlockedByDependents = () => {
            const currentCode = (Code || '').toLowerCase();
            return flatList.some((item) => {
              const preReqs = (item.preRequisite || '')
                .split(',')
                .map((c: string) => c.trim().toLowerCase());
              return preReqs.includes(currentCode) &&
                ['inprogress', 'completed'].includes((item.activityStatus || '').toLowerCase());
            });
          };

          return isBlockedByPreRequisite() || isBlockedByChildStatus() || isBlockedByDependents();
        })();

        const shouldDisable =
          activityStatus == "yetToStart" ||
          activityStatus == "inProgress" ||
          (activityStatus == "completed" && isBlocked);

        return isEditing && isStatusUpdateMode && !isModule ? (
          <DatePicker
            format="DD-MM-YYYY"
            value={
              actualFinish && dayjs(actualFinish, 'DD-MM-YYYY').isValid()
                ? dayjs(actualFinish, 'DD-MM-YYYY')
                : null
            }
            onChange={(date) =>
              handleFieldChange(date ? dayjs(date).format('DD-MM-YYYY') : null, key, "actualFinish")
            }
            disabled={shouldDisable || disableDueToReplan}
          />
        ) : (
          actualFinish || plannedFinish
        );
      },
    }
  ];

  const parseDDMM = (d?: string | null) =>
    d && dayjs(d, 'DD-MM-YYYY').isValid() ? dayjs(d, 'DD-MM-YYYY') : null;

  const parseMoney = (v: any) => {
    if (v == null) return 0;
    const n = typeof v === 'string' ? parseFloat(v.replace(/[, ]/g, '')) : Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const preReqList = (v: any) =>
    String(v?.preRequisite ?? v?.prerequisite ?? '')
      .split(',')
      .map((s: string) => s.trim().toLowerCase())
      .filter(Boolean);

  const plannedWindow = (rec: any) => ({
    ps: parseDDMM(rec.plannedStart),
    pf: parseDDMM(rec.plannedFinish),
  });

  const actualWindow = (rec: any) => ({
    as: parseDDMM(rec.actualStart),
    af: parseDDMM(rec.actualFinish),
  });

  const today = () => dayjs();

  const projectedFinish = (rec: any): dayjs.Dayjs | null => {
    const { as, af } = actualWindow(rec);
    if (af) return af;
    if (!as) return null;

    const dur =
      (rec?.expectedDuration != null ? Number(rec.expectedDuration) : NaN);
    const fallbackDur =
      (rec?.duration != null ? Number(rec.duration) : NaN);

    const useDur = !isNaN(dur) ? dur : (!isNaN(fallbackDur) ? fallbackDur : null);
    if (useDur == null) return null;
    let count = 0;
    let d = as.clone();
    while (count < useDur) {
      d = d.add(1, 'day');
      const wd = d.day();
      if (wd !== 0 && wd !== 6) count++;
    }
    return d;
  };

  const isActivityDelayed = (rec: any): boolean => {
    const { ps, pf } = plannedWindow(rec);
    const { as, af } = actualWindow(rec);
    const now = today();
    const status = (rec.activityStatus || '').toLowerCase();

    if (!ps && !pf) return false;

    if (status === 'completed') {
      if (pf && af && af.isAfter(pf, 'day')) return true;
      if (ps && as && as.isAfter(ps, 'day')) return true;
      return false;
    }

    if (status === 'inprogress') {
      if (pf && now.isAfter(pf, 'day')) return true;
      if (ps && as && as.isAfter(ps, 'day')) return true;

      const proj = projectedFinish(rec);
      if (pf && proj && proj.isAfter(pf, 'day')) return true;

      return false;
    }

    if (status === 'yettostart') {
      if (ps && now.isAfter(ps, 'day')) return true;
      return false;
    }

    return false;
  };

  const flatActivities = (data: any[]): any[] => {
    const out: any[] = [];
    const walk = (items: any[]) => items.forEach(i => {
      if (!i.isModule) out.push(i);
      if (i.children?.length) walk(i.children);
    });
    walk(data);
    return out;
  };

  const impactedDependentsDelayCost = (source: any, dataSource: any[]): number => {
    const flat = flatActivities(dataSource);
    const dd = delayDaysFor(source);
    if (dd <= 0) return 0;

    const srcKey = keyOf(source);
    const q: string[] = [srcKey];
    const seen = new Set<string>([srcKey]);
    let sum = 0;

    while (q.length) {
      const cur = q.shift()!;
      for (const dep of flat) {
        const reqs = preReqList(dep);
        if (reqs.includes(cur)) {
          const k = keyOf(dep);
          if (!seen.has(k)) {
            seen.add(k);
            q.push(k);
            sum += numericOpCost(dep) * dd;
          }
        }
      }
    }
    return sum;
  };

  const numericOpCost = (a: any): number => {
    const v = a?.opCost ?? a?.cost?.opCost ?? 0;
    const n = typeof v === 'string' ? parseFloat(v.replace(/[, ]/g, '')) : Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const blockingFinish = (rec: any): dayjs.Dayjs | null => {
    const { pf } = plannedWindow(rec);
    const { af } = actualWindow(rec);
    if (af) return af;
    const proj = projectedFinish(rec);
    if (proj) return proj;
    return pf || null;
  };

  const delayDaysFor = (rec: any): number => {
    const { pf } = plannedWindow(rec);
    const bf = blockingFinish(rec);
    if (pf && bf && bf.isAfter(pf, 'day')) return getWorkingDaysDiff(pf, bf);
    return 0;
  };

  const keyOf = (a: any) => String(a?.Code || "").toLowerCase();

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'yetToStart':
        return <Tag color="default">Yet to Start</Tag>;
      case 'inProgress':
        return <Tag color="blue">In Progress</Tag>;
      case 'completed':
        return <Tag color="green">Completed</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const finalColumns: ColumnsType = isEditing ? [...baseColumns, ...editingColumns] : baseColumns;
  const handleFieldChange = (value: any, recordKey: any, fieldName: any) => {
    setDataSource((prevData: any) => {
      const today = dayjs();

      const parseDate = (date: string | null | undefined) =>
        date && dayjs(date, 'DD-MM-YYYY').isValid() ? dayjs(date, 'DD-MM-YYYY') : null;

      const addBusinessDays = (start: dayjs.Dayjs, numDays: number): dayjs.Dayjs => {
        let count = 0;
        let date = start.clone();
        while (count < numDays) {
          date = date.add(1, 'day');
          const day = date.day();
          if (day !== 0 && day !== 6) count++;
        }
        return date;
      };

      const businessDaysBetween = (start: dayjs.Dayjs, end: dayjs.Dayjs): number => {
        let count = 0;
        let date = start.clone();
        while (date.isBefore(end, 'day') || date.isSame(end, 'day')) {
          const day = date.day();
          if (day !== 0 && day !== 6) count++;
          date = date.add(1, 'day');
        }
        return count;
      };

      const findActivityByCode = (data: any[], code: string): any | null => {
        for (const item of data) {
          if (item.Code == code) return item;
          if (item.children) {
            const found = findActivityByCode(item.children, code);
            if (found) return found;
          }
        }
        return null;
      };

      const getAllActivities = (data: any[]): any[] => {
        const result: any[] = [];
        const traverse = (items: any[]) => {
          for (const item of items) {
            result.push(item);
            if (item.children) traverse(item.children);
          }
        };
        traverse(data);
        return result;
      };

      const getLatestPreReqFinishDate = (data: any[], preReqCodes: string[]) => {
        const preReqActivities = preReqCodes
          .map((code: any) => findActivityByCode(data, code))
          .filter((item: any) => item && item.actualFinish);

        const dates = preReqActivities
          .map((item: any) => parseDate(item.actualFinish))
          .filter((d: any) => d != null)
          .sort((a: any, b: any) => b!.isAfter(a!) ? 1 : -1);

        return dates[0];
      };

      const updateDeepDependents = (data: any[], updatedCodes: Set<string>): any[] => {
        const flatList = getAllActivities(data);
        const updated = new Set<string>(updatedCodes);

        let changed = true;
        while (changed) {
          changed = false;
          for (const activity of flatList) {
            if (activity.actualStart || !activity.preRequisite) continue;

            const preReq = activity.preRequisite.split(',').map((c: string) => c.trim());
            const allPresent = preReq.every((code: any) =>
              flatList.find((x) => x.Code == code && x.actualFinish)
            );

            if (allPresent && preReq.some((code: any) => updated.has(code))) {
              const latest: any = getLatestPreReqFinishDate(data, preReq);
              const duration = activity.duration ? parseInt(activity.duration, 10) : 0;
              const start = latest.add(1, 'day');
              const finish = addBusinessDays(start, duration);

              activity.actualStart = start.format('DD-MM-YYYY');
              activity.actualFinish = finish.format('DD-MM-YYYY');
              activity.expectedDuration = duration;

              updated.add(activity.Code);
              changed = true;
            }
          }
        }
        return data;
      };

      let updatedCodes = new Set<string>();

      const updatedData = prevData.map((item: any) => {
        const recursiveUpdate = (subItem: any): any => {
          if (subItem.key == recordKey) {
            const plannedStart = parseDate(subItem.plannedStart);
            const plannedFinish = parseDate(subItem.plannedFinish);
            const plannedDuration = subItem.duration ? parseInt(subItem.duration, 10) : 0;
            if (fieldName == 'activityStatus') {
              if (value == 'inProgress' || value == 'completed') {
                if (['inProgress', 'completed'].includes(subItem.fin_status)) {
                  const actualStart = parseDate(subItem.actualStart);
                  const actualFinish = parseDate(subItem.actualFinish);

                  if (actualStart && actualStart.isAfter(today, 'day')) {
                    notify.error(`Cannot mark as '${value}' because actual start date has not reached today's date.`);
                    return subItem;
                  }

                  if (actualFinish && actualFinish.isAfter(today, 'day')) {
                    notify.error(`Cannot mark as '${value}' because actual finish date has not reached today's date.`);
                    return subItem;
                  }

                  subItem.activityStatus = value;
                  updatedCodes.add(subItem.Code);
                  return subItem;
                }

                const alreadyHasDates = subItem.actualStart && subItem.actualFinish;

                const actualStartDate = parseDate(subItem.actualStart);
                const actualFinishDate = parseDate(subItem.actualFinish);

                if (
                  alreadyHasDates &&
                  subItem.fin_status == 'completed' &&
                  value == 'inProgress' &&
                  actualStartDate &&
                  actualFinishDate &&
                  actualFinishDate.isBefore(today, 'day')
                ) {
                  subItem.actualFinish = today.format('DD-MM-YYYY');
                  subItem.expectedDuration = businessDaysBetween(actualStartDate, today);
                  subItem.activityStatus = value;
                  updatedCodes.add(subItem.Code);
                  return subItem;
                }

                if (alreadyHasDates && subItem.fin_status == 'completed') {
                  subItem.activityStatus = value;
                  updatedCodes.add(subItem.Code);
                  return subItem;
                }

                const preReqCodes = subItem.preRequisite
                  ? subItem.preRequisite.split(',').map((code: any) => code.trim())
                  : [];
                const latestPreReqFinish = getLatestPreReqFinishDate(prevData, preReqCodes);

                let tempStart = latestPreReqFinish ? latestPreReqFinish.add(1, 'day') : plannedStart;
                const plannedDuration = subItem.duration ? parseInt(subItem.duration, 10) : 0;

                if (
                  (tempStart && tempStart.isAfter(today, 'day')) ||
                  (value == 'completed' &&
                    tempStart &&
                    plannedDuration >= 0 &&
                    addBusinessDays(tempStart, plannedDuration).isAfter(today, 'day'))
                ) {
                  notify.error(`Cannot mark as '${value}' when actual dates exceed today's date.`);
                  return subItem;
                }

                subItem.actualStart = tempStart?.format('DD-MM-YYYY') || null;

                if ((value == 'inProgress') && tempStart && tempStart.isBefore(today, 'day')) {
                  const daysTillToday = businessDaysBetween(tempStart, today);
                  const effectiveDuration = Math.max(daysTillToday, plannedDuration);
                  const newFinish = addBusinessDays(tempStart, effectiveDuration);
                  subItem.actualFinish = newFinish.format('DD-MM-YYYY');
                  subItem.expectedDuration = effectiveDuration;
                } if ((value == 'completed') && tempStart) {
                  const duration = subItem.expectedDuration ?? plannedDuration;
                  const newFinish = addBusinessDays(tempStart, duration);
                  subItem.actualFinish = newFinish.format('DD-MM-YYYY');
                  subItem.expectedDuration = duration;
                }
                else {
                  const tempFinish = tempStart && plannedDuration >= 0
                    ? addBusinessDays(tempStart, plannedDuration)
                    : null;
                  subItem.actualFinish = tempFinish?.format('DD-MM-YYYY') || null;
                  subItem.expectedDuration = plannedDuration;
                }

                subItem.activityStatus = value;
                updatedCodes.add(subItem.Code);
              }

              else if (value == 'yetToStart') {
                const alreadyHasDates = subItem.actualStart && subItem.actualFinish;

                subItem.expectedDuration = plannedDuration;
                subItem.activityStatus = value;
                if (!alreadyHasDates || !['inProgress', 'completed'].includes(subItem.fin_status)) {
                  subItem.actualStart = plannedStart?.format('DD-MM-YYYY') || null;
                  subItem.actualFinish = plannedFinish?.format('DD-MM-YYYY') || null;
                  updatedCodes.add(subItem.Code);
                } else {
                  updatedCodes.add(subItem.Code);
                }
              }
            } else if (fieldName == 'actualStart') {
              const newStart = parseDate(value);
              const preReqCodes = subItem.preRequisite
                ? subItem.preRequisite.split(',').map((c: string) => c.trim())
                : [];
              const latestPreReqFinish = getLatestPreReqFinishDate(prevData, preReqCodes);

              if (
                latestPreReqFinish &&
                newStart &&
                (newStart.isBefore(latestPreReqFinish, 'day') || newStart.isSame(latestPreReqFinish, 'day'))
              ) {
                notify.error(`Actual start date cannot be before or on prerequisite completion date.`);
                return subItem;
              }

              if (newStart && newStart.isAfter(today, 'day')) {
                notify.error(`Actual start date cannot be in the future.`);
                return subItem;
              }
              if (
                subItem.activityStatus == 'completed' &&
                newStart &&
                subItem.expectedDuration != null
              ) {
                const newCalculatedFinish = addBusinessDays(newStart, subItem.expectedDuration);
                if (newCalculatedFinish.isAfter(today, 'day')) {
                  notify.error(`Cannot change actual start — it pushes actual finish beyond today's date for a completed activity.`);
                  return subItem;
                }
              }
              subItem.actualStart = value;
              if (newStart && subItem.expectedDuration != null) {
                subItem.actualFinish = addBusinessDays(newStart, subItem.expectedDuration).format('DD-MM-YYYY');
              }

            } else if (fieldName == 'actualFinish') {
              const newFinish = parseDate(value);
              const existingFinish = parseDate(subItem.actualFinish);

              if (newFinish && newFinish.isAfter(today, 'day')) {
                notify.error(`Actual finish date cannot be in the future.`);
                return subItem;
              }
              if (
                subItem.activityStatus == 'completed' &&
                existingFinish &&
                newFinish &&
                newFinish.isBefore(existingFinish, 'day')
              ) {
                notify.error(`Cannot reduce actual finish date for a completed activity.`);
                return subItem;
              }

              subItem.actualFinish = value;

              const start = parseDate(subItem.actualStart);
              if (start && newFinish) {
                const dur = businessDaysBetween(start, newFinish);
                subItem.expectedDuration = dur >= 0 ? dur : null;
              }

            } else if (fieldName == 'expectedDuration') {
              const duration = parseInt(value, 10);
              subItem.expectedDuration = duration;

              const actualStart = parseDate(subItem.actualStart);

              if (actualStart && dayjs(actualStart).isValid() && !isNaN(duration)) {
                const newFinish = addBusinessDays(actualStart, duration);
                subItem.actualFinish = newFinish.format('DD-MM-YYYY');
              } else {
                subItem.actualFinish = null;
              }
            } else {
              subItem[fieldName] = value;
            }

            const actualStart = parseDate(subItem.actualStart);
            const actualFinish = parseDate(subItem.actualFinish);
            if (
              subItem.activityStatus == 'inProgress' &&
              actualStart &&
              actualFinish &&
              actualFinish.isBefore(today, 'day')
            ) {
              const newFinish = today;
              const dur = businessDaysBetween(actualStart, newFinish);
              if (subItem.expectedDuration != null && dur < subItem.expectedDuration) {
                notify.error(`Cannot reduce duration by updating actual finish to today.`);
              } else {
                subItem.actualFinish = newFinish.format('DD-MM-YYYY');
                subItem.expectedDuration = dur >= 0 ? dur : null;
                updatedCodes.add(subItem.Code);
              }
            }

            return subItem;
          } else if (subItem.children) {
            return {
              ...subItem,
              children: subItem.children.map((child: any) => recursiveUpdate(child)),
            };
          }
          return subItem;
        };

        return recursiveUpdate(item);
      });

      return updateDeepDependents(updatedData, updatedCodes);
    });
  };

  const handleUpdateStatus = () => {
    setIsEditing(true);
    setIsStatusUpdateMode(true);
  };

  const handleSaveStatus = async () => {
    let isValid = true;
    let errorMessage = "";

    dataSource.some((module: any) => {
      if (module.children) {
        return module.children.some((activity: any) => {
          const { activityStatus, actualStart, actualFinish } = activity;

          if (activityStatus == "inProgress" && !actualStart) {
            errorMessage = `Activity ${activity.keyActivity} is IN-PROGRESS but Actual Start is missing.`;
            isValid = false;
            return true;
          }

          if (activityStatus == "completed") {
            if (!actualStart && !actualFinish) {
              errorMessage = `Activity ${activity.keyActivity} is COMPLETED but Actual Start and Actual Finish are missing.`;
            } else if (!actualStart) {
              errorMessage = `Activity ${activity.keyActivity} is COMPLETED but Actual Start is missing.`;
            } else if (!actualFinish) {
              errorMessage = `Activity ${activity.keyActivity} is COMPLETED but Actual Finish is missing.`;
            }

            if (errorMessage) {
              isValid = false;
              return true;
            }
          }
          return false;
        });
      }
      return false;
    });

    if (!isValid) {
      notify.error(`${errorMessage}`);
      return;
    }

    if (!sequencedModules.length || !dataSource.length) return;

    const updatedActivityMap = new Map();
    dataSource.forEach((module: any) => {
      module.children.forEach((activity: any) => {
        updatedActivityMap.set(activity.Code, {
          actualStart: activity.actualStart,
          actualFinish: activity.actualFinish,
          activityStatus: activity.activityStatus,
          fin_status: activity.activityStatus,
        });
      });
    });

    const updatedSequencedModules = sequencedModules.map((module: any) => ({
      ...module,
      activities: module.activities.map((activity: any) => ({
        ...activity,
        ...(updatedActivityMap.has(activity.code) ? updatedActivityMap.get(activity.code) : {}),
      })),
    }));

    setSequencedModules(updatedSequencedModules);
    let updatedProject = selectedProject;
    updatedProject.projectTimeline = updatedSequencedModules;
    await db.updateProjectTimeline(selectedProjectTimeline.versionId || selectedProjectTimeline.timelineId, updatedSequencedModules);
    defaultSetup();
    setIsStatusUpdateMode(false);
    notify.success(`Status updated successfully!`);
  };

  const getProjectTimelineById = (id: any) => {
    const data = selectedProject.projectTimeline.filter((item: any) => item.timelineId == id);
    if (data.length > 0) {
      setSelectedProjectTimeline(data[0]);
      localStorage.setItem("latestProjectVersion", data[0].version);
    } else {
      console.warn("No matching timeline found for id:", id);
    }
  };

  const handleChangeVersionTimeline = async (id: any) => {
    const timelineData = await db.getProjectTimelineById(id);
    getProjectTimelineById(id);
    handleLibraryChange(timelineData);
  }

  const handleReviseConfirm = async () => {
    const oldUserId = selectedProjectTimeline?.addedByUserId;
    const newUserId = editedUserId ? editedUserId : oldUserId;
    const revisedLog = {
      oldUserId,
      newUserId,
      revisedBy: currentUser.id,
      revisedByName: currentUser.name,
      remarks: reviseRemarks,
      revisedAt: new Date().toISOString()
    };
    const updatedTimeline = {
      ...selectedProjectTimeline,
      status: "Revised",
      revisedByLog: revisedLog,
      assignedUserId: newUserId,
      updatedAt: new Date().toISOString()
    };
    const updatedProject = {
      ...selectedProject,
      projectTimeline: selectedProject.projectTimeline.map((t: any) =>
        t.timelineId == updatedTimeline.timelineId ? updatedTimeline : t
      )
    };
    await db.updateProject(selectedProjectId, updatedProject);
    notify.success("Timeline revised and user reassigned");
    setIsReviseModalOpen(false);
    defaultSetup();
  };

  const selectedNotes = useMemo(() => {
    const findNotes = (items: any[]): any[] | undefined => {
      for (const item of items) {
        if (item.key == selectedActivityKey) {
          return item.notes ?? [];
        }
        if (item.children?.length) {
          const found = findNotes(item.children);
          if (found !== undefined) return found;
        }
      }
      return undefined;
    };
    return findNotes(dataSource) ?? [];
  }, [selectedActivityKey, dataSource]);

  const handleSaveNote = async () => {
    const timestamp = new Date();
    const newNote = {
      id: editNoteId || Date.now().toString(),
      text: noteInput.trim(),
      updatedAt: timestamp,
      createdAt: editNoteId ? undefined : timestamp,
      createdBy: selectedProjectTimeline?.addedBy,
    };

    const updatedDataSource = (prev: any[]): any[] =>
      prev.map(item => {
        if (item.key == selectedActivityKey) {
          const notes = item.notes || [];
          const updatedNotes = editNoteId
            ? notes.map((n: any) => (n.id == editNoteId ? { ...n, ...newNote } : n))
            : [...notes, newNote];
          return { ...item, notes: updatedNotes };
        }
        if (item.children) return { ...item, children: updatedDataSource(item.children) };
        return item;
      });

    const newDataSource = updatedDataSource(dataSource);
    setDataSource(newDataSource);

    const updatedNoteMap = new Map();
    newDataSource.forEach((module: any) => {
      module.children.forEach((activity: any) => {
        if (activity.notes) {
          updatedNoteMap.set(activity.Code, activity.notes);
        }
      });
    });

    const updatedSequencedModules = sequencedModules.map((module: any) => ({
      ...module,
      activities: module.activities.map((activity: any) => ({
        ...activity,
        ...(updatedNoteMap.has(activity.code) ? { notes: updatedNoteMap.get(activity.code) } : {}),
      })),
    }));

    setSequencedModules(updatedSequencedModules);
    let updatedProject = selectedProject;
    updatedProject.projectTimeline = updatedSequencedModules;
    await db.updateProjectTimeline(selectedProjectTimeline.versionId || selectedProjectTimeline.timelineId, updatedSequencedModules);
    setNoteInput('');
    setEditNoteId(null);
    setNoteModalVisible(false);
    notify.success(`Note ${editNoteId ? 'updated' : 'added'} successfully!`);
  };

  const handleDeleteNote = async (noteId: string) => {
    const updatedDataSource = (prev: any[]): any[] =>
      prev.map(item => {
        if (item.key == selectedActivityKey) {
          const notes = item.notes?.filter((n: any) => n.id !== noteId) || [];
          return { ...item, notes };
        }
        if (item.children) return { ...item, children: updatedDataSource(item.children) };
        return item;
      });

    const newDataSource = updatedDataSource(dataSource);
    setDataSource(newDataSource);

    const updatedNoteMap = new Map();
    newDataSource.forEach((module: any) => {
      module.children.forEach((activity: any) => {
        if (activity.notes) {
          updatedNoteMap.set(activity.Code, activity.notes);
        }
      });
    });

    const updatedSequencedModules = sequencedModules.map((module: any) => ({
      ...module,
      activities: module.activities.map((activity: any) => ({
        ...activity,
        ...(updatedNoteMap.has(activity.code) ? { notes: updatedNoteMap.get(activity.code) } : {}),
      })),
    }));

    setSequencedModules(updatedSequencedModules);
    let updatedProject = selectedProject;
    updatedProject.projectTimeline = updatedSequencedModules;
    await db.updateProjectTimeline(
      selectedProjectTimeline.versionId || selectedProjectTimeline.timelineId,
      updatedSequencedModules
    );

    notify.success(`Note deleted successfully!`);
  };

  const handleClose = () => {
    setOpenCostCalcModal(false);
    form.resetFields();
    setFormValid(false);
  };

  const handleValuesChange = () => {
    const { projectCost, opCost, delayCost } = form.getFieldsValue();
    if (projectCost && opCost && delayCost) {
      setFormValid(true);
    } else {
      setFormValid(false);
    }
  };

  const showResponsibilityModal = () => {
    setOpenResponsibilityModal(true);
  };

  const handleCloseResponsibility = () => {
    setOpenResponsibilityModal(false);
    raciForm.resetFields();
  };

  const handleRaciChange = async () => {
    try {
      await raciForm.validateFields();
      setFormValid(true);
    } catch {
      setFormValid(false);
    }
  };

  const findActivityByKey = (list: any[], key: string): any => {
    for (const item of list) {
      if (item.key == key) return item;
      if (item.children) {
        const result = findActivityByKey(item.children, key);
        if (result) return result;
      }
    }
    return null;
  };

  const handleConfirm = async () => {
    try {
      const values = await form.validateFields();

      const updatedDataSource = (prev: any[]): any[] =>
        prev.map(item => {
          if (item.key == selectedActivityKey) {
            return {
              ...item,
              cost: {
                projectCost: values.projectCost,
                opCost: values.opCost
              }
            };
          }
          if (item.children) return { ...item, children: updatedDataSource(item.children) };
          return item;
        });

      const newDataSource = updatedDataSource(dataSource);
      setDataSource(newDataSource);

      const updatedCostMap = new Map();
      newDataSource.forEach((module: any) => {
        module.children.forEach((activity: any) => {
          if (activity.cost) {
            updatedCostMap.set(activity.Code, activity.cost);
          }
        });
      });

      const updatedSequencedModules = sequencedModules.map((module: any) => ({
        ...module,
        activities: module.activities.map((activity: any) => ({
          ...activity,
          ...(updatedCostMap.has(activity.code) ? { cost: updatedCostMap.get(activity.code) } : {})
        }))
      }));

      setSequencedModules(updatedSequencedModules);

      let updatedProject = selectedProject;
      updatedProject.projectTimeline = updatedSequencedModules;

      await db.updateProjectTimeline(
        selectedProjectTimeline.versionId || selectedProjectTimeline.timelineId,
        updatedSequencedModules
      );

      form.resetFields();
      setOpenCostCalcModal(false);
      notify.success("Cost updated successfully!");
    } catch (error) {
      console.error("Validation Failed:", error);
    }
  };

  const handleConfirmResponsibility = async () => {
    try {
      const values = await raciForm.validateFields();

      const updatedDataSource = (prev: any[]): any[] =>
        prev.map(item => {
          if (item.key == selectedActivityKey) {
            return {
              ...item,
              raci: {
                responsible: values.responsible,
                accountable: values.accountable,
                consulted: values.consulted || [],
                informed: values.informed || []
              }
            };
          }
          if (item.children) return { ...item, children: updatedDataSource(item.children) };
          return item;
        });

      const newDataSource = updatedDataSource(dataSource);
      setDataSource(newDataSource);

      const updatedRaciMap = new Map();
      newDataSource.forEach((module: any) => {
        module.children.forEach((activity: any) => {
          if (activity.raci) {
            updatedRaciMap.set(activity.Code, activity.raci);
          }
        });
      });

      const updatedSequencedModules = sequencedModules.map((module: any) => ({
        ...module,
        activities: module.activities.map((activity: any) => ({
          ...activity,
          ...(updatedRaciMap.has(activity.code) ? { raci: updatedRaciMap.get(activity.code) } : {})
        }))
      }));

      setSequencedModules(updatedSequencedModules);

      let updatedProject = selectedProject;
      updatedProject.projectTimeline = updatedSequencedModules;

      await db.updateProjectTimeline(
        selectedProjectTimeline.versionId || selectedProjectTimeline.timelineId,
        updatedSequencedModules
      );

      raciForm.resetFields();
      setOpenResponsibilityModal(false);
      notify.success("Responsibilities updated successfully!");
    } catch (error) {
      console.error("Validation Failed:", error);
    }
  };

  const handlesaveReplan = async () => {
    try {
      const currentUser = getCurrentUser();
      const currentTimestamp = new Date().toISOString();

      const createTimelineEntry = (timelineId: string, version: string) => ({
        timelineId,
        status: "pending",
        version,
        addedBy: currentUser.name,
        addedUserEmail: currentUser.email,
        createdAt: currentTimestamp,
        updatedAt: currentTimestamp,
      });

      const updatedSequencedModules = sequencedModules.map((mod: any) => {
        const updatedActivities = mod.activities.map((act: any) => {
          if (act.fin_status == "yetToStart") {
            return {
              ...act,
              start: act.actualStart
                ? dayjs(act.actualStart, "DD-MM-YYYY").toISOString()
                : act.start,
              end: act.actualFinish
                ? dayjs(act.actualFinish, "DD-MM-YYYY").toISOString()
                : act.end,
              duration: act.expectedDuration || act.duration,
            };
          }
          return act;
        });

        return {
          ...mod,
          activities: updatedActivities,
        };
      });

      const createdTimeLineId: any = await db.addProjectTimeline(updatedSequencedModules);
      const existingTimeline = selectedProject.projectTimeline || [];
      const newVersion = `${existingTimeline.length + 1}.0`;
      localStorage.setItem("latestProjectVersion", newVersion);

      let updatedTimeline = [...existingTimeline];
      if (existingTimeline.length > 0) {
        const lastIndex = existingTimeline.length - 1;
        updatedTimeline[lastIndex] = {
          ...updatedTimeline[lastIndex],
          status: "replanned",
        };
      }

      const updatedProjectWithTimeline = {
        ...selectedProject,
        projectTimeline: [
          ...updatedTimeline,
          createTimelineEntry(createdTimeLineId, newVersion),
        ],
        processedTimelineData: sequencedModules,
      };

      await db.updateProject(selectedProject.id, updatedProjectWithTimeline);
      notify.success("Replanned timeline saved successfully!");
      navigate(".", { replace: true });
      setIsReplanMode(false);
      setConfirmReplan(false);
      defaultSetup();

    } catch (error) {
      console.error("Error saving replanned timeline:", error);
      notify.error("Failed to save replanned timeline. Please try again.");
    }
  };

  const resetDocModalState = () => {
    docForm.resetFields();
    setDocName("");
    setDocType("");
    setDocFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setNewDocName("");
  };

  const uniqueNames = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));

  const handleOpenDocumentsModal = (activityKey: string) => {
    setSelectedActivityKey(activityKey);

    let activity: any = null;
    let parentModule: any = null;

    if (Array.isArray(dataSource)) {
      for (const mod of dataSource) {
        if (String(mod?.key) === String(activityKey)) {
          activity = mod;
          parentModule = mod;
          break;
        }
        if (Array.isArray(mod?.children)) {
          const child = mod.children.find((c: any) => String(c?.key) === String(activityKey)) || null;
          if (child) {
            activity = child;
            parentModule = mod;
            break;
          }
        }
      }
    }


    let docs: any[] = Array.isArray(activity?.documents) ? activity.documents : [];

    if ((!docs || docs.length === 0) && activity) {
      const actCode = activity?.Code ?? activity?.code ?? null;
      if (actCode && Array.isArray(sequencedModules)) {
        for (const m of sequencedModules) {
          const a: any = (m.activities || []).find(
            (x: any) => String(x.Code ?? x.code) === String(actCode)
          );
          if (a && Array.isArray(a.documents)) {
            docs = a.documents;
            break;
          }
        }
      }
    }

    setSelectedActivityDocs(Array.isArray(activity?.activityDocuments) ? activity.activityDocuments : []);
    setDocMilestone(parentModule?.keyActivity || parentModule?.moduleName || parentModule?.SrNo || "");
    setDocActivity(activity?.keyActivity || activity?.activityName || "");
    setDocNameOptions(uniqueNames((docs || []).map((d: any) => d)));
    setDocName("");
    setDocType("");
    setDocFile(null);

    setDocModalVisible(true);
  };

  const onAddNewDocName = async () => {
    const v = newDocName.trim();
    if (!v) {
      setAddNameOpen(false);
      return;
    }

    if (!docNameOptions.includes(v)) {
      const next = [...docNameOptions, v];
      setDocNameOptions(next);
    }
    setDocName(v);

    if (!selectedActivityKey) {
      setNewDocName("");
      setAddNameOpen(false);
      return;
    }

    const updatedDataSource = (Array.isArray(dataSource) ? dataSource : []).map((module: any) => {
      if (!Array.isArray(module?.children)) {
        if (String(module?.key) === String(selectedActivityKey)) {
          const existingDocs: string[] = Array.isArray(module?.documents) ? module.documents : [];
          const merged = uniqueNames([...existingDocs, v]);
          return { ...module, documents: merged };
        }
        return module;
      }
      return {
        ...module,
        children: module.children.map((child: any) => {
          if (String(child?.key) !== String(selectedActivityKey)) return child;
          const existingDocs: string[] = Array.isArray(child?.documents) ? child.documents : [];
          const merged = uniqueNames([...existingDocs, v]);
          return { ...child, documents: merged };
        }),
      };
    });

    setDataSource(updatedDataSource);

    const docsMap = new Map<string, string[]>();
    updatedDataSource.forEach((module: any) => {
      const kids = Array.isArray(module?.children) ? module.children : [module];
      kids.forEach((act: any) => {
        const docs: string[] = Array.isArray(act?.documents) ? act.documents : [];
        const code = act?.Code ?? act?.code;
        if (code && docs.length) docsMap.set(String(code), docs);
      });
    });

    const updatedSequencedModules = (Array.isArray(sequencedModules) ? sequencedModules : []).map((module: any) => ({
      ...module,
      activities: (module?.activities || []).map((act: any) => {
        const code = String(act?.Code ?? act?.code ?? "");
        return code && docsMap.has(code) ? { ...act, documents: docsMap.get(code) } : { ...act };
      }),
    }));

    setSequencedModules(updatedSequencedModules);

    try {
      await db.updateProjectTimeline(
        selectedProjectTimeline?.versionId || selectedProjectTimeline?.timelineId,
        updatedSequencedModules
      );
    } catch (e) {
      console.error("Failed to update timeline with new doc name:", e);
      notify.error("Could not persist the new name. Try again.");
    }

    setNewDocName("");
    setAddNameOpen(false);
  };

  const handleSaveDocument = async () => {
    if (
      !docFile ||
      !docName ||
      !docType ||
      !docMilestone ||
      !docActivity ||
      !selectedActivityKey ||
      !selectedProjectId ||
      !description
    ) {
      notify.error("All fields and file upload are required.");
      return;
    }

    const fileId = Date.now().toString();
    const filePath = `documents/${fileId}`;
    await saveFileToDisk(docFile, fileId);

    const activity = findActivityByKey(dataSource, selectedActivityKey);
    if (!activity) return;

    const newDoc = {
      id: fileId,
      projectId: selectedProjectId,
      moduleCode: activity.SrNo,
      milestone: docMilestone,
      activityCode: activity.Code,
      activityName: docActivity,
      linkedActivity: activity.keyActivity,
      documentName: docName,
      documentType: docType,
      description: description,
      fileName: docFile.name,
      filePath,
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser?.name || "Unknown",
    };

    const updatedDataSource = dataSource.map((module: any) => {
      if (!Array.isArray(module.children)) return module;
      return {
        ...module,
        children: module.children.map((child: any) => {
          if (child.key !== selectedActivityKey) return child;
          const existing = Array.isArray(child.activityDocuments) ? child.activityDocuments : [];
          return { ...child, activityDocuments: [...existing, newDoc] };
        }),
      };
    });

    setDataSource(updatedDataSource);

    const updatedMap = new Map<string, any[]>();
    updatedDataSource.forEach((module: any) => {
      (module.children || []).forEach((act: any) => {
        const docs = Array.isArray(act.activityDocuments) ? act.activityDocuments : [];
        const actCode: string | undefined = act.Code ?? act.code;
        if (actCode && docs.length) updatedMap.set(String(actCode), docs);
      });
    });

    const updatedSequencedModules = (sequencedModules || []).map((module: any) => ({
      ...module,
      activities: (module.activities || []).map((act: any) => {
        const key = String(act.Code ?? act.code ?? "");
        return key && updatedMap.has(key)
          ? { ...act, activityDocuments: updatedMap.get(key) }
          : { ...act };
      }),
    }));

    setSequencedModules(updatedSequencedModules);

    await db.updateProjectTimeline(
      selectedProjectTimeline.versionId || selectedProjectTimeline.timelineId,
      updatedSequencedModules
    );

    const updatedProjectTimeline = selectedProject.projectTimeline.map((timeline: any) => {
      const tId = timeline.versionId || timeline.timelineId;
      const selId = selectedProjectTimeline.versionId || selectedProjectTimeline.timelineId;
      if (tId === selId) return { ...timeline, data: updatedSequencedModules };
      return timeline;
    });

    const updatedProject = { ...selectedProject, projectTimeline: updatedProjectTimeline };
    await db.updateProject(selectedProjectId, updatedProject);

    notify.success("Document uploaded successfully!");

    const currentActCode = String(activity.Code ?? activity.code ?? "");
    setSelectedActivityDocs(updatedMap.get(currentActCode) || []);

    resetDocModalState();
    setDocModalVisible(false);
  };

  const columns: any = [
    {
      title: "Doc Name",
      dataIndex: "documentName",
      key: "documentName",
      align: "left",
      render: (_: any, r: any) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileTextOutlined />
          <span style={{ fontWeight: 600 }}>
            {r.documentName || r.fileName || "Unnamed Document"}
          </span>
          <Tag>{r.description || "—"}</Tag>
        </div>
      ),
    },
    {
      title: "Type",
      dataIndex: "description",
      key: "description",
      align: "left",
      render: (text: string) => text || "—",
    },
    {
      title: "Uploaded By",
      dataIndex: "uploadedBy",
      key: "uploadedBy",
      align: "left",
      render: (text: string) => text || "—",
    },
    {
      title: "Uploaded At",
      dataIndex: "uploadedAt",
      key: "uploadedAt",
      align: "left",
      render: (text: string) =>
        text ? new Date(text).toLocaleDateString() : "—",
    },
    {
      title: "Actions",
      key: "actions",
      width: 110,
      align: "center",
      render: (_: any, record: any) => (
        <Space size="middle">
          <Tooltip title="Preview">
            <EyeOutlined
              style={{ cursor: "pointer" }}
              onClick={() => handlePreviewDocument(record)}
            />
          </Tooltip>
          <Tooltip title="Download">
            <DownloadOutlined
              style={{ cursor: "pointer" }}
              onClick={() => handleDownloadDocument(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <DeleteOutlined
              style={{ cursor: "pointer", color: "red" }}
              onClick={() => handleDeleteDocument(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  useEffect(() => {
    db.getAllDocTypes().then(setDocTypeOptions);
  }, []);

  const handleDeleteDocument = async (docId: string) => {
    const updatedDocs = (selectedActivityDocs || []).filter(
      (d: any) => String(d.id) !== String(docId)
    );
    setSelectedActivityDocs(updatedDocs);
    const updatedDataSource = (Array.isArray(dataSource) ? dataSource : []).map(
      (module: any) => {
        if (!Array.isArray(module?.children)) return module;

        return {
          ...module,
          children: module.children.map((child: any) => {
            if (String(child?.key) !== String(selectedActivityKey)) return child;

            const docs = Array.isArray(child?.activityDocuments)
              ? child.activityDocuments.filter(
                (d: any) => String(d.id) !== String(docId)
              )
              : [];

            return { ...child, activityDocuments: docs };
          }),
        };
      }
    );
    setDataSource(updatedDataSource);

    const docsMap = new Map<string, any[]>();
    updatedDataSource.forEach((module: any) => {
      (module?.children || []).forEach((act: any) => {
        const code = act?.Code ?? act?.code;
        const docs = Array.isArray(act?.activityDocuments)
          ? act.activityDocuments
          : [];
        if (code) docsMap.set(String(code), docs);
      });
    });

    const updatedSequencedModules = (Array.isArray(sequencedModules)
      ? sequencedModules
      : []
    ).map((module: any) => ({
      ...module,
      activities: (module?.activities || []).map((act: any) => {
        const code = String(act?.Code ?? act?.code ?? "");
        return { ...act, activityDocuments: docsMap.get(code) || [] };
      }),
    }));
    setSequencedModules(updatedSequencedModules);

    await db.updateProjectTimeline(
      selectedProjectTimeline?.versionId ||
      selectedProjectTimeline?.timelineId,
      updatedSequencedModules
    );

    const updatedProjectTimeline = (selectedProject?.projectTimeline || []).map(
      (t: any) => {
        const tId = t?.versionId || t?.timelineId;
        const selId =
          selectedProjectTimeline?.versionId ||
          selectedProjectTimeline?.timelineId;
        return tId === selId ? { ...t, data: updatedSequencedModules } : t;
      }
    );

    const updatedProject = {
      ...(selectedProject || {}),
      projectTimeline: updatedProjectTimeline,
    };
    if (selectedProjectId) {
      await db.updateProject(selectedProjectId, updatedProject);
    }

    try {
      const allDocs = await db.getAllDocuments();

      for (const doc of allDocs) {
        const originalFiles = Array.isArray(doc.files) ? doc.files : [];

        const remainingFiles = originalFiles.filter(
          (f: any) => String(f.docId || f.id) !== String(docId)
        );

        if (remainingFiles.length === originalFiles.length) continue;

        if (remainingFiles.length === 0) {
          for (const f of originalFiles) {
            if (f.path) {
              const existing: any = await db.diskStorage
                .where("path")
                .equals(f.path)
                .first();
              if (existing) {
                await db.diskStorage.delete(existing.id ?? existing.path);
              }
            }
          }

          await db.deleteDocument(doc.id ?? doc.guid);
        } else {
          await db.documents.update(doc.id, {
            files: remainingFiles,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.error("Failed to sync global documents on delete:", err);
    }

    notify.success("Document deleted everywhere.");
  };

  const handlePreviewDocument = async (doc: any) => {
    const file: any = await db.diskStorage.where("path").equals(doc.filePath).first();
    if (file?.content) {
      setPreviewContent(file.content);
      setPreviewVisible(true);
    } else {
      notify.error("Preview failed. File not found.");
    }
  };

  async function saveFileToDisk(file: File, fileId: string) {
    const reader = new FileReader();
    reader.onload = async function () {
      const base64 = reader.result as string;
      const filePath = `documents/${fileId}`;
      const existing = await db.diskStorage.where("path").equals(filePath).first();
      if (!existing) {
        await db.diskStorage.add({ path: filePath, content: base64 });
      }
    };
    reader.readAsDataURL(file);
  }

  const handleDownloadDocument = async (doc: any) => {
    if (!doc?.filePath) {
      notify.error("Invalid file path.");
      return;
    }

    const file: any = await db.diskStorage.where("path").equals(doc.filePath).first();

    const content = file?.content;
    if (!content) {
      notify.error("Download failed. File not found.");
      return;
    }

    const a = document.createElement("a");
    a.href = content;
    a.download = doc.fileName || doc.documentName || "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const onAddNewDocType = async () => {
    const name = newDocType.trim();
    if (!name) {
      notify.warning("Please enter a type name");
      return;
    }

    try {
      const exists = docTypeOptions.some(
        (t: any) => String(t.name).toLowerCase() === name.toLowerCase()
      );
      if (exists) {
        setDocType(name);
        setNewDocType("");
        setAddTypeOpen(false);
        notify.info("Type already exists, selected it.");
        return;
      }

      // 1️⃣ Add to IndexedDB
      const id = await db.addDocType(name);

      // 2️⃣ Reload full list from IndexedDB
      const list = await db.getAllDocTypes(); // [{ id, name }]
      setDocTypeOptions(list);

      // 3️⃣ Get the added record & select it in the dropdown
      const added = await db.docTypes.get(id);
      setDocType(added?.name || name);

      // 4️⃣ Reset modal state
      setNewDocType("");
      setAddTypeOpen(false);
      notify.success("Type added");
    } catch (e: any) {
      console.error("Failed to add doc type", e);
      notify.error(e?.message || "Failed to add type");
    }
  };

  const openActivityDetails = async (record: any, e?: any) => {
    if (e) e.stopPropagation();

    setSelectedActivityKey(record.key);
    setSelectedActivity(record);
    setActivityDetailsVisible(true);
    setNoteInput('');
    setEditNoteId(null);

    // reset previous data
    setActivityBudget(null);
    setActivityCost(null);

    if (!selectedProjectId || !record.Code) {
      return;
    }

    try {
      setBudgetLoading(true);
      setCostLoading(true);

      const [budget, cost] = await Promise.all([
        db.getActivityBudget(String(selectedProjectId), String(record.Code)),
        db.getActivityCost(String(selectedProjectId), String(record.Code)),
      ]);

      setActivityBudget(budget);
      setActivityCost(cost);
    } catch (err) {
      console.error("Failed to load activity details", err);
      setActivityBudget(null);
      setActivityCost(null);
    } finally {
      setBudgetLoading(false);
      setCostLoading(false);
    }
  };

  return (
    <>
<div className="status-heading">
  <div className="status-update-header">
    <div>
    <p className="page-heading-title">Status Update</p>
    <span className="pl-subtitle">Update activity progress, actual dates, and execution status</span>
    </div>

    {selectedProject?.projectTimeline != null && (
      <div className="status-approval">
        <span className="status-approval-label">Approval Status:</span>
        <span
          className={
            selectedProjectTimeline?.status?.toLowerCase() === "approved"
              ? "status-approval-value badge badge-success"
              : selectedProjectTimeline?.status?.toLowerCase() === "pending"
              ? "status-approval-value badge badge-warning"
              : selectedProjectTimeline?.status?.toLowerCase() === "replanned"
              ? "status-approval-value badge status-badge-replanned"
              : "status-approval-value badge badge-error"
          }
        >
          {selectedProjectTimeline?.status}
        </span>
      </div>
    )}

    {selectedProject?.projectTimeline != null && (
      <div className="status-times">
        <div className="status-time-row">
          <p className="status-time-label">Created&nbsp;/&nbsp;Updated By</p>
          <p className="status-time-value">{selectedProjectTimeline?.addedBy || "N/A"}</p>
        </div>
        <div className="status-time-row">
          <p className="status-time-label">Created&nbsp;/&nbsp;Updated At</p>
          <p className="status-time-value">
            {selectedProjectTimeline?.createdAt
              ? new Date(selectedProjectTimeline.createdAt).toLocaleString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })
              : "N/A"}
          </p>
        </div>
      </div>
    )}
  </div>
</div>

<div className="main-status-update">
  {allProjects.length !== 0 && (
    <>
      <div className="status-toolbar">
        <div className="select-item">
          <div className="flex-item">
            <label className="label">Project</label>
            <Select
              placeholder="Select Project"
              value={selectedProjectId}
              onChange={handleProjectChange}
              popupMatchSelectWidth={false}
              className="status-select status-project-select"
              disabled={replaneMode}
            >
              {allProjects.map((project) => (
                <Option key={project.id} value={project.id}>
                  {project.projectParameters.projectName}
                </Option>
              ))}
            </Select>
          </div>

          {allVersions?.length > 0 && (
            <div className="flex-item">
              <label className="label">Version</label>
              <Select
                placeholder="Select Version"
                value={{
                  value: selectedVersionId,
                  label: (
                    <span className="status-select-label">
                      {selectedProjectTimeline?.status === "pending" ? (
                        <ClockCircleOutlined className="status-icon status-icon--pending" />
                      ) : selectedProjectTimeline?.status === "replanned" ? (
                        <SyncOutlined className="status-icon status-icon--replanned" />
                      ) : selectedProjectTimeline?.status === "Revised" ? (
                        <EditOutlined className="status-icon status-icon--revised" />
                      ) : selectedProjectTimeline?.status === "amendment pending" ? (
                        <FileSyncOutlined className="status-icon status-icon--amendment" />
                      ) : (
                        <LikeOutlined className="status-icon status-icon--approved" />
                      )}
                      {selectedProjectTimeline?.version}
                    </span>
                  ),
                }}
                onChange={(valueObj) => {
                  const value = valueObj.value;
                  const selectedVersion = allVersions.find((version: any) => version.versionId == value);
                  setSelectedProjectTimeline(selectedVersion);
                  setSelectedVersionId(value);
                  handleChangeVersionTimeline(value);
                  setSelectedActivityKey(null);
                }}
                disabled={replaneMode}
                popupMatchSelectWidth={false}
                className="status-select status-version-select"
                labelInValue
              >
                {allVersions?.map((version: any) => (
                  <Option key={version.versionId} value={version.versionId}>
                    <span className="status-select-option">
                      {version.status === "pending" ? (
                        <ClockCircleOutlined className="status-icon status-icon--pending" />
                      ) : version.status === "replanned" ? (
                        <SyncOutlined className="status-icon status-icon--replanned" />
                      ) : version.status === "amendment pending" ? (
                        <FileSyncOutlined className="status-icon status-icon--amendment" />
                      ) : (
                        <LikeOutlined className="status-icon status-icon--approved" />
                      )}
                      {version.version}
                    </span>
                  </Option>
                ))}
              </Select>
            </div>
          )}
        </div>

        {selectedProject?.projectTimeline != null && (
          <div className="actions">
            <Button
              icon={<UploadOutlined />}
              disabled={!selectedActivityKey}
              onClick={() => handleOpenDocumentsModal(selectedActivityKey)}
              className="project-timeline-btn project-timeline-btn-docs"
            >
              Documents
            </Button>

            <Button
              icon={<DollarOutlined />}
              disabled={!selectedActivityKey}
              onClick={handleOpenCostCalcModal}
              className="project-timeline-btn project-timeline-btn-cost"
            >
              Cost
            </Button>

            <Button
              icon={<UserOutlined />}
              disabled={!selectedActivityKey}
              onClick={showResponsibilityModal}
              className="project-timeline-btn project-timeline-btn-raci"
            >
              RACI
            </Button>

            <Button
              icon={<FormOutlined />}
              disabled={!selectedActivityKey}
              onClick={() => setNoteModalVisible(true)}
              className="project-timeline-btn project-timeline-btn-note"
            >
              Note
            </Button>

            {!replaneMode && (
              <Button
                type="primary"
                disabled={!selectedProjectId}
                icon={<DownloadOutlined />}
                onClick={handleDownload}
                className="project-timeline-btn project-timeline-btn-download"
              >
                Download
              </Button>
            )}

            {selectedProjectTimeline?.status !== "replanned" &&
              !replaneMode &&
              ((selectedProjectTimeline?.revisedByLog?.newUserId == getCurrentUser()?.id ||
                (getCurrentUser()?.guiId && selectedProjectTimeline?.status !== "Pending")) ||
                (!selectedProjectTimeline?.revisedByLog?.newUserId &&
                  selectedProjectTimeline?.userGuiId == getCurrentUser()?.guiId)) && (
                <Button
                  type="primary"
                  disabled={!selectedProjectId}
                  icon={selectedProjectTimeline?.status !== "Approved" ? <EditOutlined /> : <ReloadOutlined />}
                  onClick={selectedProjectTimeline?.status !== "Approved" ? editTimeBuilder : rePlanTimeline}
                  className="project-timeline-btn project-timeline-btn-edit"
                >
                  {selectedProjectTimeline?.status !== "Approved" ? "Edit" : "Replan"}
                </Button>
              )}

            {!replaneMode && (
              <Button
                type="primary"
                disabled={!selectedProjectId}
                icon={<ShareAltOutlined />}
                onClick={showModal}
                className="project-timeline-btn project-timeline-btn-share"
              >
                Share
              </Button>
            )}

            {selectedProjectTimeline?.status == "Approved" && (
              <Button
                type={isStatusUpdateMode ? "primary" : "default"}
                icon={isStatusUpdateMode ? <SaveOutlined /> : <FormOutlined />}
                onClick={isStatusUpdateMode ? handleSaveStatus : handleUpdateStatus}
                className={
                  isStatusUpdateMode
                    ? "project-timeline-btn project-timeline-btn-status-save"
                    : "project-timeline-btn project-timeline-btn-status-update"
                }
              >
                {isStatusUpdateMode ? "Save Status" : "Update Status"}
              </Button>
            )}

            {selectedProjectTimeline?.status !== "Revised" &&
              selectedProjectTimeline?.status != "Approved" &&
              selectedProjectTimeline?.status != "replanned" && (
                <div className="action-btn">
                  <Button
                    type="primary"
                    disabled={!selectedProjectId}
                    onClick={() => setIsReviseModalOpen(true)}
                    className="project-timeline-btn project-timeline-btn-revise"
                  >
                    Revise
                  </Button>
                  <Button
                    type="primary"
                    disabled={!selectedProjectId}
                    onClick={() => setIsApproveModalOpen(true)}
                    className="project-timeline-btn project-timeline-btn-approve"
                  >
                    Approve
                  </Button>
                </div>
              )}
          </div>
        )}
      </div>

      <hr />
    </>
  )}

  {selectedProject?.projectTimeline != null ? (
    <>
      <div className="status-update-items">
        <div className="status-update-table">
          <Table
            columns={finalColumns}
            dataSource={dataSource}
            className="project-timeline-table"
            pagination={false}
            expandable={{
              expandedRowRender: () => null,
              rowExpandable: (record) => record.children && record.children.length > 0,
              expandedRowKeys: expandedKeys,
              onExpand: (expanded, record) => {
                setExpandedKeys(expanded ? [...expandedKeys, record.key] : expandedKeys.filter((key: any) => key !== record.key));
              },
            }}
            rowClassName={(record) => {
              if (record.isModule) return "module-header";
              return record.key == selectedActivityKey ? "activity-row selected-red-row" : "activity-row";
            }}
            bordered
            scroll={{
              x: "max-content",
              y: replaneMode ? "calc(100vh - 290px)" : "calc(100vh - 250px)",
            }}
          />
        </div>

        {replaneMode && (
          <div className="project-timeline-replan-actions">
            <Button
              type="primary"
              disabled={!selectedProjectId}
              icon={<CloseCircleOutlined />}
              onClick={() => setIsDiscardReplanMode(true)}
              className="project-timeline-btn project-timeline-btn-discard"
            >
              Discard
            </Button>
            <Button
              type="primary"
              disabled={!selectedProjectId}
              onClick={() => setConfirmReplan(true)}
              className="project-timeline-btn project-timeline-btn-apply"
            >
              Apply
            </Button>
          </div>
        )}
      </div>
    </>
  ) : (
    <div className="container-msg">
      <div className="no-project-message">
        <FolderOpenOutlined className="project-timeline-empty-icon" />
        {selectedProject?.projectTimeline == null ? (
          <>
            <h3>No Projects Timeline Found</h3>
            <p>You need to create a project for defining a timeline.</p>
            <button
              className="btn btn-primary"
              onClick={() => {
                eventBus.emit("updateTab", "/create/register-new-project");
                navigate(`/create/timeline-builder`);
              }}
            >
              Create Project Timeline
            </button>
          </>
        ) : (
          <>
            <h3>No Project Selected</h3>
            <p>Please select a project to continue.</p>
          </>
        )}
      </div>
    </div>
  )}
</div>


      <Modal
        title="Share Timeline"
        visible={isModalOpen}
        onCancel={handleCancel}
        onOk={handleShare}
        okText="Send"
        okButtonProps={{ className: "bg-secondary" }}
        className="modal-container"
        maskClosable={false}
        keyboard={false}
      >
        <div style={{ padding: "0px 10px", fontWeight: "400", fontSize: "16px" }}>
          <span>Enter recipient's email:</span>
          <Input
            style={{ marginTop: "10px" }}
            type="email"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        title="Project Timeline Confirmation"
        visible={isApproveModalOpen}
        onCancel={() => setIsApproveModalOpen(false)}
        onOk={handleApproveTimeline}
        okText="Yes"
        className="modal-container"
        maskClosable={false}
        keyboard={false}
        okButtonProps={{ className: "bg-secondary" }}
      >
        <div style={{ padding: "0px 10px", fontWeight: "400", fontSize: "16px" }}>
          <p>Are You sure you want to confirm?</p>
        </div>
      </Modal>

      <Modal
        title="Revise Project Timeline"
        visible={isReviseModalOpen}
        onCancel={() => setIsReviseModalOpen(false)}
        onOk={handleReviseConfirm}
        okText="Confirm"
        cancelText="Cancel"
        className="modal-container"
        maskClosable={false}
        keyboard={false}
        okButtonProps={{ danger: true }}
      >
        <div style={{ padding: "0px 20px" }}>
          <div className="times-stamps revise" style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <p style={{ color: "#6c757d", fontWeight: "900", minWidth: "80px" }}>Created By</p>
              <p style={{ fontWeight: "bold", color: "#007bff" }}>
                {selectedProjectTimeline?.addedBy}
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <p style={{ color: "#6c757d", fontWeight: "900", minWidth: "80px" }}>Created At</p>
              <p style={{ fontWeight: "bold", color: "#007bff" }}>
                {new Date(selectedProjectTimeline?.createdAt).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </p>
            </div>
          </div>

          <TextArea
            rows={4}
            value={reviseRemarks}
            onChange={(e) => setReviseRemarks(e.target.value)}
            placeholder="Enter revision notes..."
          />
          <Button
            type="link"
            onClick={() => setIsEditUser(true)}
            style={{ paddingLeft: 0 }}
          >
            Edit User
          </Button>

          {isEditUser && (
            <Form.Item label="Reassign User">
              <Select
                value={editedUserId}
                onChange={(value) => setEditedUserId(value)}
                style={{ width: "100%" }}
                placeholder="Select a user to reassign"
              >
                {userOptions
                  .filter((user: any) =>
                    user.id !== selectedProjectTimeline?.approver?.id &&
                    user.guiId !== selectedProjectTimeline?.addedByUserId
                  )
                  .map((user: any) => (
                    <Select.Option key={user.id} value={user.id}>
                      {user.name}
                    </Select.Option>
                  ))}
              </Select>
            </Form.Item>

          )}

        </div>
      </Modal>

      <Modal
        title="Activity Notes"
        open={noteModalVisible}
        onCancel={() => {
          setNoteModalVisible(false);
          setNoteInput('');
          setEditNoteId(null);
        }}
        width={'60%'}
        footer={null}
        className="modal-container"
        maskClosable={false}
        keyboard={false}
      >
        <div style={{ padding: "10px 24px" }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography.Title level={5}>
              {editNoteId ? "Edit Note" : "Add New Note"}
            </Typography.Title>

            <Button
              type="primary"
              block
              onClick={handleSaveNote}
              disabled={!noteInput.trim()}
              style={{ width: '15%', marginBottom: 8 }}
            >
              {editNoteId ? "Update Note" : "Add Note"}
            </Button>

          </div>

          <Input.TextArea
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Write your note here..."
            rows={4}
          />

          <List
            header={<strong style={{ fontSize: 16 }}>Previous Notes</strong>}
            dataSource={selectedNotes}
            locale={{ emptyText: "No notes available" }}
            itemLayout="horizontal"
            style={{ marginBottom: 20 }}
            renderItem={(item: any) => (
              <List.Item
                style={{ padding: "8px 0" }}
                actions={[
                  <a key="edit" onClick={() => {
                    setNoteInput(item.text);
                    setEditNoteId(item.id);
                  }}>Edit</a>,
                  <a key="delete" onClick={() => handleDeleteNote(item.id)}>Delete</a>
                ]}
              >
                <List.Item.Meta
                  title={
                    <div className="note-meta">
                      {item.createdBy && (
                        <span className="note-author">
                          <UserOutlined />
                          {item.createdBy}
                        </span>
                      )}
                      {(item.createdAt || item.updatedAt) && (
                        <span className="note-timestamp">
                          <ClockCircleOutlined />
                          {dayjs(item.createdAt).format('DD MMM YYYY HH:mm')}
                        </span>
                      )}
                    </div>
                  }
                  description={item.text}
                />
              </List.Item>
            )}
          />
        </div>
      </Modal>

      <Modal
        title="Define Cost for Delay (₹ / Day)"
        open={openCostCalcModal}
        onCancel={handleClose}
        onOk={handleConfirm}
        // okButtonProps={{ disabled: !formValid }}
        destroyOnClose
        className="modal-container"
        maskClosable={false}
        keyboard={false}
      >
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleValuesChange}
          style={{ padding: "0px 10px", display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <Form.Item
            label=""
            style={{ marginBottom: 16 }}
          >
            <Row align="middle" gutter={8}>
              <Col flex="150px">Project Cost</Col>
              <Col flex="auto">
                <Form.Item
                  name="projectCost"
                  noStyle
                  rules={[{ required: true, message: 'Please enter Project Cost' }]}
                >
                  <Input type="number" min={0} placeholder="Enter Project Cost" />
                </Form.Item>
              </Col>
            </Row>
          </Form.Item>

          <Form.Item label="" style={{ marginBottom: 24 }}>
            <Row align="middle" gutter={8}>
              <Col flex="150px">Opportunity Cost</Col>
              <Col flex="auto">
                <Form.Item
                  name="opCost"
                  noStyle
                  rules={[{ required: true, message: 'Please enter OP Cost' }]}
                >
                  <Input type="number" min={0} placeholder="Enter OP Cost" />
                </Form.Item>
              </Col>
            </Row>
          </Form.Item>
        </Form>

      </Modal>

      <Modal
        title="Activity Delay Cost"
        open={costInfoOpen}
        onCancel={() => setCostInfoOpen(false)}
        footer={null}
        className="modal-container"
        maskClosable={false}
        keyboard={false}
      >
        {costInfoData ? (
          <div style={{ padding: "6px 10px" }}>
            <div style={{ marginBottom: 8 }}>
              <strong>Activity:</strong> {costInfoData.name}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", rowGap: 8 }}>
              <div style={{ color: "#6c757d", fontWeight: 700 }}>Project Cost</div>
              <div>₹ {costInfoData.projectCost.toLocaleString("en-IN")}</div>

              <div style={{ color: "#6c757d", fontWeight: 700 }}>Opportunity Cost</div>
              <div>₹ {costInfoData.opCost.toLocaleString("en-IN")}</div>

              <div style={{ color: "#6c757d", fontWeight: 700 }}>Delay Cost / Day</div>
              <div>
                {costInfoData.delayPerDay > 0
                  ? `₹ ${Math.round(costInfoData.delayPerDay).toLocaleString("en-IN")} / day`
                  : <span style={{ color: "#ff4d4f" }}>Not defined</span>}
              </div>

              <div style={{ color: "#6c757d", fontWeight: 700 }}>Delayed Days</div>
              <div>{costInfoData.delayDays} day(s)</div>

              <div style={{ color: "#6c757d", fontWeight: 700 }}>Incurred (till now)</div>
              <div style={{ fontWeight: 700, color: "#d35400" }}>
                ₹ {Math.round(costInfoData.incurred).toLocaleString("en-IN")}
              </div>
            </div>

            {costInfoData.delayPerDay === 0 && (
              <div style={{ marginTop: 12, color: "#8a6d3b" }}>
                Tip: Set “Delay Cost / Day” while defining cost to get accurate incurred value.
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal
        title="Assign Responsibility"
        open={openResponsibilityModal}
        onCancel={handleCloseResponsibility}
        onOk={handleConfirmResponsibility}
        // okButtonProps={{ disabled: !formValid }}
        destroyOnClose
        className="modal-container"
        maskClosable={false}
        keyboard={false}
      >
        <Form
          form={raciForm}
          layout="vertical"
          onValuesChange={handleRaciChange}
          style={{ padding: "0px 10px", display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <Form.Item label="" style={{ marginBottom: 16 }}>
            <Row align="middle" gutter={8}>
              <Col flex="150px">Responsible</Col>
              <Col flex="auto">
                <Form.Item
                  name="responsible"
                  noStyle
                  rules={[{ required: true, message: 'Please select a Responsible person' }]}
                >
                  <Select placeholder="Select Responsible">
                    {userOptions.map((user: any) => (
                      <Select.Option key={user.id} value={user.id}>{user.name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Form.Item>

          <Form.Item label="" style={{ marginBottom: 16 }}>
            <Row align="middle" gutter={8}>
              <Col flex="150px">Accountable</Col>
              <Col flex="auto">
                <Form.Item
                  name="accountable"
                  noStyle
                  rules={[{ required: true, message: 'Please select an Accountable person' }]}
                >
                  <Select placeholder="Select Accountable">
                    {userOptions.map((user: any) => (
                      <Select.Option key={user.id} value={user.id}>{user.name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Form.Item>

          <Form.Item label="" style={{ marginBottom: 16 }}>
            <Row align="middle" gutter={8}>
              <Col flex="150px">Consulted</Col>
              <Col flex="auto">
                <Form.Item
                  name="consulted"
                  noStyle
                >
                  <Select mode="multiple" placeholder="Select Consulted">
                    {userOptions.map((user: any) => (
                      <Select.Option key={user.id} value={user.id}>{user.name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Form.Item>

          <Form.Item label="" style={{ marginBottom: 24 }}>
            <Row align="middle" gutter={8}>
              <Col flex="150px">Informed</Col>
              <Col flex="auto">
                <Form.Item
                  name="informed"
                  noStyle
                >
                  <Select mode="multiple" placeholder="Select Informed">
                    {userOptions.map((user: any) => (
                      <Select.Option key={user.id} value={user.id}>{user.name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Confirm Discard Changes"
        visible={discardReplaneMode}
        onOk={() => {
          setIsDiscardReplanMode(false);
          setIsReplanMode(false);
          defaultSetup();
        }}
        onCancel={() => {
          setIsDiscardReplanMode(false);
        }}
        okText="Yes, Discard"
        cancelText="Cancel"
        className="modal-container"
        maskClosable={false}
        keyboard={false}
        okButtonProps={{ className: "bg-secondary" }}
      >
        <p style={{ padding: "10px" }}>
          Are you sure you want to discard? Any unsaved changes will be lost.
        </p>
      </Modal>

      <Modal
        title="Confirm Replan"
        visible={confirmReplan}
        onOk={() => {
          handlesaveReplan();
        }}
        onCancel={() => {
          setConfirmReplan(false);
        }}
        okText="Confirm"
        cancelText="Cancel"
        className="modal-container"
        maskClosable={false}
        keyboard={false}
        okButtonProps={{ className: "bg-secondary" }}
      >
        <p style={{ padding: "10px" }}>
          Are you sure you want to submit?
        </p>
      </Modal>

      <Modal
        title="Activity Documents"
        open={docModalVisible}
        onCancel={() => setDocModalVisible(false)}
        footer={null}
        width="100%"
        className="modal-container"
        maskClosable={false}
        keyboard={false}
        destroyOnClose
        afterClose={resetDocModalState}
      >
        <div style={{ padding: "0px 20px 20px 10px" }}>
          <Row gutter={16}>
            <Col xs={24} md={10} lg={12} style={{ height: "500px", overflow: "auto" }}>
              <Form form={docForm} layout="vertical" onFinish={handleSaveDocument}>
                <Form.Item label="Project Name" required>
                  <Input value={selectedProject?.projectParameters?.projectName || ""} disabled />
                </Form.Item>

                <Form.Item label="Milestone Name" required>
                  <Input value={docMilestone} disabled />
                </Form.Item>

                <Form.Item label="Activity Name" required>
                  <Input value={docActivity} disabled />
                </Form.Item>

                <Form.Item label="Document Name" required>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%" }}>
                    <Select
                      value={docName || undefined}
                      onChange={setDocName}
                      placeholder="Select document name"
                      style={{ flex: 1 }}
                      options={docNameOptions.map((o) => ({ label: o, value: o }))}
                      showSearch
                      allowClear
                    />
                    <Button size="small" style={{ padding: "15px" }} onClick={() => setAddNameOpen(true)}>
                      +
                    </Button>
                  </div>
                </Form.Item>

                {/* <Form.Item label="Document Type" required>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%" }}>
                    <Select
                      value={docType || undefined}
                      onChange={setDocType}
                      placeholder="Select document type"
                      style={{ flex: 1 }}
                      options={docTypeOptions.map((o) => ({ label: o, value: o }))}
                      showSearch
                      allowClear
                    />
                    <Button size="small" style={{ padding: "15px" }} onClick={() => setAddTypeOpen(true)}>
                      +
                    </Button>
                  </div>
                </Form.Item> */}

                <Form.Item label={<span style={{ textAlign: "left" }}> Document Type </span>} required labelAlign="left" colon={false}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Select
                      placeholder="Select Document Type"
                      value={docType ?? undefined}
                      onChange={setDocType}
                      style={{ flex: 1, minWidth: 200 }}
                      showSearch
                      options={docTypeOptions.map((dt: any) => ({ label: dt.name, value: dt.name }))}
                      filterOption={(input, option) => String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                    />
                    <Button type="dashed" icon={<PlusOutlined />} onClick={() => setAddTypeOpen(true)} />
                  </div>
                </Form.Item>

                <Form.Item
                  label={<span style={{ textAlign: "left" }}> Description </span>}
                  name="description"
                  rules={[{ required: true, message: "Description is required" }]}
                  labelAlign="left"
                  colon={false}
                >
                  <TextArea rows={4} placeholder="Description" value={description} style={{ marginBottom: "15px" }} onChange={(e) => setDescription(e.target.value)} />
                </Form.Item>
                <Modal
                  title="Add Document Type"
                  open={addTypeOpen}
                  onCancel={() => setAddTypeOpen(false)}
                  onOk={onAddNewDocType}
                  okText="Add"
                  width={420}
                  maskClosable={false}
                  keyboard={false}
                  destroyOnClose
                  afterClose={() => setNewDocType("")}
                >
                  <Form style={{ padding: "10px 20px" }} layout="vertical" onFinish={onAddNewDocType}>
                    <Form.Item label="New Document Type" required>
                      <Input
                        value={newDocType}
                        onChange={(e) => setNewDocType(e.target.value)}
                        placeholder="e.g., PO, LOI, Work Order, MOM"
                      />
                    </Form.Item>
                  </Form>
                </Modal>

                <Form.Item label="Upload File" required>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  />
                </Form.Item>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button type="primary" htmlType="submit">Add Document</Button>
                </div>
              </Form>
            </Col>

            <Col xs={24} md={10} lg={12}>
              <div style={{ marginBottom: 10, fontWeight: 500, marginTop: 15 }}></div>
              <Table
                dataSource={Array.isArray(selectedActivityDocs) ? selectedActivityDocs : []}
                rowKey="id"
                pagination={false}
                columns={columns}
                size="small"
                scroll={{ y: 660, x: true }}
                style={{ border: "1px solid #f0f0f0", borderRadius: 8 }}
              // showHeader={false}
              />
            </Col>
          </Row>
        </div>
      </Modal>

      <Modal
        title="Add Document Name"
        open={addNameOpen}
        onCancel={() => setAddNameOpen(false)}
        onOk={onAddNewDocName}
        okText="Add"
        width={420}
        maskClosable={false}
        keyboard={false}
        destroyOnClose
        afterClose={() => setNewDocName("")}
      >
        <Form style={{ padding: "10px 20px" }} layout="vertical" onFinish={onAddNewDocName}>
          <Form.Item label="New Document Name" required>
            <Input value={newDocName} onChange={(e) => setNewDocName(e.target.value)} placeholder="e.g., PO, NDA, Handover Note" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Preview Document"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width="80%"
      >
        {previewContent?.startsWith("data:image") ? (
          <img src={previewContent ?? undefined} alt="preview" style={{ maxWidth: "100%" }} />
        ) : (
          <iframe src={previewContent ?? undefined} title="preview" width="100%" height="600px" />
        )}
      </Modal>

      <Modal
        title="Activity Details"
        open={activityDetailsVisible}
        onCancel={() => {
          setActivityDetailsVisible(false);
          setNoteInput('');
          setEditNoteId(null);
          setActivityBudget(null);
          setActivityCost(null);
        }}
        width={'60%'}
        footer={null}
        className="modal-container"
        maskClosable={false}
        keyboard={false}
      >
        <Tabs
          activeKey={detailsActiveTab}
          onChange={setDetailsActiveTab}
          style={{ padding: '0 24px 24px 10px' }}
        >
          {/* NOTES TAB */}
          <TabPane tab="Notes" key="notes">
            <List
              dataSource={selectedNotes}
              locale={{ emptyText: "No notes available" }}
              itemLayout="horizontal"
              style={{ marginBottom: 20 }}
              renderItem={(item: any) => (
                <List.Item style={{ padding: "8px 0" }}>
                  <List.Item.Meta
                    title={
                      <div className="note-meta">
                        {item.createdBy && (
                          <span className="note-author">
                            <UserOutlined />
                            {item.createdBy}
                          </span>
                        )}
                        {(item.createdAt || item.updatedAt) && (
                          <span className="note-timestamp">
                            <ClockCircleOutlined />
                            {dayjs(item.createdAt).format('DD MMM YYYY HH:mm')}
                          </span>
                        )}
                      </div>
                    }
                    description={item.text}
                  />
                </List.Item>
              )}
            />
          </TabPane>

          {/* COST TAB */}
          <TabPane tab="Cost" key="cost">
            {costLoading ? (
              <Spin />
            ) : activityCost ? (
              <div style={{ lineHeight: 2 }}>
                <div>
                  <strong>Project Cost:</strong>{" "}
                  {activityCost.projectCost != null
                    ? `₹${activityCost.projectCost.toLocaleString("en-IN")}`
                    : "—"}
                </div>
                <div>
                  <strong>Opportunity Cost:</strong>{" "}
                  {activityCost.opportunityCost != null
                    ? `₹${activityCost.opportunityCost.toLocaleString("en-IN")}`
                    : "—"}
                </div>
                {activityCost.updatedAt && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#888", float: "right" }}>
                    Last updated: {dayjs(activityCost.updatedAt).format("DD MMM YYYY HH:mm")}
                  </div>
                )}
              </div>
            ) : (
              <div>No cost information available for this activity.</div>
            )}
          </TabPane>

          {/* RACI TAB */}
          <TabPane tab="RACI" key="raci">
            {selectedActivity?.raci ? (
              <div className="raci-grid">
                <div className="raci-row">
                  <span className="raci-label">Responsible:</span>
                  <span className="raci-value">
                    {userMap[selectedActivity.raci.responsible] || 'N/A'}
                  </span>
                </div>
                <div className="raci-row">
                  <span className="raci-label">Accountable:</span>
                  <span className="raci-value">
                    {userMap[selectedActivity.raci.accountable] || 'N/A'}
                  </span>
                </div>
                <div className="raci-row">
                  <span className="raci-label">Consulted:</span>
                  <span className="raci-value">
                    {selectedActivity.raci.consulted?.map((id: any) => (
                      <span key={id} className="raci-tag">
                        {userMap[id] || id}
                      </span>
                    ))}
                  </span>
                </div>
                <div className="raci-row">
                  <span className="raci-label">Informed:</span>
                  <span className="raci-value">
                    {selectedActivity.raci.informed?.map((id: any) => (
                      <span key={id} className="raci-tag">
                        {userMap[id] || id}
                      </span>
                    ))}
                  </span>
                </div>
              </div>
            ) : (
              <div>No RACI information available</div>
            )}
          </TabPane>

          {/* BUDGET TAB */}
          <TabPane tab="Budget" key="budget">
            {budgetLoading ? (
              <Spin />
            ) : activityBudget ? (
              <div style={{ lineHeight: 2 }}>
                <div>
                  <strong>Budget:</strong>{" "}
                  {activityBudget.originalBudget != null
                    ? `₹${activityBudget.originalBudget.toLocaleString("en-IN")}`
                    : "—"}
                </div>
                <div>
                  <strong>Budgeted On:</strong>{" "}
                  {activityBudget.originalBudgetDate
                    ? dayjs(activityBudget.originalBudgetDate).format("DD MMM YYYY")
                    : "—"}
                </div>
                <div>
                  <strong>Revised Budget:</strong>{" "}
                  {activityBudget.revisedBudget != null
                    ? `₹${activityBudget.revisedBudget.toLocaleString("en-IN")}`
                    : "—"}
                </div>
                <div>
                  <strong>Revised On:</strong>{" "}
                  {activityBudget.revisionHistory && activityBudget.revisionHistory.length > 0
                    ? dayjs(
                      activityBudget.revisionHistory[
                        activityBudget.revisionHistory.length - 1
                      ].date
                    ).format("DD MMM YYYY")
                    : activityBudget.revisedBudgetDate
                      ? dayjs(activityBudget.revisedBudgetDate).format("DD MMM YYYY")
                      : "—"}
                </div>
              </div>
            ) : (
              <div>No budget information available for this activity.</div>
            )}
          </TabPane>
        </Tabs>
      </Modal>

      <ToastContainer />

    </>
  );
};

export default StatusUpdate;
