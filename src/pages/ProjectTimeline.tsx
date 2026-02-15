import { useEffect, useMemo, useState } from "react";
import "../styles/project-timeline.css";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { FolderOpenOutlined } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { Button, Select, Modal, Input, Table, Tooltip, Space, List, Tag } from "antd";
import { ClockCircleOutlined, DownloadOutlined, DownOutlined, InfoCircleOutlined, LikeOutlined, ShareAltOutlined, SyncOutlined, UserOutlined } from "@ant-design/icons";
import eventBus from "../Utils/EventEmitter";
import { db } from "../Utils/dataStorege.ts";
import { getCurrentUser } from '../Utils/moduleStorage';
import { Spin } from 'antd';
import { Tabs } from 'antd';
const { TabPane } = Tabs;
import type { ActivityBudget, ActivityCost } from "../Utils/dataStorege";
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

import { Dropdown } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import { notify } from "../Utils/ToastNotify.tsx";
import { ToastContainer } from "react-toastify";

const tabs = [
    "All",
    "In-Progress",
    "Completed",
    "Upcoming 1 Month",
    "Recent Completed",
    "Yet To Start",
    "Can be started with in a week"
];
const ProjectTimeline = (project: any) => {

    const navigate = useNavigate();
    const [expandedKeys, setExpandedKeys] = useState<any>([]);
    const [allProjects, setAllProjects] = useState<any>([]);
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [sequencedModules, setSequencedModules] = useState<Module[]>([]);
    const [dataSource, setDataSource] = useState<any>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [selectedProjectTimeline, setSelectedProjectTimeline] = useState<any>([]);
    const [selectedVersionId, setSelectedVersionId] = useState(null);
    const [allVersions, setAllVersions] = useState<any>();
    const [statusFilter, _setStatusFilter] = useState(null);
    const [plannedDate, _setPlannedDate] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedActivityKey, setSelectedActivityKey] = useState<string | null>(null);
    const [noteModalVisible, setNoteModalVisible] = useState(false);
    const [_noteInput, setNoteInput] = useState('');
    const [_editNoteId, setEditNoteId] = useState<string | null>(null);
    const [selectedActivity, setSelectedActivity] = useState<any>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState(0);
    const [activityBudget, setActivityBudget] = useState<ActivityBudget | null>(null);
    const [budgetLoading, setBudgetLoading] = useState(false);
    const [detailsActiveTab, setDetailsActiveTab] = useState<string>('notes');
    const [activityCost, setActivityCost] = useState<ActivityCost | null>(null);
    const [costLoading, setCostLoading] = useState(false);
    const [assignedUsers, setAssignedUsers] = useState<string[]>([]);
    const [usersOptions, setUsersOptions] = useState<any[]>([]);


    const showModal = () => {
        setIsModalOpen(true);
    };

    const handleCancel = () => {
        setIsModalOpen(false);
        setEmail("");
    };

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
        if (!currentUser?.orgId) return;

        (async () => {
            try {
                const allUsers = await db.getUsers();
                const orgUsers = (allUsers || []).filter(
                    (usr: any) => usr.orgId === currentUser.orgId
                );
                setUsersOptions(orgUsers);
            } catch (err) {
                console.error("Error fetching users:", err);
                setUsersOptions([]);
            }
        })();
    }, [currentUser]);

    const getProjectTimeline = async (project: any) => {
        if (Array.isArray(project?.projectTimeline)) {
            try {
                const latestVersionId = localStorage.getItem("latestProjectVersion");
                const foundTimeline = project?.projectTimeline.filter((item: any) => item.version == latestVersionId);
                const timelineId = !latestVersionId ? project.projectTimeline[0].timelineId : foundTimeline[0].timelineId;
                const timeline = await db.getProjectTimelineById(timelineId);
                if (timeline[0]?.orgId != currentUser.orgId) return;
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
            const storedData: any = (await db.getProjects()).filter((p) => p.id == project.code && p.orgId == currentUser.orgId);
            setAllProjects(storedData);
            let selectedProject = null;
            selectedProject = storedData[0];
            setSelectedProject(selectedProject);
            if (storedData[0].projectTimeline) {
                if (storedData != null) {
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
                    addedUserEmail: version.addedUserEmail,
                    currentStatus: version.currentStatus ? version.currentStatus : '',
                    createdAt: version.createdAt || new Date().toISOString(),
                    updatedAt: version.updatedAt || new Date().toISOString(),
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
            }

        } catch (error) {
            console.error("An unexpected error occurred while fetching projects:", error);
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

            rowIndex++;
            module.activities.forEach((activity, activityIndex) => {
                const row = worksheet.addRow([
                    `${moduleIndex + 1}.${activityIndex + 1}`,
                    activity.activityName,
                    activity.duration || 0,
                    activity.actualDuration || 0,
                    activity.prerequisite || "-",
                    activity.slack || 0,
                    activity.start ? dayjs(activity.start).format("DD-MM-YYYY") : "-",
                    activity.end ? dayjs(activity.end).format("DD-MM-YYYY") : "-",
                    activity.actualStart ? dayjs(activity.actualStart).format("DD-MM-YYYY") : "-",
                    activity.actualFinish ? dayjs(activity.actualFinish).format("DD-MM-YYYY") : "-",
                    activity.activityStatus || "-",
                ]);

                row.eachCell((cell: any) => {
                    Object.assign(cell, dataRowStyle);
                });
                if (activityIndex % 2 === 0) {
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

    const handleLibraryChange = (libraryItems: any) => {
        if (libraryItems) {
            setSequencedModules(libraryItems);
            let editingRequired = false;
            const finDataSource = libraryItems.map((module: any, moduleIndex: number) => {
                const children = (module.activities || []).map((activity: any, actIndex: number) => {
                    if (activity.activityStatus === "completed" || activity.activityStatus === "inProgress") {
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

    const baseColumns: ColumnsType = [
        { title: "Sr No", dataIndex: "Code", key: "Code", width: 100, align: "center" },
        {
            title: "Key Activity",
            dataIndex: "keyActivity",
            key: "keyActivity",
            width: 350,
            align: "left",
            render: (_, record) => {
                const {
                    activityStatus, keyActivity, duration, actualStart, actualFinish, plannedStart, plannedFinish,
                } = record;

                const plannedStartDate = plannedStart ? dayjs(plannedStart, 'DD-MM-YYYY') : null;
                const actualStartDate = actualStart ? dayjs(actualStart, 'DD-MM-YYYY') : null;
                const plannedFinishDate = plannedFinish ? dayjs(plannedFinish, 'DD-MM-YYYY') : null;
                const actualFinishDate = actualFinish ? dayjs(actualFinish, 'DD-MM-YYYY') : null;

                let iconSrc = '';
                const isStartSame = plannedStartDate && actualStartDate && plannedStartDate.isSame(actualStartDate, 'day');
                const isFinishSame = plannedFinishDate && actualFinishDate && plannedFinishDate.isSame(actualFinishDate, 'day');
                const isWithinPlannedDuration =
                    plannedStartDate && plannedFinishDate && actualStartDate &&
                    getBusinessDays(actualStartDate, dayjs()) <= getBusinessDays(plannedStartDate, plannedFinishDate);

                if (activityStatus === 'completed') {
                    const isCompletedOnTime = isStartSame && isFinishSame;
                    iconSrc = isCompletedOnTime ? '/images/icons/completed.png' : '/images/icons/overdue.png';
                } else if (activityStatus === 'inProgress') {
                    iconSrc = isWithinPlannedDuration ? '/images/icons/inprogress.png' : '/images/icons/overdue.png';
                } else {
                    iconSrc = '/images/icons/yettostart.png';
                }

                return (
                    <span
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                        onClick={() => {
                            if (record.duration != undefined)
                                setSelectedActivityKey(prevKey => prevKey === record.key ? null : record.key);
                        }}
                    >

                        {!record.isModule && (
                            <span
                                onClick={(e) => openActivityModal(record, e)}
                            >
                                <InfoCircleOutlined style={{ fontSize: 22, color: '#1890ff' }} />
                            </span>
                        )}
                        {duration ? (
                            <img src={iconSrc} alt={activityStatus} style={{ width: 34, height: 34 }} />
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
            width: 100,
            align: "center",
            render: (_, record) => `${record.duration ? record.duration : ''}`
        },
        { title: "Pre-Requisite", dataIndex: "preRequisite", key: "preRequisite", width: 220, align: "center" },
        { title: "Slack", dataIndex: "slack", key: "slack", width: 180, align: "center" },
        { title: "Planned Start", dataIndex: "plannedStart", key: "plannedStart", width: 180, align: "center" },
        { title: "Planned Finish", dataIndex: "plannedFinish", key: "plannedFinish", width: 180, align: "center" },
    ];

    function getBusinessDays(start: dayjs.Dayjs, end: dayjs.Dayjs): number {
        let count = 0;
        let current = start.clone();

        while (current.isBefore(end, 'day') || current.isSame(end, 'day')) {
            const day = current.day();
            if (day !== 0 && day !== 6) {
                count++;
            }
            current = current.add(1, 'day');
        }

        return count;
    }

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

    const editingColumns: ColumnsType = [
        {
            title: "Actual/Expected Duration",
            key: "durations",
            width: 250,
            align: "center",
            render: (_, record) => {
                const { actualStart, actualFinish, duration } = record;

                const start = actualStart && dayjs(actualStart, 'DD-MM-YYYY').isValid()
                    ? dayjs(actualStart, 'DD-MM-YYYY')
                    : null;
                const finish = actualFinish && dayjs(actualFinish, 'DD-MM-YYYY').isValid()
                    ? dayjs(actualFinish, 'DD-MM-YYYY')
                    : null;

                const calculatedDuration = start && finish ? getWorkingDaysDiff(start, finish) : null;
                const displayDuration = calculatedDuration ?? duration;

                return displayDuration != null ? `${displayDuration} days` : "";
            }
        },
        {
            title: "Status",
            dataIndex: "activityStatus",
            key: "activityStatus",
            width: 150,
            align: "center",
            render: (_, record) => getStatusTag(record.activityStatus),
        },
        {
            title: "Actual / Expected Start",
            dataIndex: "actualStart",
            key: "actualStart",
            width: 180,
            align: "center",
            render: (_, record) => record.actualStart || "",
        },
        {
            title: "Actual / Expected Finish",
            dataIndex: "actualFinish",
            key: "actualFinish",
            width: 180,
            align: "center",
            render: (_, record) => record.actualFinish || "",
        },
    ];

    const finalColumns: ColumnsType = isEditing ? [...baseColumns, ...editingColumns] : baseColumns;

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
        if (timelineData?.orgId !== currentUser.orgId) return;
        getProjectTimelineById(id);
        handleLibraryChange(timelineData);
    }

    const formattedDate = selectedProjectTimeline?.createdAt
        ? new Date(selectedProjectTimeline.createdAt).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        })
        : "N/A";

    const items = tabs.map((tab, index) => ({
        key: index,
        label: (
            <div className={activeTab === index ? 'dropdown-item active' : 'dropdown-item'}>
                {tab}
            </div>
        ),
        onClick: () => setActiveTab(index),
    }));

    const filterActivitiesWithinModules = (
        modules: any[],
        activeTab: number,
        statusFilter: string | null,
        plannedDate: any,
        assignedUsers: string[],
        searchTerm: string
    ) => {
        const today = dayjs().startOf('day');
        const oneMonthLater = today.add(1, 'month');
        const oneWeekLater = today.add(7, 'day');

        const matchesSearch = (activity: any): boolean => {
            if (!searchTerm.trim()) return true;

            const s = searchTerm.toLowerCase();

            return (
                activity.keyActivity?.toLowerCase().includes(s) ||
                activity.Code?.toLowerCase().includes(s) ||
                activity.preRequisite?.toLowerCase().includes(s) ||
                activity.SrNo?.toLowerCase().includes(s)
            );
        };

        const matchesAssignedUsers = (activity: any): boolean => {
            if (!assignedUsers || assignedUsers.length === 0) return true;
            const raci = activity.raci || {};

            const ids: string[] = [];
            if (raci.responsible) ids.push(raci.responsible);
            if (raci.accountable) ids.push(raci.accountable);
            if (Array.isArray(raci.consulted)) ids.push(...raci.consulted);
            if (Array.isArray(raci.informed)) ids.push(...raci.informed);

            return ids.some((id) => assignedUsers.includes(id));
        };

        return modules
            .map((module: any) => {
                const filteredChildren = (module.children || []).filter((a: any) => {
                    const status = a.activityStatus;

                    let matchesTab = true;

                    switch (activeTab) {
                        case 0: matchesTab = true; break;
                        case 1: matchesTab = status === 'inProgress'; break;
                        case 2: matchesTab = status === 'completed'; break;
                        case 3: {
                            if (!a.plannedStart) return false;
                            const ps = dayjs(a.plannedStart, "DD-MM-YYYY");
                            matchesTab =
                                ps.isAfter(today) &&
                                ps.isBefore(oneMonthLater);
                            break;
                        }
                        case 4: {
                            if (!a.actualFinish || status !== 'completed') return false;
                            const af = dayjs(a.actualFinish, "DD-MM-YYYY");
                            matchesTab =
                                af.isAfter(today.subtract(30, 'days')) &&
                                af.isBefore(today.add(1, 'day'));
                            break;
                        }
                        case 5: matchesTab = status === 'yetToStart'; break;
                        case 6: {
                            if (!a.plannedStart || status !== 'yetToStart') return false;
                            const ps = dayjs(a.plannedStart, "DD-MM-YYYY");
                            matchesTab =
                                ps.isAfter(today.subtract(1, 'day')) &&
                                ps.isBefore(oneWeekLater);
                            break;
                        }
                    }

                    const matchesStatus = !statusFilter || status === statusFilter;
                    const matchesPlanned =
                        !plannedDate ||
                        (a.plannedStart &&
                            dayjs(a.plannedStart, "DD-MM-YYYY").isSame(plannedDate, "day"));

                    const matchesUser = matchesAssignedUsers(a);
                    const matchesSearchText = matchesSearch(a);

                    return (
                        matchesTab &&
                        matchesStatus &&
                        matchesPlanned &&
                        matchesUser &&
                        matchesSearchText
                    );
                });

                return {
                    ...module,
                    children: filteredChildren,
                };
            })
            .filter((m) => m.children && m.children.length > 0);
    };

    const filteredDataSource = filterActivitiesWithinModules(
        dataSource,
        activeTab,
        statusFilter,
        plannedDate,
        assignedUsers,
        searchTerm
    );

    const { Option } = Select;

    const dropdownContent = (
        <div className="custom-dropdown">
            <Input.Search
                placeholder="Search activity..."
                className="dropdown-search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                allowClear
            />

            <p>Quick Filters</p>
            <div className="main-filter-containers">
                <Dropdown menu={{ items }} trigger={['click']}>
                    <Button style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        {tabs[activeTab]} <DownOutlined />
                    </Button>
                </Dropdown>
            </div>
            {/* <div className="dropdown-section">
                <p className="dropdown-title">Status</p>
                <Select
                    className="full-width-select"
                    placeholder="Select status"
                    allowClear
                    value={statusFilter}
                    onChange={setStatusFilter}
                >
                    <Option value="completed">Completed</Option>
                    <Option value="inProgress">In Progress</Option>
                    <Option value="yetToStart">Yet to Start</Option>
                </Select>
            </div> */}

            {/* <div className="dropdown-section">
                <p className="dropdown-title">Planned Start Date</p>
                <DatePicker
                    className="full-width-range"
                    value={plannedDate}
                    onChange={setPlannedDate}
                />
            </div> */}

            <div className="dropdown-section">
                <p className="dropdown-title">Assigned Users</p>
                <Select
                    mode="multiple"
                    showSearch
                    placeholder="Search and select users"
                    value={assignedUsers}
                    onChange={(values) => setAssignedUsers(values as string[])}
                    style={{ width: '100%' }}
                    filterOption={(input, option) =>
                        (option?.label as string)
                            .toLowerCase()
                            .includes(input.toLowerCase())
                    }
                    options={usersOptions.map((u) => ({
                        label: u.name,
                        value: u.id,
                    }))}
                />
            </div>

        </div>
    );

    const selectedNotes = useMemo(() => {
        const findNotes = (items: any[]): any[] => {
            for (const item of items) {
                if (item.key === selectedActivityKey) return item.notes || [];
                if (item.children) {
                    const found = findNotes(item.children);
                    if (found) return found;
                }
            }
            return [];
        };
        return findNotes(dataSource);
    }, [selectedActivityKey, dataSource]);

    const getAppliedFilterCount = () => {
        let count = 0;
        if (statusFilter) count++;
        if (plannedDate) count++;
        if (assignedUsers.length > 0) count++;
        if (activeTab !== 0) count++;
        return count;
    };

    const userMap = useMemo(() => {
        return Object.fromEntries(usersOptions.map((user: any) => [user.id, user.name]));
    }, [usersOptions]);


    const openActivityModal = async (record: any, e?: any) => {
        if (e) {
            e.stopPropagation();
        }

        setSelectedActivityKey(record.key);
        setSelectedActivity(record);
        setNoteModalVisible(true);
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
            <div className="project-timeline-main">
                {allProjects[0]?.projectTimeline ? (
                    <>
                        <div className="project-timeline-status-toolbar">
                            {allVersions?.length > 0 && (
                                <div className="project-timeline-select-item">
                                    <div className="project-timeline-flex-item">
                                        <label>Version</label>
                                        <Select
                                            placeholder="Select Version"
                                            value={{
                                                value: selectedVersionId,
                                                label: (
                                                    <>
                                                        {selectedProjectTimeline?.status === "pending" ? (
                                                            <ClockCircleOutlined style={{ color: "var(--warning)", marginRight: 8 }} />
                                                        ) : selectedProjectTimeline?.status === "replanned" ? (
                                                            <SyncOutlined style={{ color: "#6f42c1", marginRight: 8 }} />
                                                        ) : (
                                                            <LikeOutlined style={{ color: "var(--success)", marginRight: 8 }} />
                                                        )}
                                                        {selectedProjectTimeline?.version}
                                                    </>
                                                ),
                                            }}
                                            onChange={(valueObj) => {
                                                const value = valueObj.value;
                                                const selectedVersion = allVersions.find((v: any) => v.versionId === value);
                                                setSelectedProjectTimeline(selectedVersion);
                                                setSelectedVersionId(value);
                                                handleChangeVersionTimeline(value);
                                            }}
                                            popupMatchSelectWidth={false}
                                            style={{ width: "100%" }}
                                            labelInValue
                                        >
                                            {allVersions.map((version: any) => (
                                                <Option key={version.versionId} value={version.versionId}>
                                                    {version.status === "pending" ? (
                                                        <ClockCircleOutlined style={{ color: "var(--warning)", marginRight: 8 }} />
                                                    ) : version.status === "replanned" ? (
                                                        <SyncOutlined style={{ color: "#6f42c1", marginRight: 8 }} />
                                                    ) : (
                                                        <LikeOutlined style={{ color: "var(--success)", marginRight: 8 }} />
                                                    )}
                                                    {version.version}
                                                </Option>
                                            ))}
                                        </Select>
                                    </div>
                                </div>
                            )}

                            <div className="project-timeline-status">
                                <span>Status:</span>
                                <span
                                    style={{ fontWeight: 900, textTransform: "uppercase" }}
                                    className={
                                        selectedProjectTimeline?.status?.toLowerCase() === "approved"
                                            ? "project-timeline-text-approved"
                                            : selectedProjectTimeline?.status?.toLowerCase() === "pending"
                                                ? "project-timeline-text-warning"
                                                : selectedProjectTimeline?.status?.toLowerCase() === "replanned"
                                                    ? "project-timeline-text-replanned"
                                                    : "project-timeline-text-danger"
                                    }
                                >
                                    {selectedProjectTimeline?.status}
                                </span>
                            </div>

                            <div className="project-timeline-actions">
                                <Tooltip title="Download Project">
                                    <Button
                                        type="primary"
                                        disabled={!selectedProjectId}
                                        icon={<DownloadOutlined />}
                                        onClick={handleDownload}
                                        className="project-timeline-icon-btn project-timeline-icon-btn-primary"
                                    />
                                </Tooltip>

                                <Tooltip title="Share Project">
                                    <Button
                                        type="primary"
                                        disabled={!selectedProjectId}
                                        icon={<ShareAltOutlined />}
                                        onClick={showModal}
                                        className="project-timeline-icon-btn"
                                    />
                                </Tooltip>

                                <Tooltip
                                    title={
                                        <div className="project-timeline-times-stamps">
                                            <div className="project-timeline-time-row">
                                                <p className="project-timeline-time-label">Created / Updated By</p>
                                                <p className="project-timeline-time-value">{selectedProjectTimeline?.addedBy || "N/A"}</p>
                                            </div>
                                            <div className="project-timeline-time-row">
                                                <p className="project-timeline-time-label">Created / Updated At</p>
                                                <p className="project-timeline-time-value">{formattedDate}</p>
                                            </div>
                                        </div>
                                    }
                                    overlayClassName="project-timeline-custom-tooltip"
                                >
                                    <Button
                                        type="primary"
                                        icon={<InfoCircleOutlined />}
                                        className="project-timeline-icon-btn project-timeline-icon-btn-muted"
                                    />
                                </Tooltip>

                                <Space direction="vertical" className="project-timeline-filter-group">
                                    <Space wrap>
                                        <Button.Group>
                                            <Button icon={<FilterOutlined />} />
                                            <Dropdown overlay={dropdownContent} placement="bottomLeft" trigger={["click"]}>
                                                <Button>Filters ({getAppliedFilterCount()})</Button>
                                            </Dropdown>
                                        </Button.Group>
                                    </Space>
                                </Space>
                            </div>
                        </div>

                        <hr />

                        <div className="project-timeline-status-update-item">
                            <div className="project-timeline-table-scroll">
                                {/* <Table
                                    columns={finalColumns}
                                    dataSource={filteredDataSource}
                                    className="project-timeline-table"
                                    pagination={false}
                                    expandable={{
                                        expandedRowRender: () => null,
                                        rowExpandable: (record) => record.children?.length > 0,
                                        expandedRowKeys: expandedKeys,
                                        onExpand: (expanded, record) => {
                                            setExpandedKeys(
                                                expanded ? [...expandedKeys, record.key] : expandedKeys.filter((key: any) => key !== record.key)
                                            );
                                        },
                                        expandIconColumnIndex: 0,
                                    }}
                                    scroll={{ x: "max-content" }}
                                    rowClassName={(record) => (record.isModule ? "module-header" : "activity-row")}
                                    bordered
                                    
                                /> */}
                                <Table
                                    columns={finalColumns}
                                    dataSource={filteredDataSource}
                                    className="project-timeline-table"
                                    pagination={false}
                                    scroll={{ x: 1000 }}
                                    tableLayout="fixed"
                                    expandable={{
                                        expandedRowRender: () => null,
                                        rowExpandable: (record) => record.children?.length > 0,
                                        expandedRowKeys: expandedKeys,
                                        onExpand: (expanded, record) => {
                                            setExpandedKeys(
                                                expanded ? [...expandedKeys, record.key] : expandedKeys.filter((key: any) => key !== record.key)
                                            );
                                        },
                                        expandIconColumnIndex: 0,
                                    }}
                                    rowClassName={(record) => (record.isModule ? "module-header" : "activity-row")}
                                    bordered
                                />

                            </div>
                        </div>
                    </>
                ) : (
                    <div className="project-timeline-container-msg">
                        <div className="project-timeline-no-project">
                            <FolderOpenOutlined style={{ fontSize: "50px", color: "var(--text-muted)" }} />
                            <h3>No Projects Timeline Found</h3>
                            <p>Please define the timeline.</p>
                            <button
                                onClick={() => {
                                    eventBus.emit("updateTab", "/create/register-new-project");
                                    navigate("/create/timeline-builder");
                                }}
                            >
                                Create Project Timeline
                            </button>
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
                className="modal-container"
                okButtonProps={{ className: "bg-secondary" }}
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
                title="Activity Details"
                open={noteModalVisible}
                onCancel={() => {
                    setNoteModalVisible(false);
                    setNoteInput('');
                    setEditNoteId(null);
                    setActivityBudget(null);
                    setActivityCost(null);
                }}
                width={'60%'}
                footer={null}
                className="modal-container"
            >
                <Tabs activeKey={detailsActiveTab} onChange={setDetailsActiveTab} style={{ padding: '0 24px 24px 10px' }}>
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

                    {/* <TabPane tab="Cost" key="cost">
                        {selectedActivity?.cost ? (
                            <div style={{ lineHeight: '2' }}>
                                <div><strong>Project Cost:</strong> ₹{selectedActivity.cost.projectCost}</div>
                                <div><strong>Operational Cost:</strong> ₹{selectedActivity.cost.opCost}</div>
                            </div>
                        ) : (
                            <div>No cost information available</div>
                        )}
                    </TabPane> */}
                    <TabPane tab="Cost" key="cost">
                        {costLoading ? (
                            <Spin />
                        ) : activityCost ? (
                            <div style={{ lineHeight: '2' }}>
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

                    <TabPane tab="RACI" key="raci">
                        {selectedActivity?.raci ? (
                            <div className="raci-grid">
                                <div className="raci-row">
                                    <span className="raci-label">Responsible:</span>
                                    <span className="raci-value">{userMap[selectedActivity.raci.responsible] || 'N/A'}</span>
                                </div>
                                <div className="raci-row">
                                    <span className="raci-label">Accountable:</span>
                                    <span className="raci-value">{userMap[selectedActivity.raci.accountable] || 'N/A'}</span>
                                </div>
                                <div className="raci-row">
                                    <span className="raci-label">Consulted:</span>
                                    <span className="raci-value">
                                        {selectedActivity.raci.consulted?.map((id: any) => (
                                            <span key={id} className="raci-tag">{userMap[id]}</span>
                                        ))}
                                    </span>
                                </div>
                                <div className="raci-row">
                                    <span className="raci-label">Informed:</span>
                                    <span className="raci-value">
                                        {selectedActivity.raci.informed?.map((id: any) => (
                                            <span key={id} className="raci-tag">{userMap[id]}</span>
                                        ))}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div>No RACI information available</div>
                        )}
                    </TabPane>

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
    )
}

export default ProjectTimeline