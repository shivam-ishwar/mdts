import { useCallback, useEffect, useRef, useState } from "react";
import { Input, DatePicker, Select, Table, Button, Checkbox, Steps, Modal, Result, Typography, Form, Row, Col, Tooltip } from "antd";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import "../styles/time-builder.css";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
const { Option } = Select;
const { Step } = Steps;
import { useNavigate } from "react-router-dom";
import { CalendarOutlined, ClockCircleOutlined, CloseCircleOutlined, CloseOutlined, DeleteOutlined, EditOutlined, ExclamationCircleOutlined, FolderOpenOutlined, LinkOutlined, PlusOutlined, SaveOutlined } from "@ant-design/icons";
import { useLocation } from "react-router-dom";
import { db } from "../Utils/dataStorege.ts";
import { getCurrentUser } from '../Utils/moduleStorage';
import { ToastContainer } from "react-toastify";
import { notify } from "../Utils/ToastNotify.tsx";
import { Box } from "@mui/material";
import { v4 as uuidv4 } from 'uuid';
import { useUnsavedChanges } from "../contexts/UnsavedChangesContext";
import {
  formatPrerequisiteCodes,
  getInvalidPrerequisiteCodes,
  getPrerequisiteCodes,
  hasPrerequisites,
  setActivityPrerequisites,
  shouldEnforcePrerequisiteSequence,
  validateActivityPrerequisites
} from "../Utils/prerequisites";
interface Activity {
  code: string;
  activityName: string;
  prerequisite?: string;
  prerequisites?: string[];
  prerequisite_activity_code?: string | null;
  slack: string;
  level: string;
  duration: string;
  start?: string | null;
  end?: string | null;
  activityStatus?: string;
  controllabilityFactor?: string | null;
  actualStart?: string;
  actualFinish?: string;
  fin_status?: string;
  guicode?: string;
  holidays?: any[];
}


interface Module {
  parentModuleCode: string;
  moduleName: string;
  activities: Activity[];
}

interface HolidayData {
  key: string;
  from: string;
  to: string;
  holiday: string;
  module: string[];
  impact: Record<string, string>;
}

interface Column {
  title: any;
  width?: string;
  dataIndex: string;
  key: string;
  align?: "center" | "left" | "right";
  render?: any;
}

const TimeBuilder = () => {
  const navigate = useNavigate();
  const {
    markClean,
    registerDiscardHandler,
    registerSaveHandler,
    setHasUnsavedChanges,
  } = useUnsavedChanges();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [_selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [sequencedModules, setSequencedModules] = useState<Module[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [_activitiesData, setActivitiesData] = useState<Activity[]>([]);
  const [holidayData, setHolidayData] = useState<HolidayData[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<any>([]);
  const [dataSource, setDataSource] = useState<any>([]);
  const [finalData, setFinalData] = useState<Module[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedProjectName, setSelectedProjectName] = useState<any>(null);
  const [_libraryName, setLibraryName] = useState<any>();
  const [isCancelEditModalVisible, setIsCancelEditModalVisiblVisible] = useState(false);
  const [selectedProjectMineType, setSelectedProjectMineType] = useState("");
  const [finalHolidays, setFinalHolidays] = useState<HolidayData[]>();
  const [isSaturdayWorking, setIsSaturdayWorking] = useState(false);
  const [isSundayWorking, setIsSundayWorking] = useState(false);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const location = useLocation();
  const [isMenualTimeline, setIsMenualTimeline] = useState(false);
  const [allProjectsTimelines, setAllProjectsTimelines] = useState<any[]>([]);
  const [openExistingTimelineModal, setOpenExistingTimelineModal] = useState(false);
  const [selectedExistingProjectId, setSelectedExistingProjectId] = useState(null);
  const [_selectedExistingProject, setSelectedExistigProject] = useState<any>(null);
  const [editingKey, setEditingKey] = useState(null);
  const [editedImpact, setEditedImpact] = useState<any>({});
  // const [_deletedModules, setDeletedModules] = useState<any>([]);
  // const [isDeletionInProgress, setIsDeletionInProgress] = useState(false);
  // const [_deletedActivities, setDeletedActivities] = useState<any[]>([]);
  // const [deletingActivity, setDeletingActivity] = useState<string | null>(null);
  const [selectedTimelineId, setSelectedTimelineId] = useState<any>("");
  const [isReplanMode, setIsReplanMode] = useState(false);
  const finalColumns: ColumnsType = [
    { title: "Sr No", dataIndex: "Code", key: "Code", width: 100, align: "center" },
    { title: "Key Activity", dataIndex: "keyActivity", key: "keyActivity", width: 250, align: "left" },
    { title: "Duration", dataIndex: "duration", key: "duration", width: 80, align: "center" },
    { title: "Pre-Requisite", dataIndex: "preRequisite", key: "preRequisite", width: 120, align: "center" },
    { title: "Slack", dataIndex: "slack", key: "slack", width: 80, align: "center" },
    { title: "Planned Start", dataIndex: "plannedStart", key: "plannedStart", width: 120, align: "center" },
    { title: "Planned Finish", dataIndex: "plannedFinish", key: "plannedFinish", width: 120, align: "center" }
  ];
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [selectedReviewerId, setSelectedReviewerId] = useState<any>(null);
  const moduleOptions = ["Land Acquisition", "Forest Clearance", "Budget Planning"];
  const [isAddHolidayModalVisible, setAddHolidayModalVisible] = useState(false);
  const [libraries, setAllLibraries] = useState<any>([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState(null);
  const [_selectedLibrary, setSelectedLibrary] = useState<any>(null);
  const initialLibrary = libraries[0]?.name;
  const [selectedItems, setSelectedItems] = useState(
    libraries.find((lib: any) => lib.name == initialLibrary)?.items || []
  );
  const [selectedGroupName, setSelectedGroupName] = useState<string | null>(null);
  const [newHoliday, setNewHoliday] = useState({
    from: null,
    to: null,
    holiday: "",
    module: [],
    impact: {},
    projectId: null,
  });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAddActivityModalOpen, setIsAddActivityModalOpen] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [addActivityForm] = Form.useForm();
  const [_rows, setRows] = useState([
    {
      from: null, to: null, holiday: "", module: [], impact: {}, editing: true
    },
  ]);

  const [userOptions, setUserOptions] = useState<any>([]);
  const queryParams = new URLSearchParams(location.search);
  const projectIdForTimeline = queryParams.get("projectId");
  const unsavedBaselineRef = useRef("");
  const hasCapturedUnsavedBaselineRef = useRef(false);
  const [unsavedTrackingReady, setUnsavedTrackingReady] = useState(false);

  const buildUnsavedSnapshot = useCallback(() => JSON.stringify({
    currentStep,
    selectedProjectId,
    selectedProjectName,
    selectedProjectMineType,
    selectedGroupName,
    selectedLibraryId,
    selectedItems: (selectedItems || []).map((item: any) => ({
      parentModuleCode: item?.parentModuleCode || "",
      status: item?.status || "",
      name: item?.moduleName || "",
    })),
    sequencedModules: (sequencedModules || []).map((module: any) => ({
      parentModuleCode: module?.parentModuleCode || "",
      moduleName: module?.moduleName || "",
      activities: (module?.activities || []).map((activity: any) => ({
        code: activity?.code || "",
        activityName: activity?.activityName || "",
        duration: activity?.duration ?? "",
        slack: activity?.slack ?? "",
        start: activity?.start ?? "",
        end: activity?.end ?? "",
        prerequisite: formatPrerequisiteCodes(activity),
        activityStatus: activity?.activityStatus ?? "",
        fin_status: activity?.fin_status ?? "",
      })),
    })),
    selectedHolidayKeys: Object.entries(selected)
      .filter(([, value]) => Boolean(value))
      .map(([key]) => key)
      .sort(),
    holidayImpacts: (finalHolidays || []).map((holiday: any) => ({
      key: holiday?.key || "",
      holiday: holiday?.holiday || "",
      impact: holiday?.impact || {},
      from: holiday?.from || "",
      to: holiday?.to || "",
    })),
    isSaturdayWorking,
    isSundayWorking,
    isUpdateMode,
    isReplanMode,
    selectedTimelineId,
  }), [
    currentStep,
    finalHolidays,
    isReplanMode,
    isSaturdayWorking,
    isSundayWorking,
    isUpdateMode,
    selected,
    selectedGroupName,
    selectedItems,
    selectedLibraryId,
    selectedProjectId,
    selectedProjectMineType,
    selectedProjectName,
    selectedTimelineId,
    sequencedModules,
  ]);

  const captureUnsavedBaseline = useCallback(() => {
    unsavedBaselineRef.current = buildUnsavedSnapshot();
    hasCapturedUnsavedBaselineRef.current = true;
    setUnsavedTrackingReady(true);
    markClean();
  }, [buildUnsavedSnapshot, markClean]);

  const getAllowedPrerequisiteOptions = (activityCode: string, activities: any[], context?: any) => {
    const candidateCodes = activities.map((activity: any) => activity.code);
    const enforceSequence = shouldEnforcePrerequisiteSequence(context, { code: activityCode });
    const { invalidSelf, invalidFuture, invalidCircular } = getInvalidPrerequisiteCodes({
      activities,
      activityCode,
      selectedPrerequisites: candidateCodes,
      enforceSequence,
    });
    const invalidCodes = new Set([...invalidSelf, ...invalidFuture, ...invalidCircular]);

    return activities
      .filter((activity: any) => !invalidCodes.has(activity.code))
      .map((activity: any) => ({
        value: activity.code,
        label: activity.code,
      }));
  };

  const updateActivityPrerequisites = (activityCode: string, value: any) => {
    const allActivities = sequencedModules.flatMap((module: any) => module.activities || []);
    const targetActivity = allActivities.find((activity: any) => activity.code === activityCode);
    const targetModule = sequencedModules.find((module: any) =>
      (module.activities || []).some((activity: any) => activity.code === activityCode)
    );

    const validation = validateActivityPrerequisites({
      activities: allActivities,
      activityCode,
      selectedPrerequisites: value,
      enforceSequence: shouldEnforcePrerequisiteSequence(targetModule, targetActivity),
    });

    if (!validation.valid) {
      notify.error(validation.message);
      return;
    }

    const updatedModules = sequencedModules.map((module: any) => ({
      ...module,
      activities: (module.activities || []).map((activity: any) =>
        activity.code == activityCode
          ? setActivityPrerequisites({ ...activity }, value, { manual: true })
          : { ...activity }
      ),
    }));

    commitTimelineState(recalculateTimeline(updatedModules));
  };

  const resolveSelectedProject = () => {
    if (selectedProjectId) {
      const fromList = allProjects.find((proj) => proj.id == selectedProjectId);
      if (fromList) return fromList;
    }
    if (selectedProject && (!selectedProjectId || selectedProject.id == selectedProjectId)) {
      return selectedProject;
    }
    return null;
  };

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    registerDiscardHandler(async () => undefined);
    registerSaveHandler(async () => {
      notify.warning("Timeline Builder changes can only be saved from the final review step.");
      return false;
    });

    return () => {
      registerDiscardHandler(null);
      registerSaveHandler(null);
      setHasUnsavedChanges(false);
    };
  }, [registerDiscardHandler, registerSaveHandler, setHasUnsavedChanges]);

  const loadUser = async () => {
    const user = await getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  };

  useEffect(() => {
    if (currentUser && currentUser.orgId) {
      fetchAllLibrary(currentUser);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const state = location.state;
    if (!state?.selectedProject || !state?.selectedTimeline) return;
    const fetchData = async () => {
      setIsReplanMode(state.rePlanTimeline || false);

      const { selectedProject, selectedTimeline } = state;
      const { projectParameters, id, holidays, projectTimeline, initialStatus } = selectedProject || {};

      const timelineId = selectedTimeline.versionId || selectedTimeline.timelineId;
      setSelectedTimelineId(timelineId);
      getProjectTimeline(timelineId);
      setIsUpdateMode(true);
      setSelectedProjectName(projectParameters?.projectName || "");
      setSelectedProjectId(id || "");
      setSelectedProject(selectedProject || {});
      if (selectedProject) {
        setAllProjects([selectedProject]);
      }
      setFinalHolidays(holidays || []);
      setSelectedLibraryId(initialStatus?.id);
      setLibraryName(initialStatus?.library || []);
      setSelectedItems(initialStatus?.items || []);
      setSelectedGroupName(initialStatus?.library || "");

      if (projectTimeline?.length) {
        setIsSaturdayWorking(projectTimeline[0]?.saturdayWorking || false);
        setIsSundayWorking(projectTimeline[0]?.sundayWorking || false);
        setSelectedProjectMineType(projectParameters?.typeOfMine || "");
        setIsMenualTimeline(true);
      } else {
        setLibraryName([]);
      }


      setIsMenualTimeline(true);
      window.setTimeout(captureUnsavedBaseline, 0);
    };

    fetchData();
  }, [captureUnsavedBaseline, currentUser, location.state]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setExpandedRowKeys(modules.map((module) => module.parentModuleCode));
      setFinalData(modules);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [modules]);

  useEffect(() => {
    if (!sequencedModules.length) return;
    const recalculated = recalculateTimeline(sequencedModules);
    commitTimelineState(recalculated);
  }, [isSaturdayWorking, isSundayWorking, finalHolidays]);

  useEffect(() => {
    if (!unsavedTrackingReady || !hasCapturedUnsavedBaselineRef.current) return;
    setHasUnsavedChanges(buildUnsavedSnapshot() !== unsavedBaselineRef.current);
  }, [buildUnsavedSnapshot, setHasUnsavedChanges, unsavedTrackingReady]);

  const fetchHolidays = async () => {
    try {
      const holidays = (await db.getAllHolidays()).filter(
        (h: any) =>
          h.orgId == currentUser.orgId &&
          (h.projectId == null || h.projectId == selectedProject.id)
      );
      if (holidays) {
        const updatedData: HolidayData[] = holidays.map((item: any, index: number) => ({
          ...item,
          from: item.from?.$d ? item.from.$d : item.from,
          to: item.to?.$d ? item.to.$d : item.to,
          key: String(index + 1),
        }));

        setHolidayData(updatedData);
        setFinalHolidays(updatedData);
        setSelected(Object.fromEntries(updatedData.map((item) => [item.key, true])));
      }
    } catch (error) {
      console.error("Error fetching holidays:", error);
    }
  };

  useEffect(() => {
    if (currentStep == 7) {
      setExpandedKeys(finalData.map((_, index) => `module-${index}`));
      const finDataSource = sequencedModules.map((module: any, moduleIndex: number) => {
        return {
          key: `module-${moduleIndex}`,
          SrNo: module.parentModuleCode,
          Code: module.parentModuleCode,
          keyActivity: module.moduleName,
          isModule: true,
          children: (module.activities || []).map((activity: any, actIndex: number) => {
            return {
              key: `activity-${moduleIndex}-${actIndex}`,
              SrNo: module.parentModuleCode,
              Code: activity.code,
              keyActivity: activity.activityName,
              duration: activity.duration ?? "",
              preRequisite: formatPrerequisiteCodes(activity) || "-",
              slack: activity.slack ?? "0",
              plannedStart: activity.start ? dayjs(activity.start).format("DD-MM-YYYY") : "-",
              plannedFinish: activity.end ? dayjs(activity.end).format("DD-MM-YYYY") : "-",
              actualStart: activity.actualStart,
              actualFinish: activity.actualFinish,
              actualDuration: "",
              remarks: "",
              expectedStart: "",
              expectedFinish: "",
              isModule: false,
              activityStatus: activity.activityStatus || "Pending",
            };
          }),
        };
      });
      setDataSource(finDataSource);
      const hasStatus = sequencedModules.some((item: any) => !!item.status);
      const hasActualStart = sequencedModules.some((item: any) => !!item.actualStart);
      const hasActualFinish = sequencedModules.some((item: any) => !!item.actualFinish);
      if (hasStatus) {
        finalColumns.push({
          title: "Status",
          dataIndex: "status",
          key: "status",
          align: "center",
          render: (text: string) => {
            const status = text?.toLowerCase();
            let color = "", label = "";

            switch (status) {
              case "completed":
                color = "green";
                label = "COMPLETED";
                break;
              case "inprogress":
                color = "#faad14";
                label = "IN PROGRESS";
                break;
              case "yettostart":
                color = "#8c8c8c";
                label = "YET TO START";
                break;
              default:
                color = "#000";
                label = status?.toUpperCase() || "";
            }

            return <span style={{ fontWeight: 'bold', color }}>{label}</span>;
          }
        });
      }

      if (hasActualStart) {
        finalColumns.push({
          title: "Actual Start",
          dataIndex: "actualStart",
          key: "actualStart",
          align: "center",
        });
      }

      if (hasActualFinish) {
        finalColumns.push({
          title: "Actual Finish",
          dataIndex: "actualFinish",
          key: "actualFinish",
          align: "center",
        });
      }
    }
  }, [currentStep, finalData]);

  useEffect(() => {
    if (currentStep !== 1) return;
    const updateProject = async () => {
      const updatedProjects = allProjects.map((proj) => {
        if (proj.id == selectedProjectId) {
          return {
            ...proj,
            initialStatus: {
              ...proj.initialStatus,
              library: selectedGroupName,
              items: selectedItems,
            },
          };
        }
        return proj;
      });
      setAllProjects(updatedProjects);
      const updatedProject = updatedProjects.find((p) => p.id == selectedProjectId);
      if (updatedProject) {
        await db.updateProject(selectedProjectId, updatedProject);
        defaultSetup(libraries);
      }
    };

    updateProject();
    fetchHolidays();
  }, [currentStep == 1]);

  const defaultSetup = async (allFoundlibrary: any = []) => {
    if (!isUpdateMode) {
      try {
        const allUsers = await db.getUsers();
        setUserOptions(allUsers);
        const allProjects = (await db.getProjects()).filter((p: any) => p.orgId == currentUser.orgId);

        let frestTimelineProject: any = [];
        setAllProjectsTimelines(allProjects.filter((item: any) => item.projectTimeline != undefined));

        if (projectIdForTimeline) {
          frestTimelineProject = allProjects.filter((item: any) => item.id == projectIdForTimeline);
        } else {
          frestTimelineProject = allProjects.filter((item: any) => item.projectTimeline == undefined);
        }

        if (!Array.isArray(frestTimelineProject) || frestTimelineProject.length == 0) {
          setAllProjects([]);
          window.setTimeout(captureUnsavedBaseline, 0);
          return;
        }

        setAllProjects(frestTimelineProject);

        if (frestTimelineProject && Array.isArray(frestTimelineProject) && frestTimelineProject.length == 1) {
          const firstProject = frestTimelineProject[0];
          if (firstProject && firstProject.id) {
            setSelectedProjectId(firstProject.id);
            setSelectedProject(frestTimelineProject[0]);
            const project = frestTimelineProject.find((p) => p?.id == firstProject.id);
            const selectedProjectLibrary = project.initialStatus;
            setLibraryName(selectedProjectLibrary);
            const FilteredLibrary = (allFoundlibrary || []).filter(
              (lib: any) => lib.mineType == project.projectParameters.typeOfMine
            );
            setAllLibraries(FilteredLibrary);

            if (selectedProjectLibrary) {
              setSelectedLibraryId(selectedProjectLibrary.id);
              setSelectedLibrary(selectedProjectLibrary);
              setSelectedItems(selectedProjectLibrary.items.filter((item: any) => item.status != 'Completed'));
              setSelectedGroupName(selectedProjectLibrary.name);
            } else {
              console.error("Library not found:", selectedProjectLibrary);
            }

            if (project && project.projectTimeline) {
              if (project.projectParameters) {
                setSelectedProjectMineType(project.projectParameters.typeOfMine || "");
              }
              setIsSaturdayWorking(project.projectTimeline[0].saturdayWorking);
              setIsSundayWorking(project.projectTimeline[0].sundayWorking);

              if (Array.isArray(project.projectTimeline)) {
                handleLibraryChange(project.projectTimeline);
              } else {
                handleLibraryChange([]);
              }
            } else if (project && project.initialStatus) {
              if (project.projectParameters) {
                setSelectedProjectMineType(project.projectParameters.typeOfMine || "");
              }

              if (Array.isArray(project.initialStatus.items)) {
                handleLibraryChange(
                  project.initialStatus.items.filter((item: any) => item?.status?.toLowerCase() !== "completed")
                );
              } else {
                handleLibraryChange([]);
              }
            } else {
              setLibraryName([]);
            }
          }
        }

        window.setTimeout(captureUnsavedBaseline, 0);
      } catch (error) {
        console.error("An unexpected error occurred while fetching projects:", error);
        window.setTimeout(captureUnsavedBaseline, 0);
      }
    }
  };

  const toggleCheckbox = (key: string) => {
    setSelected((prev) => {
      const updatedSelected = { ...prev, [key]: !prev[key] };
      const updatedHolidays = holidayData.filter((holiday) => updatedSelected[holiday.key]);
      setFinalHolidays(updatedHolidays);
      const updatedModules = finalData.map((module) => ({
        ...module,
        holidays: updatedHolidays,
      }));

      setFinalData(updatedModules);

      return updatedSelected;
    });
  };

  const handleNext = () => {
    if (currentStep === 0) {
      syncSequencedFromSelectedItems(selectedItems);
      setCurrentStep(1);
      return;
    }
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
    } else {
      if (isUpdateMode) {
        handleSaveProjectTimeline(sequencedModules);
        setTimeout(() => {
          navigate("/create/status-update");
        }, 1000);
      } else {
        handleSaveProjectTimeline(sequencedModules);
      }
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const items = Array.from(sequencedModules);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setFinalData(items);
    setSequencedModules(items);
  };

  const isDayjsObj = (v: any) => !!v && typeof v === "object" && typeof v.isSame === "function";

  const ensureDate = (value: any): Date => {
    if (!value) throw new Error("Invalid date input");

    if (value instanceof Date) {
      if (isNaN(value.getTime())) throw new Error("Invalid date input");
      return value;
    }

    if (isDayjsObj(value)) {
      const d = (value as dayjs.Dayjs).toDate();
      if (isNaN(d.getTime())) throw new Error("Invalid date input");
      return d;
    }

    if (typeof value === "string") {
      const isoTry = new Date(value);
      if (!isNaN(isoTry.getTime())) return isoTry;

      const m = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
      if (m) {
        const dmy = new Date(`${m[3]}-${m[2]}-${m[1]}`);
        if (!isNaN(dmy.getTime())) return dmy;
      }

      const parsed = Date.parse(value);
      if (!isNaN(parsed)) return new Date(parsed);
    }

    throw new Error("Invalid date input");
  };

  const toISODateOnly = (value: any): string => {
    const d = ensureDate(value);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();

    return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const addBusinessDays = (startDateAny: any, days: number) => {
    let date = ensureDate(startDateAny);
    date = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

    let addedDays = 0;
    let holidays: { date: string; reason: string }[] = [];

    while (addedDays < days) {
      date.setUTCDate(date.getUTCDate() + 1);

      const day = date.getUTCDay();
      const formattedDate = date.toISOString().slice(0, 10);

      const isSaturday = day === 6;
      const isSunday = day === 0;

      const holidayEntry: any = (finalHolidays || []).find((holiday: any) => {
        try {
          const holidayDate = toISODateOnly(holiday.from);
          return holidayDate === formattedDate;
        } catch {
          return false;
        }
      });

      if (isSaturday && !isSaturdayWorking) {
        holidays.push({ date: formattedDate, reason: "Saturday" });
      } else if (isSunday && !isSundayWorking) {
        holidays.push({ date: formattedDate, reason: "Sunday" });
      } else if (holidayEntry) {
        holidays.push({ date: formattedDate, reason: holidayEntry.holiday || "Holiday" });
      } else {
        addedDays++;
      }
    }

    const finalDate = date.toISOString().slice(0, 10);
    return { date: finalDate, holidays };
  };

  const isBlockedWorkingDate = (value: any) => {
    if (!value) return false;

    const currentDate = ensureDate(value);
    const day = currentDate.getDay();
    const isoDate = toISODateOnly(currentDate);

    if (day === 6 && !isSaturdayWorking) return true;
    if (day === 0 && !isSundayWorking) return true;

    return (finalHolidays || []).some((holiday: any) => {
      try {
        const fromDate = toISODateOnly(holiday.from);
        const toDate = holiday.to ? toISODateOnly(holiday.to) : fromDate;
        return isoDate >= fromDate && isoDate <= toDate;
      } catch {
        return false;
      }
    });
  };

  const normalizeActivity = (activity: any) => {
    const normalized = setActivityPrerequisites(
      { ...activity },
      getPrerequisiteCodes(activity),
      { manual: activity?.prerequisiteTouched ?? false }
    );

    return {
      ...normalized,
      slack: normalized.slack ?? "0",
      duration: normalized.duration ?? "0",
    };
  };

  const normalizeModules = (modulesInput: any[] = []) =>
    (modulesInput || []).map((module: any) => ({
      ...module,
      saturdayWorking: isSaturdayWorking,
      sundayWorking: isSundayWorking,
      activities: (module.activities || []).map((activity: any) => normalizeActivity(activity)),
    }));

  const getLatestDate = (dates: string[]) =>
    dates.reduce<string | null>((latest, current) => {
      if (!latest) return current;
      return dayjs(current).isAfter(dayjs(latest)) ? current : latest;
    }, null);

  const recalculateTimeline = (modulesInput: any[] = []) => {
    const normalizedModules = normalizeModules(modulesInput);
    const activityByCode = new Map<string, any>();

    normalizedModules.forEach((module: any) => {
      (module.activities || []).forEach((activity: any) => {
        activityByCode.set(activity.code, activity);
      });
    });

    normalizedModules.forEach((module: any) => {
      (module.activities || []).forEach((activity: any) => {
        if (activity.activityStatus == "completed" || activity.fin_status == "completed") {
          return;
        }

        const prerequisiteCodes = getPrerequisiteCodes(activity);
        const duration = parseInt(activity.duration, 10) || 0;

        if (prerequisiteCodes.length > 0) {
          const prerequisiteEndDates = prerequisiteCodes
            .map((code) => activityByCode.get(code)?.end)
            .filter(Boolean);

          if (prerequisiteEndDates.length !== prerequisiteCodes.length) {
            activity.start = null;
            activity.end = null;
            activity.holidays = [];
            return;
          }

          const latestPrerequisiteEnd = getLatestDate(prerequisiteEndDates);
          if (!latestPrerequisiteEnd) {
            activity.start = null;
            activity.end = null;
            activity.holidays = [];
            return;
          }

          const slack = parseInt(activity.slack, 10) || 0;
          const { date: startISO, holidays: slackHolidays } = addBusinessDays(latestPrerequisiteEnd, slack + 1);
          const { date: endISO, holidays: durationHolidays } = addBusinessDays(startISO, duration);

          activity.start = startISO;
          activity.end = endISO;
          activity.holidays = [...slackHolidays, ...durationHolidays];
          return;
        }

        if (activity.start) {
          const startISO = toISODateOnly(activity.start);
          const { date: endISO, holidays } = addBusinessDays(startISO, duration);
          activity.start = startISO;
          activity.end = endISO;
          activity.holidays = holidays;
          return;
        }

        activity.end = null;
        activity.holidays = [];
      });
    });

    return normalizedModules;
  };

  const commitTimelineState = (modulesInput: any[] = []) => {
    setModules(modulesInput);
    setSequencedModules(modulesInput);
    setFinalData(modulesInput);
    setActivitiesData(modulesInput.flatMap((module: any) => module.activities || []));
  };

  const removePrerequisiteReferences = (modulesInput: any[] = [], removedCodes: string[] = []) => {
    const removedSet = new Set(removedCodes);

    return (modulesInput || []).map((module: any) => ({
      ...module,
      activities: (module.activities || []).map((activity: any) => {
        const filteredCodes = getPrerequisiteCodes(activity).filter((code) => !removedSet.has(code));
        return setActivityPrerequisites(
          { ...activity },
          filteredCodes,
          { manual: activity?.prerequisiteTouched ?? false }
        );
      }),
    }));
  };

  const handleStartDateChange = (code: any, dateVal: any) => {
    const startISO = toISODateOnly(dateVal);
    const updatedModules = sequencedModules.map((module: any) => ({
      ...module,
      activities: (module.activities || []).map((activity: any) =>
        activity.code == code ? { ...activity, start: startISO } : { ...activity }
      ),
    }));

    commitTimelineState(recalculateTimeline(updatedModules));
  };

  const handleSlackChange = (code: any, newSlack: any) => {
    const targetActivity = sequencedModules
      .flatMap((module: any) => module.activities || [])
      .find((activity: any) => activity.code == code);
    const activityDuration = parseInt(targetActivity?.duration, 10) || 0;
    const isIncompleteNegative = newSlack === "-";
    const isEmptySlack = newSlack === "" || isIncompleteNegative;
    const requestedSlack = isIncompleteNegative ? 0 : (parseInt(newSlack, 10) || 0);
    const normalizedSlack = isEmptySlack
      ? (isIncompleteNegative ? "-" : "")
      : String(Math.min(requestedSlack, activityDuration));

    if (!isEmptySlack && requestedSlack > activityDuration) {
      notify.warning("Slack cannot be greater than the activity duration.");
    }

    const updatedModules = sequencedModules.map((module: any) => ({
      ...module,
      activities: (module.activities || []).map((activity: any) =>
        activity.code == code ? { ...activity, slack: normalizedSlack } : { ...activity }
      ),
    }));

    if (normalizedSlack === "-") {
      commitTimelineState(updatedModules);
      return;
    }

    commitTimelineState(recalculateTimeline(updatedModules));
  };

  const normalizeSlackInput = (rawValue: string): string => {
    if (!rawValue) return "";
    const trimmed = rawValue.trim();
    const isNegative = trimmed.startsWith("-");
    const digits = trimmed.replace(/\D/g, "");
    if (!digits) return isNegative ? "-" : "";
    return `${isNegative ? "-" : ""}${digits}`;
  };

  const handleDurationChange = (code: any, newDuration: any) => {
    const updatedModules = sequencedModules.map((module: any) => ({
      ...module,
      activities: (module.activities || []).map((activity: any) =>
        activity.code == code ? { ...activity, duration: newDuration } : { ...activity }
      ),
    }));

    commitTimelineState(recalculateTimeline(updatedModules));
  };

  // const handleActivitySelection = (activityCode: string, isChecked: boolean) => {
  //   if (isDeletionInProgress) return;
  //   const module = sequencedModules.find(m => m.parentModuleCode == "moduleCode");
  //   const hasCompletedActivities = module?.activities.some(activity =>
  //     activity.activityStatus == "completed" || activity.fin_status == "completed"
  //   );

  //   if (hasCompletedActivities) {
  //     notify.warning("Cannot delete module with completed activities");
  //     return;
  //   }

  //   setSelectedActivities((prevSelectedActivities) => {
  //     if (!isChecked) {
  //       let removedActivityIndex: number | null = null;
  //       let removedActivity: any = null;
  //       let parentModuleCode: string | null = null;

  //       setSequencedModules((prevFinalData) =>
  //         prevFinalData.map((module) => {
  //           const index = module.activities.findIndex(
  //             (activity) => activity.code == activityCode
  //           );

  //           if (index !== -1) {
  //             removedActivityIndex = index;
  //             removedActivity = { ...module.activities[index] };
  //             parentModuleCode = module.parentModuleCode;
  //           }

  //           return {
  //             ...module,
  //             activities: module.activities.filter(
  //               (activity) => activity.code !== activityCode
  //             ),
  //           };
  //         })
  //       );

  //       if (removedActivity && parentModuleCode) {
  //         setDeletedActivities((prevDeleted: any) => [
  //           ...prevDeleted,
  //           { ...removedActivity, index: removedActivityIndex, parentModuleCode },
  //         ]);
  //       }

  //       setIsDeletionInProgress(true);
  //       setDeletingActivity(activityCode);

  //       const key = `delete-activity-${activityCode}`;
  //       let progress = 100;
  //       let isUndoClicked = false;

  //       const updateProgress = () => {
  //         if (isUndoClicked) {
  //           setIsDeletionInProgress(false);
  //           setDeletingActivity(null);
  //           return;
  //         }
  //         progress -= 2;
  //         if (progress <= 0) {
  //           notification.destroy(key);
  //           setIsDeletionInProgress(false);
  //           setDeletingActivity(null);
  //           return;
  //         }

  //         notification.open({
  //           key,
  //           message: null,
  //           duration: 0,
  //           closeIcon: null,
  //           style: {
  //             borderRadius: "12px",
  //             padding: "12px 16px",
  //             boxShadow: "0px 6px 18px rgba(0, 0, 0, 0.15)",
  //             background: "#FFF8F0",
  //             width: "100%",
  //             display: "flex",
  //             alignItems: "center",
  //           },
  //           btn: (
  //             <>
  //               <div
  //                 style={{
  //                   width: "100%",
  //                   display: "flex",
  //                   justifyContent: "space-between",
  //                   alignItems: "center",
  //                 }}
  //               >
  //                 <p
  //                   style={{
  //                     margin: "0px 8px 0 4px",
  //                     fontSize: "13px",
  //                     color: "#444",
  //                     fontWeight: "500",
  //                     width: "200px",
  //                   }}
  //                 >
  //                   {removedActivity?.name} has been deleted.
  //                 </p>

  //                 <div>
  //                   <Button
  //                     type="primary"
  //                     size="small"
  //                     style={{
  //                       background: "#258790",
  //                       border: "none",
  //                       fontWeight: "bold",
  //                       color: "#fff",
  //                       padding: "6px 14px",
  //                       borderRadius: "6px",
  //                       minWidth: "60px",
  //                     }}
  //                     onClick={() => {
  //                       isUndoClicked = true;
  //                       restoreDeletedActivity(activityCode);
  //                       notification.destroy(key);
  //                       setIsDeletionInProgress(false);
  //                       setDeletingActivity(null);
  //                       notification.success({
  //                         message: "✅ Rollback Successful",
  //                         description: `${removedActivity?.activityName} has been restored successfully.`,
  //                         placement: "topRight",
  //                         duration: 0.1,
  //                         style: {
  //                           borderRadius: "10px",
  //                           background: "#E6FFFB",
  //                           color: "#006D75",
  //                         },
  //                       });
  //                     }}
  //                   >
  //                     Undo
  //                   </Button>
  //                 </div>
  //               </div>
  //               <div className="progress-bar-item">
  //                 <Progress
  //                   percent={progress}
  //                   showInfo={false}
  //                   status="active"
  //                   strokeColor={{ from: "#FF4D4F", to: "#FF9C6E" }}
  //                   strokeWidth={6}
  //                   style={{ flex: 1, borderRadius: "6px", margin: 0 }}
  //                 />
  //               </div>
  //             </>
  //           ),
  //         });

  //         setTimeout(updateProgress, 100);
  //       };

  //       setTimeout(updateProgress, 100);

  //       return prevSelectedActivities.filter((code) => code !== activityCode);
  //     } else {
  //       return [...prevSelectedActivities, activityCode];
  //     }
  //   });
  // };

  // const restoreDeletedActivity = (activityCode: string) => {
  //   setDeletedActivities((prevDeleted: any) => {
  //     const restoredActivity = prevDeleted.find(
  //       (activity: any) => activity.code == activityCode
  //     );
  //     if (restoredActivity) {
  //       setSequencedModules((prevModules) =>
  //         prevModules.map((module) =>
  //           module.parentModuleCode == restoredActivity.parentModuleCode
  //             ? {
  //               ...module,
  //               activities: [
  //                 ...module.activities.slice(0, restoredActivity.index),
  //                 { ...restoredActivity },
  //                 ...module.activities.slice(restoredActivity.index),
  //               ],
  //             }
  //             : module
  //         )
  //       );

  //       return prevDeleted.filter(
  //         (activity: any) => activity.code !== activityCode
  //       );
  //     }

  //     return prevDeleted;
  //   });

  //   setSelectedActivities((prevSelected) => [...prevSelected, activityCode]);
  // }

  const handleProjectChange = (projectId: any) => {
    setCurrentStep(0);
    setSelectedProjectId(projectId);

    const project = allProjects.find((p) => p.id === projectId);
    setSelectedProject(project);

    if (!project) {
      setLibraryName(null);
      setSelectedProjectMineType("");
      setSelectedLibraryId(null);
      setSelectedLibrary(null);
      handleLibraryChange([]);
      return;
    }

    const mineType = project.projectParameters?.typeOfMine || "";
    setSelectedProjectMineType(mineType);

    const selectedLibrary = project.initialStatus || null;
    setLibraryName(selectedLibrary || null);

    const filteredLibraries = (libraries || []).filter((lib: any) => lib.mineType === mineType);
    setAllLibraries(filteredLibraries);

    if (selectedLibrary && filteredLibraries.length > 0) {
      const matchedLibrary = filteredLibraries.find((lib: any) => lib.id === selectedLibrary.id) || filteredLibraries[0];

      setSelectedLibraryId(matchedLibrary.id);
      setSelectedLibrary(matchedLibrary);
      setSelectedItems((matchedLibrary.items || []).filter((item: any) => item.status?.toLowerCase() !== "completed"));
      setSelectedGroupName(matchedLibrary.name);
    } else {
      setSelectedLibraryId(null);
      setSelectedLibrary(null);
      setSelectedItems([]);
      setSelectedGroupName(null);
    }

    // Handle Timeline/Items Logic
    if (Array.isArray(project.projectTimeline) && project.projectTimeline.length > 0) {
      setIsSaturdayWorking(project.projectTimeline[0].saturdayWorking);
      setIsSundayWorking(project.projectTimeline[0].sundayWorking);
      handleLibraryChange(project.projectTimeline);
    } else if (Array.isArray(project.initialStatus?.items)) {
      handleLibraryChange(
        project.initialStatus.items.filter((item: any) => item.status?.toLowerCase() !== "completed")
      );
    } else {
      handleLibraryChange([]);
    }
  };

  const handleLibraryChange = (libraryItems: any) => {
    if (libraryItems) {
      const recalculated = recalculateTimeline(libraryItems);
      commitTimelineState(recalculated);
      const allActivityCodes = recalculated.flatMap((module: any) =>
        module.activities.map((activity: any) => activity.code)
      );

      setSelectedActivities(allActivityCodes);
    } else {
      commitTimelineState([]);
      setActivitiesData([]);
      setSelectedActivities([]);
    }
  };

  const handleSaveProjectTimeline = async (sequencedModules: any) => {
    try {
      if (!selectedProject || !selectedProjectId) {
        throw new Error("Project or Project ID is missing.");
      }

      const currentUser = getCurrentUser();
      const currentTimestamp = new Date().toISOString();

      const createTimelineEntry = (
        timelineId: string,
        version: string,
        reviewerId: string
      ) => {
        const reviewer = userOptions.find((u: any) => u.id == reviewerId);

        return {
          timelineId,
          status: "pending",
          version,
          addedBy: currentUser.name,
          addedUserEmail: currentUser.email,
          approver: {
            id: reviewer?.id,
            Name: reviewer?.name,
          },
          createdAt: currentTimestamp,
          updatedAt: currentTimestamp,
          guiId: uuidv4(),
          userGuiId: currentUser?.guiId,
          orgId: currentUser?.orgId,
        };
      };

      if (!isUpdateMode || isReplanMode) {
        const createdTimeLineId: any = await db.addProjectTimeline(sequencedModules);
        const existingTimeline = selectedProject.projectTimeline || [];

        const newVersion = `${existingTimeline.length + 1}.0`;
        localStorage.setItem("latestProjectVersion", newVersion);

        let updatedTimeline = [...existingTimeline];
        if (isReplanMode && existingTimeline.length > 0) {
          const lastIndex = existingTimeline.length - 1;
          updatedTimeline[lastIndex] = {
            ...updatedTimeline[lastIndex],
            status: "replanned",
          };
        }

        const newEntry = createTimelineEntry(createdTimeLineId, newVersion, selectedReviewerId);

        const updatedProjectWithTimeline = {
          ...selectedProject,
          projectTimeline: [
            ...updatedTimeline,
            newEntry,
          ],
          processedTimelineData: sequencedModules,
        };

        await db.updateProject(selectedProjectId, updatedProjectWithTimeline);
      } else {
        const timelineToUpdate = selectedProject.projectTimeline?.find(
          (t: any) => t.timelineId === selectedTimelineId
        );

        if (timelineToUpdate) {
          timelineToUpdate.status = "amendment pending";
          timelineToUpdate.updatedAt = currentTimestamp;
        }

        await db.updateProjectTimeline(selectedTimelineId, sequencedModules);
        await db.updateProject(selectedProjectId, {
          ...selectedProject,
          projectTimeline: selectedProject.projectTimeline,
          processedTimelineData: sequencedModules,
        });

      }

      setTimeout(() => navigate(".", { replace: true }), 0);
      notify.success(isUpdateMode ? "Project timeline updated successfully!" : "Project timeline saved successfully!");

      localStorage.setItem("selectedProjectId", selectedProjectId);
      captureUnsavedBaseline();
      resetProjectState();
    } catch (error) {
      console.error("Error saving project timeline:", error);
      notify.error("Failed to save project timeline. Please try again.");
    }
  };

  const resetProjectState = () => {
    setSelectedProject(null);
    setSelectedProjectId(null);
    setIsMenualTimeline(false);
    setLibraryName(null);
    setSelectedProjectMineType("");
    defaultSetup();
  };

  const holidayColumns: any = [
    {
      title: "From Date",
      dataIndex: "from",
      key: "from",
      width: "10%",
      render: (text: any) => dayjs(text).format("DD-MM-YYYY"),
    },
    {
      title: "To Date",
      dataIndex: "to",
      key: "to",
      align: "left",
      width: "10%",
      render: (text: any) => dayjs(text).format("DD-MM-YYYY"),
    },
    {
      title: "Holiday Name",
      dataIndex: "holiday",
      key: "holiday",
      align: "left",
      width: "25%",
    },
    {
      title: "Module Name",
      dataIndex: "module",
      key: "module",
      align: "left",
      width: "25%",
      render: (modules: any) => (
        <div>
          {Array.isArray(modules) &&
            modules.map((module: any, index: number) => (
              <div key={index}>{module}</div>
            ))}
        </div>
      ),

    },
    {
      title: "Impact",
      dataIndex: "impact",
      key: "impact",
      align: "left",
      width: "20%",
      render: (impact: any, record: any) =>
        editingKey == record.key ? (
          <div style={{
            backgroundColor: editingKey == record.key ? "#9AA6B2" : "transparent",
            padding: "5px",
            borderRadius: "4px",
          }}>
            {Object.keys(impact).map((module: any, index: any) => (
              <div key={index}>
                <Input
                  value={editedImpact[module]}
                  onChange={(e) => handleImpactChange(module, e.target.value)}
                  style={{ width: "60px", marginRight: "5px", marginBottom: "2px" }}
                />
                <span style={{ fontSize: "10px", marginLeft: "2px" }}>%</span>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {Object.values(impact).map((value: any, index: any) => (
              <div key={index}>
                {value}
                <span style={{ fontSize: "10px", marginLeft: "2px" }}>%</span>
              </div>
            ))}
          </div>
        ),
    },
    {
      title: "✔",
      key: "checkbox",
      width: "5%",
      align: "center",
      render: (_: any, record: any) => (
        <Checkbox
          checked={selected[record.key]}
          onChange={() => toggleCheckbox(record.key)}
        />
      ),
    },
    {
      title: "Action",
      key: "action",
      align: "center",
      width: "5%",
      render: (_: any, record: any) =>
        editingKey == record.key ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
            <Button
              type="link"
              icon={<SaveOutlined />}
              className="bg-secondary"
              onClick={() => handleSaveHoliday(record.key)}
            />
            <Button
              type="link"
              className="bg-tertiary"
              icon={<CloseOutlined />}
              onClick={handleCancel}
            />
          </div>
        ) : (
          <Button
            type="link"
            className="bg-info text-white"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record.key, record.impact)}
          />
        ),
    },
  ];

  const handleSaveHoliday = async (key: any) => {
    const updatedHolidays: any = finalHolidays?.map((item) =>
      item.key == key ? { ...item, impact: { ...editedImpact } } : item
    );
    const updatedProjectWithHoliday = {
      ...selectedProject,
      holidays: updatedHolidays
    };
    await db.updateProject(selectedProjectId, updatedProjectWithHoliday);
    notify.success(isUpdateMode
      ? "Project timeline updated successfully!"
      : "Project timeline saved successfully!"
    );
    setFinalHolidays([...updatedHolidays]);
    setHolidayData([...updatedHolidays]);
    setEditingKey(null);
  };

  const handleImpactChange = (module: any, value: any) => {
    if (!isNaN(value) && value >= 0 && value <= 100) {
      setEditedImpact((prev: any) => ({ ...prev, [module]: Number(value) }));
    }
  };

  const handleEdit = (key: any, impact: any) => {
    setEditingKey(key);
    setEditedImpact({ ...impact });
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditedImpact({});
  };

  const getColumnsForStep = (step: number) => {
    const baseColumns: any = [
      {
        title: <div style={{ textAlign: "left" }}>Code</div>,
        dataIndex: "code",
        key: "code",
        align: "left",
        width: step >= 3 ? "14%" : "18%",
        render: (_: any, record: any) => (
          <span className={record.activityStatus == "completed" ? "completed-field" : ""}>
            {record.code}
          </span>
        ),
      },
      {
        title: <div style={{ textAlign: "left" }}>Activity Name</div>,
        dataIndex: "activityName",
        key: "activityName",
        align: "left",
        width: step >= 3 ? "34%" : "54%",
        render: (text: any, record: any) => (
          <span className={record.activityStatus == "completed" ? "completed-field" : ""}>
            {text}
          </span>
        ),
      },
      {
        title: <div style={{ textAlign: "left" }}>Duration</div>,
        dataIndex: "duration",
        key: "duration",
        align: "center",
        width: step >= 3 ? "12%" : "20%",
        render: (_duration: any, record: any) => {
          const isDisabled =
            record.activityStatus == "completed" ||
            record.fin_status == "completed" ||
            step !== 2;

          return (
            <Input
              placeholder="Duration"
              type="text"
              value={record.duration ?? ""}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                handleDurationChange(record.code, value);
              }}
              onKeyDown={(e) => {
                if (
                  !/^\d$/.test(e.key) &&
                  e.key !== "Backspace" &&
                  e.key !== "Delete" &&
                  e.key !== "ArrowLeft" &&
                  e.key !== "ArrowRight"
                ) {
                  e.preventDefault();
                }
              }}
              disabled={isDisabled}
            />
          );
        }

      },
    ];

    if (step == 2 && (isUpdateMode || isReplanMode)) {
      baseColumns.push(
        {
          title: "Status",
          dataIndex: "activityStatus",
          key: "activityStatus",
          render: (text: string) => {
            const status = text?.toLowerCase();

            let color = "";
            let label = "";

            switch (status) {
              case "completed":
                color = "green";
                label = "COMPLETED";
                break;
              case "inprogress":
                color = "#faad14";
                label = "IN PROGRESS";
                break;
              case "yettostart":
                color = "#8c8c8c";
                label = "YET TO START";
                break;
              default:
                color = "#000000";
                label = status?.toUpperCase() || "";
            }

            return (
              <span style={{ fontWeight: 'bold', color }}>
                {label}
              </span>
            );
          },
        });
    }

    if (step == 2) {
      baseColumns.push({
        key: "delete-activity",
        align: "right",
        width: "8%",
        className: step == 2 ? "active-column" : "",
        onCell: () => ({ className: step == 2 ? "first-column-red" : "" }),
        render: (_: any, record: any) => {
          const disabled =
            record.activityStatus === "completed" ||
            record.activityStatus === "inprogress" ||
            record.fin_status === "completed";

          return (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Tooltip title={disabled ? "" : "Delete this activity"}>
                <Button
                  type="link"
                  icon={<DeleteOutlined />}
                  danger
                  disabled={disabled}
                  onClick={() => confirmDeleteActivity(record.code)}
                />
              </Tooltip>
            </div>
          );
        },
      });
    }

    if (step >= 3) {
      baseColumns.push({
        title: <div style={{ textAlign: "left" }}>Prerequisite</div>,
        key: "prerequisite",
        width: "40%",
        className: step == 2 ? "active-column" : "",
        render: (_: any, record: any) => {
          const isDisabled = step !== 3 || record.activityStatus == "completed";
          const selectClass = step == 3 && !isDisabled ? "highlighted-select" : "";

          return (
            <div className={selectClass}>
              <Select
                mode="multiple"
                showSearch
                placeholder="Select prerequisite(s)"
                value={getPrerequisiteCodes(record)}
                onChange={(value) => updateActivityPrerequisites(record.code, value)}
                disabled={isDisabled}
                filterOption={(input: any, option: any) =>
                  option?.label?.toLowerCase().includes(input.toLowerCase())
                }
                options={getAllowedPrerequisiteOptions(
                  record.code,
                  sequencedModules.flatMap((module) =>
                    (module.activities || []).filter((activity) => activity.activityStatus !== "completed")
                  ),
                  sequencedModules.find((module) =>
                    (module.activities || []).some((activity) => activity.code === record.code)
                  )
                )}
                style={{ width: "95%" }}
                allowClear
              />
            </div>
          );
        },
      });
    }

    if (step >= 4) {
      baseColumns.push({
        title: <div style={{ textAlign: "left" }}>Slack</div>,
        key: "slack",
        width: 180,
        className: step == 3 ? "active-column" : "",
        render: (_: any, record: any) => {
          const isDisabled = step !== 4 || record.activityStatus == "completed";
          const inputClass = step == 4 && !isDisabled ? "highlighted-input" : "";

          return (
            <div className={inputClass}>
              <Input
                placeholder="Slack"
                type="text"
                value={record.slack ?? "0"}
                onChange={(e) => {
                  const value = normalizeSlackInput(e.target.value);
                  handleSlackChange(record.code, value);
                }}
                onKeyDown={(e) => {
                  if (
                    !/^\d$/.test(e.key) &&
                    e.key !== "-" &&
                    e.key !== "Backspace" &&
                    e.key !== "Delete" &&
                    e.key !== "ArrowLeft" &&
                    e.key !== "ArrowRight"
                  ) {
                    e.preventDefault();
                  }
                }}
                style={{ width: "95%" }}
                disabled={isDisabled}
              />
            </div>
          );
        },
      });
    }

    if (step >= 6) {
      baseColumns.push({
        title: <div style={{ textAlign: "left" }}>Start Date</div>,
        key: "start",
        width: 220,
        className: step == 6 ? "active-column" : "",
        render: (_: any, record: any) => {
          const hasPrerequisite = hasPrerequisites(record);
          const isDisabled =
            step !== 6 || record.activityStatus == "completed" || hasPrerequisite;
          const datePickerClass = step == 6 && !isDisabled ? "highlighted-datepicker" : "";

          return (
            <div className={datePickerClass}>
              <DatePicker
                placeholder="Start Date"
                value={
                  record.start ? dayjs(record.start) : null
                }
                onChange={(date) => handleStartDateChange(record.code, date)}
                disabledDate={(current) => isBlockedWorkingDate(current?.toDate?.() || current)}
                disabled={isDisabled}
                style={{ width: "95%" }}
                format="DD-MM-YYYY"
              />
            </div>
          );
        },
      });
    }
    const hasStatus = sequencedModules.some((mod: any) =>
      mod.activities?.some((act: any) => !!act.activityStatus)
    );
    const hasActualStart = sequencedModules.some((mod: any) =>
      mod.activities?.some((act: any) => !!act.actualStart)
    );
    const hasActualFinish = sequencedModules.some((mod: any) =>
      mod.activities?.some((act: any) => !!act.actualFinish)
    );

    if (hasStatus && step != 2) {
      baseColumns.push({
        title: "Status",
        dataIndex: "activityStatus",
        key: "activityStatus",
        align: 'center',
        render: (_: any, record: any) => (
          <Select
            value={record.activityStatus?.toLowerCase() || ""}
            disabled
            style={{ fontWeight: "bold", width: 160 }}
            options={[
              { value: "completed", label: "COMPLETED" },
              { value: "inprogress", label: "IN PROGRESS" },
              { value: "yettostart", label: "YET TO START" },
            ]}
          />
        ),
      });
    }

    if (hasActualStart && step != 2) {
      baseColumns.push({
        title: "Actual Start",
        dataIndex: "actualStart",
        key: "actualStart",
        render: (_: any, record: any) => (
          <Input
            placeholder="Actual Start"
            value={record.actualStart || ""}
            disabled
            style={{ fontWeight: "bold" }}
          />
        ),
      });
    }

    if (hasActualFinish && step != 2) {
      baseColumns.push({
        title: "Actual Finish",
        dataIndex: "actualFinish",
        key: "actualFinish",
        render: (_: any, record: any) => (
          <Input
            placeholder="Actual Finish"
            value={record.actualFinish || ""}
            disabled
            style={{ fontWeight: "bold" }}
          />
        ),
      });
    }

    return baseColumns;
  };

  const getOuterTableColumns = (step: number): Column[] => {
    let columns: Column[] = [
      {
        title: <div style={{ textAlign: "left" }}>Code</div>,
        dataIndex: "code",
        key: "code",
        width: step === 2 ? "18%" : step === 3 ? "14%" : "16%",
        render: (_: any, record: any) => record.parentModuleCode || record.code,
      },
      {
        title: <div style={{ textAlign: "left" }}>Key Activity</div>,
        dataIndex: "moduleName",
        key: "moduleName",
        width: step === 2 ? "54%" : step === 3 ? "34%" : "36%",
      },
      {
        title: <div style={{ textAlign: "left" }}>Duration</div>,
        dataIndex: "duration",
        key: "duration",
        align: "center",
        width: step === 2 ? "20%" : step === 3 ? "12%" : "16%",
        render: (_duration: any, record: any) => {
          const totalDuration = (record.activities || []).reduce((sum: number, activity: any) => {
            const value = Number(activity.duration);
            return Number.isFinite(value) ? sum + value : sum;
          }, 0);
          return `${totalDuration}`;
        },
      },
    ];

    if (step == 2 && (isUpdateMode || isReplanMode)) {
      columns.push({
        title: <div style={{ textAlign: "left" }}>Status</div>,
        dataIndex: "activityStatus",
        key: "activityStatus",
        align: "center",
        width: "12%",
        render: (text: any) => <span style={{ fontWeight: 'bold' }}>{text}</span>,
      },);
    }

    if (step >= 3) {
      columns.push({
        title: <div style={{ textAlign: "left" }}>Prerequisite</div>,
        dataIndex: "prerequisite",
        key: "prerequisite",
        align: "center",
        width: step === 3 ? "40%" : "20%",
        render: (_: any, record: any) => formatPrerequisiteCodes(record),
      });
    }

    if (step >= 4) {
      columns.push({
        title: <div style={{ textAlign: "left" }}>Slack</div>,
        dataIndex: "slack",
        key: "slack",
        width: "10%",
      });
    }

    if (step >= 6) {
      columns.push({
        title: <div style={{ textAlign: "left" }}>Start Date</div>,
        dataIndex: "startDate",
        key: "startDate",
        width: "14%",
      });
    }

    const hasStatus = sequencedModules.some((mod: any) =>
      mod.activities?.some((act: any) => !!act.activityStatus)
    );
    const hasActualStart = sequencedModules.some((mod: any) =>
      mod.activities?.some((act: any) => !!act.actualStart)
    );
    const hasActualFinish = sequencedModules.some((mod: any) =>
      mod.activities?.some((act: any) => !!act.actualFinish)
    );

    if (hasStatus && step != 2) {
      columns.push({
        title: <div style={{ textAlign: "left" }}>Status</div>,
        dataIndex: "status",
        key: "status",
        width: "12%",
      });
    }

    if (hasActualStart && step != 2) {
      columns.push({
        title: <div style={{ textAlign: "left" }}>Actual Start</div>,
        dataIndex: "actualStart",
        key: "actualStart",
        width: "12%",
      });
    }

    if (hasActualFinish && step != 2) {
      columns.push({
        title: <div style={{ textAlign: "left" }}>Actual Finish</div>,
        dataIndex: "actualFinish",
        key: "actualFinish",
        width: "12%",
      });
    }

    if (step == 2) {
      columns.push({
        title: <div style={{ textAlign: "left" }}>Actions</div>,
        dataIndex: "actions",
        key: "actions",
        align: "left",
        width: "8%",
        render: (_text: any, record: any) => {
          const disabled =
            record.activities?.some((activity: any) =>
              ["completed", "inprogress"].includes(
                (activity.activityStatus || "").toLowerCase()
              )
            ) ||
            record.activities?.some(
              (activity: any) => (activity.fin_status || "").toLowerCase() === "completed"
            );

          return (
            <div style={{ display: "flex", justifyContent: "flex-start", width: "100%" }}>
              <Tooltip title={disabled ? "Cannot delete this module" : "Delete entire module"}>
                <Button
                  type="primary"
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  style={{ padding: "6px 10px", borderRadius: "4px" }}
                  disabled={disabled}
                  onClick={() => confirmDeleteModule(record.parentModuleCode)}
                >
                  Delete Entire Module
                </Button>
              </Tooltip>
            </div>
          );
        },
      });
    }


    return columns;
  };

  const handleExistingProjectChange = async (projectId: any) => {
    setSelectedExistingProjectId(projectId);
    const storedAllProjects = (await db.getProjects())
      .filter((p: any) => p.orgId == currentUser.orgId);
    const selectedExProject = storedAllProjects.find((p: any) => p.id == selectedExistingProjectId);
    setSelectedExistigProject(selectedExProject);
  };

  const handleLinkProjectTimeline = async () => {
    try {
      const storedAllProjects = (await db.getProjects())
        .filter((p: any) => p.orgId == currentUser.orgId);

      const selectedExProject = storedAllProjects.find((p: any) => p.id == selectedExistingProjectId);

      if (!selectedExistingProjectId) return;

      if (selectedExProject?.projectParameters.typeOfMine == selectedProject.projectParameters.typeOfMine) {
        const updatedProjectWithTimeline = { ...selectedProject, projectTimeline: [] };

        if (selectedExProject.projectTimeline && selectedExProject.projectTimeline.length > 0) {
          updatedProjectWithTimeline.projectTimeline = selectedExProject.projectTimeline.map((module: any) => ({
            ...module,
            activities: (module.activities || []).map((activity: any) => ({
              ...activity,
              start: "",
              end: "",
            })),
          }));
        }
        await db.updateProject(selectedProject.id, updatedProjectWithTimeline);
        await db.addProjectTimeline(updatedProjectWithTimeline.projectTimeline);
        localStorage.setItem('selectedProjectId', selectedProject.id);
        notify.success("Project timeline linked successfully!");
        setTimeout(() => {
          navigate("/create/status-update");
        }, 1000);
      } else {
        setTimeout(() => notify.error("Selected project and existing project must have the same mine type!"), 0);
      }
    } catch (error: any) {
      console.error(error);
      setTimeout(() => notify.error(error.message || "An error occurred"), 0);
    }
  };

  const handleCancelUpdateProjectTimeline = () => {
    setIsCancelEditModalVisiblVisible(false)
    setIsUpdateMode(false);
    setSelectedProject(null);
    setSelectedProjectMineType("");
    setLibraryName("");
    setIsReplanMode(false);
    setSelectedProjectId(null);
    setIsMenualTimeline(false);
    captureUnsavedBaseline();
    defaultSetup();
    setTimeout(() => navigate(".", { replace: true }), 0);
  };

  const isNextStepAllowed = () => {
    if (currentStep == 6) {
      return sequencedModules.every((module: any) =>
        module.activities.every((activity: any) => {
          if (!hasPrerequisites(activity)) {
            return Boolean(activity.start);
          }
          return true;
        })
      );
    }
    return true;
  };

  // const handleModuleSelection = (moduleCode: any, isChecked: any) => {
  //   setSequencedModules((prevModules) => {
  //     if (!isChecked) {
  //       const index = prevModules.findIndex(
  //         (module) => module.parentModuleCode == moduleCode
  //       );

  //       if (index == -1) return prevModules;

  //       const removedModule = prevModules[index];
  //       setDeletedModules((prevDeleted: any) => [
  //         ...prevDeleted,
  //         { ...removedModule, originalIndex: index },
  //       ]);

  //       setIsDeletionInProgress(true);

  //       const key = `delete-${moduleCode}`;
  //       let progress = 100;
  //       let isUndoClicked = false;

  //       const updateProgress = () => {
  //         if (isUndoClicked) {
  //           setIsDeletionInProgress(false);
  //           return;
  //         }
  //         progress -= 2;
  //         if (progress <= 0) {
  //           notification.destroy(key);
  //           setIsDeletionInProgress(false);
  //           return;
  //         }

  //         notification.open({
  //           key,
  //           message: null,
  //           duration: 0,
  //           closeIcon: null,
  //           style: {
  //             borderRadius: "12px",
  //             padding: "12px 16px",
  //             boxShadow: "0px 6px 18px rgba(0, 0, 0, 0.15)",
  //             background: "#FFF8F0",
  //             width: "100%",
  //             display: "flex",
  //             alignItems: "center",
  //           },
  //           btn: (
  //             <>
  //               <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
  //                 <p style={{ margin: " 0px 8px 0 4px", fontSize: "13px", color: "#444", fontWeight: "500", width: "200px" }}>
  //                   {removedModule.moduleName} has been deleted.
  //                 </p>

  //                 <div>
  //                   <Button
  //                     type="primary"
  //                     size="small"
  //                     style={{
  //                       background: "#258790",
  //                       border: "none",
  //                       fontWeight: "bold",
  //                       color: "#fff",
  //                       padding: "6px 14px",
  //                       borderRadius: "6px",
  //                       minWidth: "60px",
  //                     }}
  //                     onClick={() => {
  //                       isUndoClicked = true;
  //                       restoreDeletedModule(moduleCode);
  //                       notification.destroy(key);
  //                       setIsDeletionInProgress(false);
  //                       notification.success({
  //                         message: "✅ Roleback Successful",
  //                         description: `${removedModule.moduleName} has been restored successfully.`,
  //                         placement: "topRight",
  //                         duration: 0.1,
  //                         style: { borderRadius: "10px", background: "#E6FFFB", color: "#006D75" },
  //                       });
  //                     }}
  //                   >
  //                     Undo
  //                   </Button>
  //                 </div>
  //               </div>
  //               <div className="progress-bar-item">
  //                 <Progress
  //                   percent={progress}
  //                   showInfo={false}
  //                   status="active"
  //                   strokeColor={{ from: "#FF4D4F", to: "#FF9C6E" }}
  //                   strokeWidth={6}
  //                   style={{ flex: 1, borderRadius: "6px", margin: 0 }}
  //                 />
  //               </div>
  //             </>
  //           ),
  //         });

  //         setTimeout(updateProgress, 100);
  //       };

  //       setTimeout(updateProgress, 100);

  //       return prevModules.filter((module) => module.parentModuleCode !== moduleCode);
  //     }
  //     return prevModules;
  //   });
  // };

  // const restoreDeletedModule = (moduleCode: string) => {
  //   setDeletedModules((prevDeleted: any) => {
  //     const restoredModuleIndex = prevDeleted.findIndex(
  //       (module: any) => module.parentModuleCode == moduleCode
  //     );

  //     if (restoredModuleIndex == -1) return prevDeleted;

  //     const restoredModule = prevDeleted[restoredModuleIndex];
  //     const { originalIndex } = restoredModule;

  //     setSequencedModules((prevModules) => {
  //       const newModules = [...prevModules];
  //       newModules.splice(originalIndex, 0, restoredModule);
  //       return newModules;
  //     });

  //     return prevDeleted.filter((module: any) => module.parentModuleCode !== moduleCode);
  //   });
  // };

  const handleModalChange = (field: string, value: any) => {
    const updatedHoliday = { ...newHoliday, [field]: value };

    if (field == "module") {
      let selectedModules = value;
      const impact: Record<string, string> = {};
      if (selectedModules.includes("all")) {
        impact["all"] = "100";
      } else if (selectedModules.length > 0) {
        selectedModules.forEach((module: any) => {
          impact[module] = "100";
        });
      }
      updatedHoliday.impact = impact;
    }

    setNewHoliday(updatedHoliday);
  };

  const handleHolidaySave = async () => {
    const { from, to, holiday, module } = newHoliday;

    if (!from || !to || !holiday.trim() || module.length == 0) {
      notify.error("Please fill all required fields before saving.");
      return;
    }

    try {
      const holidayEntry = {
        ...newHoliday,
        id: Date.now().toString(),
        projectId: selectedProject.id,
        userGuiId: currentUser.guiId,
        orgId: currentUser.orgId,
        createdAt: new Date().toISOString()
      };
      await db.addHolidays(holidayEntry);
      setRows((prev: any) => [...prev, { ...holidayEntry, editing: false }]);
      setAddHolidayModalVisible(false);
      setNewHoliday({ from: null, to: null, holiday: "", module: [], impact: {}, projectId: null });
      fetchHolidays();
      notify.success("Holiday added successfully");
    } catch (err) {
      notify.error("Failed to save holiday. Try again.");
    }
  };

  const handleModalImpactChange = (module: string, value: string) => {
    const updatedImpact = { ...newHoliday.impact, [module]: value };
    setNewHoliday({ ...newHoliday, impact: updatedImpact });
  };

  const fetchAllLibrary = async (user: any) => {
    try {
      const libs = await db.getAllLibraries();
      setAllLibraries(libs.filter((lib: any) => lib.orgId == user.orgId));
      defaultSetup(libs);
    } catch (err) {
      console.error("Error fetching libraries:", err);
      setAllLibraries([]);
    }
  };

  const handleGroupLibChange = async (libraryId: any) => {
    try {
      const foundLibrary = libraries.find((lib: any) => lib.id == libraryId);
      if (!foundLibrary) {
        notify.error("Selected group not found.");
        return;
      }

      const baseProject = resolveSelectedProject();
      const projectId = selectedProjectId || baseProject?.id;
      if (!baseProject || !projectId) {
        notify.error("Selected project not found.");
        return;
      }

      if (projectId) {
        const existingLibrary = baseProject.initialStatus?.library;
        let confirmMessage = "";
        if (existingLibrary) {
          confirmMessage = `A group (${existingLibrary}) is already linked to this project. Do you want to replace it?`;
        } else {
          confirmMessage = "Do you want to link this group to your project?";
        }

        Modal.confirm({
          title: "Confirm Group Linking",
          content: confirmMessage,
          okText: "Yes",
          cancelText: "No",
          async onOk() {
            setSelectedLibraryId(libraryId);
            setSelectedLibrary(foundLibrary);
            setSelectedItems(foundLibrary.items);
            setSelectedGroupName(foundLibrary.name);
            setCurrentStep(0);

            const updatedProject = {
              ...baseProject,
              initialStatus: {
                ...baseProject.initialStatus,
                library: foundLibrary.name,
                items: foundLibrary.items,
                id: foundLibrary.id,
                guiId: foundLibrary.guiId,
                name: foundLibrary.name,
                mineType: foundLibrary.mineType,
                userGuiId: foundLibrary.userGuiId,
                orgId: foundLibrary.orgId,
                createdAt: foundLibrary.createdAt,
              },
            };

            const updatedProjects = allProjects.length
              ? allProjects.map((proj) => (proj.id == projectId ? updatedProject : proj))
              : [updatedProject];

            setAllProjects(updatedProjects);
            setSelectedProject(updatedProject);

            if (updatedProject) {
              await db.updateProject(projectId, updatedProject);
              notify.success("Group linked successfully!");
            }
          },
          onCancel() {
            setSelectedLibraryId(null);
            setSelectedLibrary(null);
            setSelectedItems([]);
            setSelectedGroupName("");
          }
        });
      }
    } catch (error) {
      console.error(error);
      notify.error("An error occurred while linking group.");
    }
  };

  const columns: any = [
    {
      title: "Module",
      dataIndex: "moduleName",
      key: "moduleName",
      width: "60%",
      align: "left",
    },
    {
      title: "Action",
      dataIndex: "action",
      key: "action",
      width: "20%",
      align: "center",
      render: (_: any, record: any, index: number) => {
        const isDisabled = index > 0 && selectedItems[index - 1].status !== "Completed";

        return (
          <Tooltip title={isDisabled ? "Complete the previous module first" : "Mark as Completed"}>
            <Select
              value={record.status == "Completed" ? "Yes" : "No"}
              style={{ width: "100%" }}
              onChange={(value) => handleStatusChange(index, value)}
              disabled={isDisabled}
            >
              <Option value="No">No</Option>
              <Option value="Yes">Yes</Option>
            </Select>
          </Tooltip>
        );
      },
    },
  ];

  const handleStatusChange = (index: number, value: string) => {
    setSelectedItems((prevItems: any) => {
      const next = prevItems.map((item: any, i: any) => {
        if (i < index) return item;
        if (i == index) return { ...item, status: value == "Yes" ? "Completed" : "Pending" };
        return { ...item, status: "Pending" };
      });
      syncSequencedFromSelectedItems(next);
      return next;
    });
  };

  const syncSequencedFromSelectedItems = (items: any[]) => {
    const filtered = (items || []).filter((it: any) => (it.status || "").toLowerCase() !== "completed");
    setSequencedModules(filtered);
    setModules(filtered);
    setActivitiesData(filtered.flatMap((m: any) => m.activities));
    setSelectedActivities(filtered.flatMap((m: any) => m.activities.map((a: any) => a.code)));
  };

  const handleGroupNameChange = async (newGroupName: string | undefined) => {
    try {
      if (!newGroupName) return;

      const foundLibrary = libraries.find((item: any) => item.name === newGroupName);
      if (!foundLibrary) {
        notify.error("Selected group not found.");
        return;
      }

      const baseProject = resolveSelectedProject();
      const projectId = selectedProjectId || baseProject?.id;
      if (!baseProject || !projectId) {
        notify.error("Selected project not found.");
        return;
      }

      if (projectId) {
        const existingLibrary = baseProject.initialStatus?.library;
        let confirmMessage = "";
        if (existingLibrary) {
          confirmMessage = `A group (${existingLibrary}) is already linked to this project. Do you want to replace it?`;
        } else {
          confirmMessage = "Do you want to link this group to your project?";
        }

        Modal.confirm({
          title: "Confirm Group Linking",
          content: confirmMessage,
          okText: "Yes",
          cancelText: "No",
          async onOk() {
            setSelectedGroupName(newGroupName);
            setSelectedItems(foundLibrary.items);
            setSelectedLibraryId(foundLibrary.id);
            setSelectedLibrary(foundLibrary);

            const updatedProject = {
              ...baseProject,
              initialStatus: {
                ...baseProject.initialStatus,
                library: foundLibrary.name,
                items: foundLibrary.items,
                id: foundLibrary.id,
                guiId: foundLibrary.guiId,
                name: foundLibrary.name,
                mineType: foundLibrary.mineType,
                userGuiId: foundLibrary.userGuiId,
                orgId: foundLibrary.orgId,
                createdAt: foundLibrary.createdAt,
              },
            };

            const updatedProjects = allProjects.length
              ? allProjects.map((proj) => (proj.id == projectId ? updatedProject : proj))
              : [updatedProject];

            setAllProjects(updatedProjects);
            setSelectedProject(updatedProject);

            if (updatedProject) {
              await db.updateProject(projectId, updatedProject);
              notify.success("Group linked successfully!");
            }
          },
          onCancel() {
            console.log("User cancelled linking group.");
          },
        });
      }
    } catch (error) {
      console.error(error);
      notify.error("An error occurred while linking group.");
    }
  };

  const [deleteModuleModal, setDeleteModuleModal] = useState<{
    visible: boolean;
    module: any | null;
  }>({ visible: false, module: null });

  const [deleteActivityModal, setDeleteActivityModal] = useState<{
    visible: boolean;
    module: any | null;
    activity: any | null;
  }>({ visible: false, module: null, activity: null });

  const confirmDeleteModule = (moduleCode: string) => {
    const module = sequencedModules.find(
      (m: any) => m.parentModuleCode === moduleCode
    );
    if (!module) return;

    const hasCompletedActivities = module.activities?.some(
      (a: any) =>
        a.activityStatus === "completed" ||
        a.activityStatus === "inprogress" ||
        a.fin_status === "completed"
    );

    if (hasCompletedActivities) {
      notify.warning(
        "Cannot delete module with completed or in-progress activities."
      );
      return;
    }

    setDeleteModuleModal({ visible: true, module });
  };

  const confirmDeleteActivity = (activityCode: string) => {
    const module = sequencedModules.find((m: any) =>
      (m.activities || []).some((a: any) => a.code === activityCode)
    );
    const activity = module?.activities?.find(
      (a: any) => a.code === activityCode
    );

    if (!module || !activity) return;

    const isCompleted =
      activity.activityStatus === "completed" ||
      activity.activityStatus === "inprogress" ||
      activity.fin_status === "completed";

    if (isCompleted) {
      notify.warning("Completed or in-progress activities cannot be deleted.");
      return;
    }

    setDeleteActivityModal({
      visible: true,
      module,
      activity,
    });
  };

  const handleDeleteModuleOk = async () => {
    const module = deleteModuleModal.module;
    if (!module || !selectedProject || !selectedProjectId) return;

    const moduleCode = module.parentModuleCode;
    const removedCodes = (module.activities || []).map((activity: any) => activity.code);
    const filteredSequenced = sequencedModules.filter(
      (m: any) => m.parentModuleCode !== moduleCode
    );
    const updatedSequenced = recalculateTimeline(
      removePrerequisiteReferences(filteredSequenced, removedCodes)
    );
    commitTimelineState(updatedSequenced);

    setSelectedActivities(prev =>
      prev.filter(
        code => !module.activities?.some((a: any) => a.code === code)
      )
    );

    let updatedInitialStatus = selectedProject.initialStatus;
    if (selectedProject.initialStatus?.items) {
      const newItems = selectedProject.initialStatus.items.filter(
        (m: any) => m.parentModuleCode !== moduleCode
      );
      const sanitizedItems = removePrerequisiteReferences(newItems, removedCodes);

      updatedInitialStatus = {
        ...selectedProject.initialStatus,
        items: sanitizedItems,
      };
    }

    const updatedProject = {
      ...selectedProject,
      initialStatus: updatedInitialStatus,
      processedTimelineData: updatedSequenced,
    };

    setSelectedProject(updatedProject);

    if (isUpdateMode && selectedTimelineId) {
      await db.updateProjectTimeline(selectedTimelineId, updatedSequenced);
    }

    await db.updateProject(selectedProjectId, updatedProject);

    notify.success("Module permanently deleted.");
    setDeleteModuleModal({ visible: false, module: null });
  };

  const handleDeleteModuleCancel = () => {
    setDeleteModuleModal({ visible: false, module: null });
  };

  const handleDeleteActivityOk = async () => {
    const { module, activity } = deleteActivityModal;
    if (!module || !activity || !selectedProject || !selectedProjectId) return;

    const activityCode = activity.code;
    const parentModuleCode = module.parentModuleCode;

    const filteredSequenced = sequencedModules
      .map((m: any) =>
        m.parentModuleCode === parentModuleCode
          ? {
            ...m,
            activities: (m.activities || []).filter(
              (a: any) => a.code !== activityCode
            ),
          }
          : m
      )
      .filter((m: any) => (m.activities || []).length > 0);
    const updatedSequenced = recalculateTimeline(
      removePrerequisiteReferences(filteredSequenced, [activityCode])
    );
    commitTimelineState(updatedSequenced);

    setSelectedActivities(prev =>
      prev.filter(code => code !== activityCode)
    );

    let updatedInitialStatus = selectedProject.initialStatus;

    if (selectedProject.initialStatus?.items) {
      const newItems = selectedProject.initialStatus.items
        .map((m: any) =>
          m.parentModuleCode === parentModuleCode
            ? {
              ...m,
              activities: (m.activities || []).filter(
                (a: any) => a.code !== activityCode
              ),
            }
            : m
        )
        .filter((m: any) => (m.activities || []).length > 0);
      const sanitizedItems = removePrerequisiteReferences(newItems, [activityCode]);

      updatedInitialStatus = {
        ...selectedProject.initialStatus,
        items: sanitizedItems,
      };
    }

    const updatedProject = {
      ...selectedProject,
      initialStatus: updatedInitialStatus,
      processedTimelineData: updatedSequenced,
    };

    setSelectedProject(updatedProject);

    if (isUpdateMode && selectedTimelineId) {
      await db.updateProjectTimeline(selectedTimelineId, updatedSequenced);
    }

    await db.updateProject(selectedProjectId, updatedProject);

    notify.success("Activity permanently deleted.");
    setDeleteActivityModal({ visible: false, module: null, activity: null });
  };

  const handleDeleteActivityCancel = () => {
    setDeleteActivityModal({ visible: false, module: null, activity: null });
  };

  const openAddActivityModal = (moduleCode: string) => {
    setActiveModuleId(moduleCode);
    const module: any = sequencedModules.find(
      (m: any) => m.parentModuleCode === moduleCode
    );
    const activities = module?.activities || [];
    const lastActivity = activities[activities.length - 1];

    addActivityForm.setFieldsValue({
      activity_name: "",
      prerequisite: lastActivity?.code ? [lastActivity.code] : [],
    });

    setIsAddActivityModalOpen(true);
  };

  const getProjectTimeline = async (timelineId: any) => {
    if (!timelineId) return [];

    try {
      const raw = await db.getProjectTimelineById(timelineId);

      if (!raw) return [];

      let timeline = Array.isArray(raw) ? raw : Array.isArray(raw.data) ? raw.data : [];

      if (!Array.isArray(timeline)) {
        handleLibraryChange([]);
        return [];
      }

      handleLibraryChange(timeline);
      return timeline;
    } catch (err) {
      console.error("Error fetching timeline:", err);
      return [];
    }
  };

  const handleSaveActivity = async () => {
    try {
      const values = await addActivityForm.validateFields();
      const { activity_name, prerequisite } = values;

      if (!activeModuleId || !selectedProjectId || !selectedProject) return;

      const module = sequencedModules.find(
        (m: any) => m.parentModuleCode === activeModuleId
      );

      if (!module) {
        notify.error("Selected module not found.");
        return;
      }

      const activities = module.activities || [];

      let newCode: string;

      if (activities.length === 0) {
        newCode = `${activeModuleId}/10`;
      } else {
        const lastActivity = activities[activities.length - 1];
        const lastCode = lastActivity.code || "";

        const parts = lastCode.split("/");
        const prefix = parts.slice(0, -1).join("/") || activeModuleId;
        const lastNumRaw = parts[parts.length - 1];
        const lastNum = parseInt(lastNumRaw, 10);

        if (!isNaN(lastNum)) {
          const nextNum = lastNum + 10;
          newCode = `${prefix}/${nextNum}`;
        } else {
          newCode = `${activeModuleId}/10`;
        }
      }

      const newActivity: Activity = setActivityPrerequisites({
        code: newCode,
        activityName: activity_name,
        slack: "0",
        level: "",
        duration: "1",
        start: null,
        end: null,
        activityStatus: "",
        guicode: uuidv4(),
        holidays: [],
      }, prerequisite, { manual: true });

      const validation = validateActivityPrerequisites({
        activities,
        activityCode: newCode,
        selectedPrerequisites: prerequisite,
        enforceSequence: shouldEnforcePrerequisiteSequence(module, newActivity),
      });

      if (!validation.valid) {
        notify.error(validation.message);
        return;
      }

      const updatedSequenced = sequencedModules.map((m: any) =>
        m.parentModuleCode === activeModuleId
          ? { ...m, activities: [...(m.activities || []), newActivity] }
          : m
      );
      const recalculated = recalculateTimeline(updatedSequenced);
      commitTimelineState(recalculated);

      setActivitiesData(
        recalculated.flatMap((m: any) => m.activities || [])
      );

      setSelectedActivities(
        recalculated.flatMap((m: any) =>
          (m.activities || []).map((a: any) => a.code)
        )
      );

      let updatedInitialStatus = selectedProject.initialStatus;

      if (selectedProject.initialStatus?.items) {
        const updatedItems = selectedProject.initialStatus.items.map((m: any) =>
          m.parentModuleCode === activeModuleId
            ? {
              ...m,
              activities: [...(m.activities || []), newActivity],
            }
            : m
        );

        updatedInitialStatus = {
          ...selectedProject.initialStatus,
          items: updatedItems,
        };
      }

      const updatedProject = {
        ...selectedProject,
        initialStatus: updatedInitialStatus,
        processedTimelineData: recalculated,
      };

      setSelectedProject(updatedProject);

      if (isUpdateMode && selectedTimelineId) {
        await db.updateProjectTimeline(selectedTimelineId, recalculated);
      }

      await db.updateProject(selectedProjectId, updatedProject);

      navigate(".", {
        replace: true,
        state: {
          ...(location.state || {}),
          selectedProject: updatedProject,
        },
      });

      notify.success("Activity added successfully");
      setIsAddActivityModalOpen(false);
      addActivityForm.resetFields();
      setActiveModuleId(null);
    } catch (err) {
      console.error(err);
      notify.error("Failed to add activity. Please try again.");
    }
  };

  return (
    <>
      <div className="time-builder-root">
        <div className="time-builder-page">
          <div className="time-builder-topbar">
            <div className="title-and-filter">
              <div className="heading">
                <p className="page-heading-title">
                  {isReplanMode ? "Replan Timeline" : isUpdateMode ? "Edit Timeline" : "Timeline Builder"}
                </p>
                <span className="pl-subtitle">Design project timelines with sequencing and dependencies</span>
              </div>

              <div>
                {(allProjects.length > 0 || selectedProject) && (
                  <div className="filters-wrap">
                    <div className="filters">
                      <div className="form-row-top">
                        <label>Select Project</label>
                        <Select
                          placeholder="Select Project"
                          disabled={isUpdateMode}
                          value={isUpdateMode ? selectedProjectName : selectedProjectId}
                          onChange={handleProjectChange}
                          className="tb-select-min"
                        >
                          {allProjects.map((project) => (
                            <Option key={project.id} value={project.id}>
                              {project.projectParameters.projectName}
                            </Option>
                          ))}
                        </Select>
                      </div>

                      <div className="form-row-top">
                        <label>Select Mine Type</label>
                        <Input
                          value={selectedProjectMineType}
                          placeholder="Project Mine Type"
                          disabled
                          className="tb-input-min"
                          style={{padding:"2px 10px"}}
                        />
                      </div>

                      <div className="form-row-top">
                        <label>Link Library</label>
                        <Select
                          placeholder="Select Library"
                          disabled={!selectedProjectId}
                          value={selectedLibraryId}
                          onChange={handleGroupLibChange}
                          className="tb-select-min"
                        >
                          {(libraries || []).map((lib: any) => (
                            <Option key={lib.id} value={lib.id}>
                              {lib.name}
                            </Option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {(isUpdateMode || isMenualTimeline) && (
              <div className="tb-discard-wrap">
                <Button
                  type="primary"
                  disabled={!selectedProjectId}
                  icon={<CloseCircleOutlined />}
                  onClick={() => setIsCancelEditModalVisiblVisible(true)}
                  className="tb-discard-btn"
                >
                  Discard
                </Button>
              </div>
            )}
          </div>

          {/* <hr className="tb-divider" /> */}
          <div className="timeline-main-body-container">

            {selectedProject != null && isMenualTimeline && (
              <div className="timeline-steps">
                <Steps current={currentStep}>
                  <Step title="Initial Status" />
                  <Step title="Sequencing" />
                  <Step title="Activities & Duration" />
                  <Step title="Prerequisites" />
                  <Step title="Slack" />
                  <Step title="Holiday" />
                  <Step title="Start Date" />
                  <Step title="Project Timeline" />
                </Steps>
              </div>
            )}

            {selectedProject != null && isMenualTimeline ? (
              <div className="main-item-container">
                <div className="timeline-items">
                  {currentStep == 0 ? (
                    <div>
                      <Form className="select-module-group" layout="horizontal">
                        <Row gutter={[16, 16]}>
                          <Col span={24}>
                            <Form.Item
                              colon={false}
                              label="Select Group"
                              labelAlign="left"
                              labelCol={{ span: 6 }}
                              wrapperCol={{ span: 18 }}
                              className="tb-form-item-lg"
                            >
                              <Select value={selectedGroupName} onChange={handleGroupNameChange} allowClear={true}>
                                {libraries.map((lib: any) => (
                                  <Select.Option key={lib.name} value={lib.name}>
                                    {lib.name}
                                  </Select.Option>
                                ))}
                              </Select>
                            </Form.Item>
                          </Col>
                        </Row>
                      </Form>

                      <Table
                        columns={columns}
                        dataSource={selectedItems}
                        pagination={false}
                        rowKey="moduleName"
                        className="project-timeline-table"
                      />
                    </div>
                  ) : currentStep == 1 ? (
                    <DragDropContext onDragEnd={onDragEnd}>
                      <Droppable droppableId="modules">
                        {(provided) => (
                          <div {...provided.droppableProps} ref={provided.innerRef}>
                            {sequencedModules.map((module, index) => (
                              <Draggable key={module.parentModuleCode} draggableId={module.parentModuleCode} index={index}>
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className="tb-draggable-item"
                                    style={provided.draggableProps.style}
                                  >
                                    <strong>{module.parentModuleCode}</strong> {module.moduleName}
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  ) : currentStep == 5 ? (
                    <div>
                      <div className="holiday-actions">
                        <div className="st-sun-field">
                          <Checkbox
                            className="saturday-sunday-checkbox"
                            checked={isSaturdayWorking}
                            onChange={(e) => setIsSaturdayWorking(e.target.checked)}
                          >
                            Saturday Working
                          </Checkbox>
                          <Checkbox
                            className="saturday-sunday-checkbox"
                            checked={isSundayWorking}
                            onChange={(e) => setIsSundayWorking(e.target.checked)}
                          >
                            Sunday Working
                          </Checkbox>
                        </div>

                        {holidayData.length > 0 && (
                          <div className="add-new-holiday">
                            <Button
                              type="primary"
                              className="bg-secondary"
                              size="small"
                              onClick={() => {
                                setNewHoliday((prev) => ({
                                  ...prev,
                                  userGuiId: currentUser?.guiId,
                                  orgId: currentUser?.orgId,
                                  createdAt: new Date().toISOString(),
                                }));
                                setAddHolidayModalVisible(true);
                              }}
                            >
                              Add New Holiday
                            </Button>
                          </div>
                        )}
                      </div>

                      {holidayData.length > 0 ? (
                        <Table
                          className="project-timeline-table"
                          dataSource={isUpdateMode ? finalHolidays : holidayData}
                          columns={holidayColumns}
                          pagination={false}
                          scroll={{ y: "calc(100vh - 350px)" }}
                        />
                      ) : (
                        <div className="tb-center">
                          <Result
                            icon={<CalendarOutlined className="tb-result-icon" />}
                            title="No Holiday Records Found"
                            subTitle="You haven't added any holidays yet. Click below to add one."
                            extra={
                              <Button
                                type="primary"
                                className="bg-secondary"
                                size="large"
                                onClick={() => setAddHolidayModalVisible(true)}
                              >
                                Add Holiday
                              </Button>
                            }
                          />
                        </div>
                      )}
                    </div>
                  ) : currentStep == 7 || currentStep == 8 ? (
                    <div className="tb-hide-x">
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
                            setExpandedKeys(
                              expanded ? [...expandedKeys, record.key] : expandedKeys.filter((key: any) => key !== record.key)
                            );
                          },
                        }}
                        rowClassName={(record) => (record.isModule ? "module-header" : "activity-row")}
                        bordered
                        scroll={{ x: "max-content", y: "calc(100vh - 320px)" }}
                      />
                    </div>
                  ) : (
                    <div>
                      <Table
                        columns={getOuterTableColumns(currentStep)}
                        className="project-timeline-table"
                        dataSource={sequencedModules}
                        pagination={false}
                        sticky={{ offsetHeader: 0 }}
                        showHeader={currentStep <= 3}
                        rowClassName={(record) => (record.activities ? "module-heading" : "")}
                        expandedRowKeys={expandedRowKeys}
                        onExpand={(expanded, record) => {
                          setExpandedRowKeys(
                            expanded
                              ? [...expandedRowKeys, record.parentModuleCode]
                              : expandedRowKeys.filter((key) => key !== record.parentModuleCode)
                          );
                        }}
                        expandable={{
                          expandedRowRender: (module) => (
                            <div>
                              {(isUpdateMode || isReplanMode) && (
                                <div className="tb-align-right tb-mb-8 project-timeline-table tb-hide-x">
                                  <Button
                                    type="dashed"
                                    size="small"
                                    icon={<PlusOutlined />}
                                    onClick={() => openAddActivityModal(module.parentModuleCode)}
                                  >
                                    Add Activity
                                  </Button>
                                </div>
                              )}

                              <Table
                                columns={getColumnsForStep(currentStep)}
                                dataSource={module.activities}
                                pagination={false}
                                showHeader={currentStep > 3}
                                bordered
                                sticky
                                className={`tb-hide-x ${currentStep > 3 ? "tb-inner-activity-table" : ""}`}
                              />
                            </div>
                          ),
                          rowExpandable: (module) => module.activities.length > 0,
                        }}
                        scroll={{ y: `${window.innerHeight - 350}px` }}
                        rowKey="parentModuleCode"
                      />
                    </div>
                  )}
                </div>

                <hr className="tb-divider" />

                <div className={`action-buttons ${currentStep == 0 ? "float-right" : ""}`}>
                  {currentStep > 0 && (
                    <Button className="bg-tertiary" onClick={handlePrev} size="small">
                      Previous
                    </Button>
                  )}

                  <Button
                    disabled={selectedProjectId == null || !isNextStepAllowed()}
                    className="bg-secondary"
                    onClick={() => {
                      if (currentStep == 7 && !isUpdateMode) {
                        setIsReviewModalVisible(true);
                      } else {
                        handleNext();
                      }
                    }}
                    type="primary"
                    size="small"
                  >
                    {currentStep == 7 ? (isUpdateMode ? "Update" : "Save") : currentStep == 7 && !isUpdateMode ? "Send For Review" : "Next"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="container">
                <div className="no-project-message">
                  {allProjects.length == 0 ? (
                    <>
                      <h3>No Projects Available</h3>
                      <p>Start by creating a new project to define a timeline.</p>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => navigate("/create/register-new-project")}
                        className="bg-secondary"
                      >
                        Create Project
                      </Button>
                    </>
                  ) : !selectedProject ? (
                    <>
                      <ExclamationCircleOutlined className="tb-empty-icon" />
                      <h3>No Project Selected</h3>
                      <p>Please select a project to continue.</p>
                    </>
                  ) : (
                    <>
                      <ClockCircleOutlined className="tb-empty-icon" />
                      <h3>Manage Your Timeline</h3>
                      <p>Choose an option below to proceed !</p>
                      <div className="tb-empty-actions">
                        <Button
                          type="primary"
                          disabled={!selectedGroupName}
                          icon={<LinkOutlined />}
                          onClick={() => setOpenExistingTimelineModal(true)}
                          className="tb-link-existing-btn"
                        >
                          Link Existing Timeline
                        </Button>
                        <Button
                          type="primary"
                          disabled={!selectedGroupName}
                          icon={<FolderOpenOutlined />}
                          onClick={() => setIsMenualTimeline(true)}
                          className="tb-create-manual-btn"
                        >
                          Create Timeline Manually
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      <Modal
        title="Confirm Discard Changes"
        visible={isCancelEditModalVisible}
        onOk={handleCancelUpdateProjectTimeline}
        onCancel={() => setIsCancelEditModalVisiblVisible(false)}
        okText="Yes, Discard"
        cancelText="Cancel"
        className="modal-container"
        okButtonProps={{ className: "bg-secondary" }}
      >
        <p style={{ padding: "10px" }}>
          Are you sure you want to exit? Any unsaved changes will be lost.
        </p>
      </Modal>

      <Modal
        title="Link Existing Project Timeline"
        visible={openExistingTimelineModal}
        onCancel={() => setOpenExistingTimelineModal(false)}
        className="modal-container"
        footer={
          allProjectsTimelines.length > 0 ? (
            <Button
              key="save"
              onClick={handleLinkProjectTimeline}
              className="bg-secondary"
            >
              Save
            </Button>
          ) : (
            <Button
              key="create"
              onClick={() => { setIsMenualTimeline(true); setOpenExistingTimelineModal(false) }}
              type="primary"
              className="bg-secondary"
            >
              Create Manually
            </Button>
          )
        }
      >
        <div style={{ padding: "0px 10px 10px 5px" }}>
          <div className="filters" style={{ marginTop: "8px" }}>
            {allProjectsTimelines.length > 0 ? (
              <>
                <span style={{ marginLeft: "10px", fontSize: "16px", fontWeight: "400", minWidth: 120 }}>Select Project</span>
                <Select
                  placeholder="Select Project"
                  disabled={isUpdateMode}
                  value={selectedExistingProjectId}
                  onChange={handleExistingProjectChange}
                  style={{ width: "100%" }}
                  allowClear={true}
                >
                  {allProjectsTimelines.map((project) => (
                    <Option key={project.id} value={project.id}>
                      {project.projectParameters.projectName}
                    </Option>
                  ))}
                </Select>
              </>
            ) : (
              <p style={{ marginLeft: "10px", marginTop: "10px" }}>No existing project timelines found.</p>
            )}
          </div>
        </div>
        <hr />
      </Modal>

      <Modal
        title="Add New Holiday"
        visible={isAddHolidayModalVisible}
        onCancel={() => setAddHolidayModalVisible(false)}
        onOk={handleHolidaySave}
        okText="Save"
        cancelText="Cancel"
        className="modal-container"
        maskClosable={false}
        keyboard={false}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "10px" }}>
          <DatePicker
            value={newHoliday.from}
            onChange={(date) => handleModalChange("from", date)}
            placeholder="From Date"
            style={{ width: "100%" }}
          />
          <DatePicker
            value={newHoliday.to}
            onChange={(date) => handleModalChange("to", date)}
            placeholder="To Date"
            style={{ width: "100%" }}
          />
          <Input
            value={newHoliday.holiday}
            onChange={(e) => handleModalChange("holiday", e.target.value)}
            placeholder="Holiday Name"
          />
          <Select
            mode="multiple"
            value={newHoliday.module}
            onChange={(value) => handleModalChange("module", value)}
            placeholder="Select Modules"
            style={{ width: "100%" }}
          >
            <Select.Option key="all" value="all">
              Select All
            </Select.Option>
            {moduleOptions.map((module) => (
              <Select.Option key={module} value={module}>
                {module}
              </Select.Option>
            ))}
          </Select>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            {Object.entries(newHoliday.impact).map(([module, impact]) => (
              <Box key={module} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography>{module}</Typography>
                <Input
                  value={impact as any}
                  onChange={(e) => handleModalImpactChange(module, e.target.value)}
                  style={{ width: "60px" }}
                />
              </Box>
            ))}
          </Box>
        </div>
      </Modal>

      <Modal
        title="Select Reviewer"
        visible={isReviewModalVisible}
        onOk={() => {
          if (selectedReviewerId) {
            setIsReviewModalVisible(false);
            handleNext();
          } else {
            notify.warning("Please select a reviewer.");
          }
        }}
        onCancel={() => setIsReviewModalVisible(false)}
        okText="Send"
        cancelText="Cancel"
        className="modal-container"
      >
        <div style={{ padding: "0px 10px" }}>
          <Select
            showSearch
            placeholder="Select a reviewer"
            value={selectedReviewerId}
            onChange={(value) => setSelectedReviewerId(value)}
            style={{ width: "100%" }}
            optionFilterProp="children"
            filterOption={(input: any, option: any) =>
              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
          >
            {userOptions
              .filter((user: any) => user.orgId == currentUser.orgId)
              .map((user: any) => (
                <Option key={user.id} value={user.id}>
                  {user.name}
                </Option>
              ))}
          </Select>
        </div>

      </Modal>

      <Modal
        title="Delete Entire Module"
        visible={deleteModuleModal.visible}
        onOk={handleDeleteModuleOk}
        onCancel={handleDeleteModuleCancel}
        okText="Delete"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
        className="modal-container"
        style={{ borderRadius: 8, padding: 20 }}
        centered
      >
        <p style={{ padding: "10px" }}>
          Are you sure you want to delete the entire module{" "}
          <strong>{deleteModuleModal.module?.moduleName}</strong> and all its
          activities?
        </p>
      </Modal>

      <Modal
        title="Delete Activity"
        visible={deleteActivityModal.visible}
        onOk={handleDeleteActivityOk}
        onCancel={handleDeleteActivityCancel}
        okText="Delete"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
        className="modal-container"
        centered
      >
        <p style={{ padding: "10px" }}>
          Are you sure you want to delete activity "
          {deleteActivityModal.activity?.activityName ||
            deleteActivityModal.activity?.code}
          " from module "
          {deleteActivityModal.module?.moduleName}"?
        </p>
      </Modal>

      <Modal
        title="Add Activity"
        open={isAddActivityModalOpen}
        onOk={handleSaveActivity}
        onCancel={() => {
          setIsAddActivityModalOpen(false);
          addActivityForm.resetFields();
          setActiveModuleId(null);
        }}
        okText="Save"
        cancelText="Cancel"
        destroyOnClose
      >
        <Form form={addActivityForm} layout="vertical">
          <Form.Item
            label="Activity Name"
            name="activity_name"
            rules={[{ required: true, message: "Please enter activity name" }]}
          >
            <Input placeholder="Enter activity name" />
          </Form.Item>

          <Form.Item label="Prerequisite" name="prerequisite">
            <Select
              mode="multiple"
              placeholder="Select prerequisite activity(s)"
              allowClear
              options={(() => {
                const module = sequencedModules.find(
                  (m: any) => m.parentModuleCode === activeModuleId
                );
                const activities = module?.activities || [];
                const nextCode = activities.length
                  ? (() => {
                    const lastCode = activities[activities.length - 1]?.code || "";
                    const parts = lastCode.split("/");
                    const prefix = parts.slice(0, -1).join("/") || activeModuleId || "";
                    const lastNum = parseInt(parts[parts.length - 1], 10);
                    return !isNaN(lastNum) ? `${prefix}/${lastNum + 10}` : `${activeModuleId}/10`;
                  })()
                  : `${activeModuleId}/10`;

                return getAllowedPrerequisiteOptions(nextCode, activities, module);
              })()}
            >
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <ToastContainer />
    </>
  );
};

export default TimeBuilder;
