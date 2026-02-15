import React, { useEffect, useState } from "react";
import { Table, Button, Space, notification, Modal, Form, Input, Select, List } from "antd";
import { DeleteOutlined, ExclamationCircleOutlined, PlusOutlined, UploadOutlined, CloseCircleOutlined, EyeOutlined } from "@ant-design/icons";
import "../styles/documents.css";
import { getAllDocuments, getModules } from "../Utils/moduleStorage";
import { useDropzone, Accept } from "react-dropzone";
import { Typography } from "antd";

import { db } from "../Utils/dataStorege.ts";
import { v4 as uuidv4 } from "uuid";
import { ToastContainer } from "react-toastify";
import { notify } from "../Utils/ToastNotify.tsx";

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface Module {
    moduleName: string;
    activities: any;
}

const Document: React.FC = () => {
    const [documents, setDocuments] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [_selectedProject, setSelectedProject] = useState<any | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
    const [documentName, setDocumentName] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [milestone, setMilestone] = useState<string>("");
    const [linkedActivity, SetLinkedActivity] = useState<string>("");
    const [files, setFiles] = useState<File[]>([]);
    const [_milestones, setMilestones] = useState<Module[]>([]);
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [modulesData, setModulesData] = useState<Module[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [activityDocs, setActivityDocs] = useState<string[]>([]);
    const [selectedDocName, setSelectedDocName] = useState<string | null>(null);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewContent, setPreviewContent] = useState<string | null>(null);
    const [docTypes, setDocTypes] = useState<any[]>([]);
    const [docType, setDocType] = useState<string | null>(null);
    const [addTypeVisible, setAddTypeVisible] = useState(false);
    const [newTypeName, setNewTypeName] = useState("");
    const [addDocNameVisible, setAddDocNameVisible] = useState(false);
    const [newDocName, setNewDocName] = useState("");

    useEffect(() => {
        db.getAllDocTypes().then(setDocTypes);
    }, []);

    const handleAddType = async () => {
        const name = newTypeName.trim();
        if (!name) {
            notification.warning({ message: "Please enter a type name" });
            return;
        }
        try {
            const id = await db.addDocType(name);
            const list = await db.getAllDocTypes();
            setDocTypes(list);
            const added = await db.docTypes.get(id);
            setDocType(added?.name || null);
            setNewTypeName("");
            setAddTypeVisible(false);
            notification.success({ message: "Type added" });
        } catch (e: any) {
            notification.error({ message: e?.message || "Failed to add type" });
        }
    };

    useEffect(() => {
        const savedDocuments = getAllDocuments();
        setDocuments(savedDocuments);
    }, []);

    useEffect(() => {
        const savedModules = getModules();
        if (Array.isArray(savedModules)) setMilestones(savedModules);
    }, []);

    useEffect(() => {
        db.getModules().then(setModulesData);
    }, []);

    useEffect(() => {
        db.getAllDocuments().then(setDocuments);
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const all = await db.getProjects();
                setProjects(all || []);
            } catch (err) {
                console.error("Failed to load projects", err);
            }
        })();
    }, []);

    const loadModulesForProject = async (projectId: string) => {
        const proj = projects.find((p: any) => p.id === projectId) || null;
        setSelectedProject(proj);
        setMilestone("");
        SetLinkedActivity("");
        setActivities([]);
        setActivityDocs([]);
        setSelectedDocName(null);
        if (!proj) {
            setModulesData([]);
            return;
        }
        if (Array.isArray(proj.processedTimelineData) && proj.processedTimelineData.length) {
            setModulesData(proj.processedTimelineData);
            return;
        }
        if (Array.isArray(proj.projectTimeline) && proj.projectTimeline.length) {
            try {
                const latest = proj.projectTimeline[proj.projectTimeline.length - 1];
                const tId = latest.timelineId || latest.versionId;
                if (tId) {
                    const timeline = await db.getProjectTimelineById(tId);
                    setModulesData(Array.isArray(timeline) ? timeline : []);
                    return;
                }
            } catch (e) {
                console.error("Failed to load timeline modules", e);
            }
        }
        setModulesData([]);
    };

    const handlePreview = async (record: any) => {
        if (record.files && record.files.length > 0) {
            const filePath = record.files[0]?.path;
            const fileData = await db.getDiskEntry(filePath);
            if (fileData) {
                setPreviewContent(fileData);
                setPreviewVisible(true);
            } else {
                notify.error("File not found in IndexedDB.");
            }
        }
    };

    const showDeleteModal = (id: number) => {
        setSelectedDocumentId(id);
        setIsModalVisible(true);
    };

    const handleDelete = async () => {
        if (selectedDocumentId === null) {
            setIsModalVisible(false);
            return;
        }
        try {
            const doc = await db.documents.get(selectedDocumentId);
            if (!doc) {
                await db.deleteDocument(selectedDocumentId);
                const updatedDocs = await db.getAllDocuments();
                setDocuments(updatedDocs);
                notification.success({ message: "Document deleted." });
                setIsModalVisible(false);
                setSelectedDocumentId(null);
                return;
            }
            const fileIds = new Set<string>();
            (Array.isArray(doc.files) ? doc.files : []).forEach((f: any) => {
                if (f.docId || f.id) fileIds.add(String(f.docId || f.id));
            });
            if (doc.projectId && fileIds.size > 0) {
                const projects = await db.getProjects();
                const pr = (projects || []).find((p: any) => p.id === doc.projectId);
                if (pr && Array.isArray(pr.projectTimeline) && pr.projectTimeline.length) {
                    const latestMeta = pr.projectTimeline[pr.projectTimeline.length - 1];
                    const timelineId = latestMeta.timelineId || latestMeta.versionId;
                    if (timelineId) {
                        const timelineData = await db.getProjectTimelineById(timelineId);
                        const modules = Array.isArray(timelineData) ? timelineData : [];
                        const updatedModules = modules.map((mod: any) => ({
                            ...mod,
                            activities: (mod.activities || []).map((act: any) => {
                                const docs = Array.isArray(act.activityDocuments) ? act.activityDocuments : [];
                                const filteredDocs = docs.filter((d: any) => !fileIds.has(String(d.id)));
                                return filteredDocs.length !== docs.length ? { ...act, activityDocuments: filteredDocs } : act;
                            })
                        }));
                        await db.updateProjectTimeline(timelineId, updatedModules);
                        const updatedProjectTimelineMeta = (pr.projectTimeline || []).map((t: any) => {
                            const tId = t.timelineId || t.versionId;
                            return tId === timelineId ? { ...t, data: updatedModules } : t;
                        });
                        await db.updateProject(pr.id, { ...pr, projectTimeline: updatedProjectTimelineMeta });
                    }
                }
            }
            if (fileIds.size > 0) {
                const allDocs = await db.getAllDocuments();
                for (const d of allDocs) {
                    const originalFiles = Array.isArray(d.files) ? d.files : [];
                    const remainingFiles = originalFiles.filter(
                        (f: any) => !fileIds.has(String(f.docId || f.id))
                    );
                    if (remainingFiles.length === originalFiles.length) continue;
                    if (remainingFiles.length === 0) {
                        for (const f of originalFiles) {
                            if (f.path) {
                                const existing: any = await db.diskStorage.where("path").equals(f.path).first();
                                if (existing) {
                                    await db.diskStorage.delete(existing.id ?? existing.path);
                                } else {
                                    await db.diskStorage.where("path").equals(f.path).delete();
                                }
                            }
                        }
                        await db.deleteDocument(d.id ?? d.guid);
                    } else {
                        await db.documents.update(d.id ?? d.guid, {
                            files: remainingFiles,
                            updatedAt: new Date().toISOString()
                        });
                    }
                }
            } else {
                await db.deleteDocument(doc.id ?? doc.guid ?? selectedDocumentId);
            }
            const updatedDocs = await db.getAllDocuments();
            setDocuments(updatedDocs);
            notification.success({ message: "Document deleted everywhere." });
        } catch (e) {
            console.error(e);
            notification.error({ message: "Failed to delete document." });
        } finally {
            setIsModalVisible(false);
            setSelectedDocumentId(null);
        }
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setSelectedDocumentId(null);
    };

    const onDrop = (acceptedFiles: File[]) => {
        setFiles((prevFiles) => [...prevFiles, ...acceptedFiles]);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: "image/*,application/pdf" as unknown as Accept,
        multiple: true
    });

    const handleSave = async () => {
        if (!selectedProjectId) {
            notify.error("Please select a Project.");
            return;
        }
        if (!milestone || !linkedActivity || files.length === 0) {
            notify.error("Please fill all fields and upload files.");
            return;
        }
        if (!docType) {
            notify.error("Please select a Document Type.");
            return;
        }

        const encodedFiles: { docId: string; name: string; path: string }[] = [];

        try {
            for (const file of files) {
                const docId = uuidv4();
                await saveFileToDisk(file, docId);
                encodedFiles.push({ docId, name: file.name, path: `documents/${docId}` });
            }

            const userRaw = localStorage.getItem("user");
            const user = userRaw ? JSON.parse(userRaw) : null;
            if (!user) {
                notify.error("User information is missing in local storage.");
                return;
            }

            const nowIso = new Date().toISOString();
            const project = projects.find((p: any) => p.id === selectedProjectId);
            if (!project) {
                notify.error("Selected project not found.");
                return;
            }

            const selectedActivity = activities.find(
                (act: any) =>
                    act.code === linkedActivity ||
                    act.guicode === linkedActivity
            );

            if (!selectedActivity) {
                notify.error("Selected activity not found.");
                return;
            }

            const linkedActivityName =
                selectedActivity.activityName ||
                selectedActivity.keyActivity ||
                "";
            const linkedActivityCode =
                selectedActivity.code ||
                selectedActivity.guicode ||
                "";

            const resolvedDocName = selectedDocName || documentName || "";

            const allExistingDocs = await db.getAllDocuments();

            const isDuplicateGlobal = allExistingDocs.some((d: any) => {
                const sameActivity = d.linkedActivityCode
                    ? d.linkedActivityCode === linkedActivityCode
                    : (d.linkedActivity || "") === linkedActivityName;

                const metaMatch =
                    d.projectId === selectedProjectId &&
                    d.milestone === milestone &&
                    sameActivity &&
                    (d.documentName || d.linkedDoc || "") === resolvedDocName &&
                    d.documentType === docType;

                if (!metaMatch || !Array.isArray(d.files) || d.files.length === 0) return false;

                return encodedFiles.every((f) =>
                    d.files.some(
                        (ef: any) =>
                            String(ef.name) === String(f.name) &&
                            String(ef.path) === String(f.path)
                    )
                );
            });

            if (!isDuplicateGlobal) {
                const documentGUID = uuidv4();
                const newDocumentEntry = {
                    guid: documentGUID,
                    projectId: selectedProjectId,
                    projectName: project?.projectParameters?.projectName || project?.name || "",
                    documentName: resolvedDocName,
                    documentType: docType,
                    description,
                    milestone,
                    linkedActivity: linkedActivityName,
                    linkedActivityCode,
                    linkedDoc: selectedDocName || null,
                    files: encodedFiles,
                    uploadedAt: nowIso,
                    createdAt: nowIso,
                    updatedAt: nowIso,
                    uploadedBy: {
                        userId: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        company: user.company
                    }
                };

                await db.documents.add(newDocumentEntry);
            }

            if (Array.isArray(project.projectTimeline) && project.projectTimeline.length > 0) {
                const latestMeta = project.projectTimeline[project.projectTimeline.length - 1];
                const timelineId = latestMeta.timelineId || latestMeta.versionId;

                if (timelineId) {
                    const timelineData = await db.getProjectTimelineById(timelineId);
                    const modules = Array.isArray(timelineData) ? timelineData : [];

                    const updatedModules = modules.map((mod: any) => {
                        const isTargetModule =
                            (mod.moduleName && mod.moduleName === milestone) ||
                            (mod.keyActivity && mod.keyActivity === milestone);

                        if (!isTargetModule) return mod;

                        const updatedActivities = (mod.activities || []).map((act: any) => {
                            const actId = act.code || act.guicode;
                            if (actId !== linkedActivityCode) return act;

                            const actName = act.activityName || act.keyActivity;
                            const existingDocs = Array.isArray(act.activityDocuments)
                                ? act.activityDocuments
                                : [];

                            const newDocs = encodedFiles.map((f) => ({
                                id: f.docId,
                                projectId: selectedProjectId,
                                moduleCode:
                                    mod.parentModuleCode ||
                                    mod.Code ||
                                    mod.moduleName ||
                                    milestone,
                                milestone,
                                activityCode: linkedActivityCode,
                                activityName: actName,
                                linkedActivity: actName,
                                documentName: resolvedDocName,
                                documentType: docType,
                                description,
                                fileName: f.name,
                                filePath: f.path,
                                uploadedAt: nowIso,
                                uploadedBy: user.name
                            }));

                            const mergedDocs = [
                                ...existingDocs,
                                ...newDocs.filter(
                                    (nd) =>
                                        !existingDocs.some(
                                            (ed: any) =>
                                                String(ed.filePath || "") === String(nd.filePath) ||
                                                String(ed.id || "") === String(nd.id)
                                        )
                                )
                            ];

                            return {
                                ...act,
                                activityDocuments: mergedDocs
                            };
                        });

                        return {
                            ...mod,
                            activities: updatedActivities
                        };
                    });

                    await db.updateProjectTimeline(timelineId, updatedModules);

                    const updatedProjectTimelineMeta = project.projectTimeline.map((t: any) => {
                        const tId = t.timelineId || t.versionId;
                        return tId === timelineId ? { ...t, data: updatedModules } : t;
                    });

                    await db.updateProject(project.id, {
                        ...project,
                        projectTimeline: updatedProjectTimelineMeta
                    });
                }
            }

            const updatedDocs = await db.getAllDocuments();
            setDocuments(updatedDocs);
            notify.success("Document saved & linked successfully.");
            setIsAddModalVisible(false);
            resetForm();
        } catch (error) {
            console.error(error);
            notify.error("Failed to save document.");
        }
    };

    const resetForm = () => {
        setDocumentName("");
        setDescription("");
        setMilestone("");
        SetLinkedActivity("");
        setSelectedDocName(null);
        setDocType(null);
        setFiles([]);
        setActivities([]);
        setActivityDocs([]);
        setSelectedProjectId(null);
        setSelectedProject(null);
        setModulesData([]);
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

    const handleCancelAddedDoc = () => {
        resetForm();
        setIsAddModalVisible(false);
    };

    const handleRemoveFile = (indexToRemove: number) => {
        setFiles((prevFiles) => prevFiles.filter((_, index) => index !== indexToRemove));
    };

    const handleAddDocument = () => {
        resetForm();
        setSelectedProjectId(null);
        setSelectedProject(null);
        setModulesData([]);
        setIsAddModalVisible(true);
    };

    const handleAddCustomDocName = () => {
        const name = newDocName.trim();
        if (!name) {
            notification.warning({ message: "Please enter a document name" });
            return;
        }
        setActivityDocs((prev) =>
            prev.includes(name) ? prev : [...prev, name]
        );
        setDocumentName(name);
        setSelectedDocName(null);
        setNewDocName("");
        setAddDocNameVisible(false);
    };

    const columns: any = [
        { title: "Id", dataIndex: "id", key: "id", width: "8%" },
        {
            title: "Document Name",
            dataIndex: "documentName",
            key: "documentName",
            width: "20%",
            align: "left",
            render: (val: string, rec: any) => val || rec?.linkedDoc || "-"
        },
        {
            title: "Type",
            dataIndex: "documentType",
            key: "documentType",
            width: "12%",
            align: "left",
            render: (val: string) => val || "-"
        },
        {
            title: "Milestone",
            dataIndex: "milestone",
            key: "milestone",
            width: "18%",
            align: "left"
        },
        {
            title: "Description",
            dataIndex: "description",
            key: "description",
            width: "22%",
            align: "left",
            ellipsis: true
        },
        {
            title: "Uploaded",
            dataIndex: "createdAt",
            key: "createdAt",
            width: "15%",
            align: "left",
            render: (val: string) => (val ? new Date(val).toLocaleString() : "-")
        },
        {
            title: "Actions",
            key: "actions",
            width: "10%",
            render: (_: any, record: any) => (
                <Space size="middle" style={{ display: "flex", gap: "28px", justifyContent: "center" }}>
                    {record.files && record.files.length > 0 && (
                        <Button className="view-btn" icon={<EyeOutlined />} onClick={() => handlePreview(record)} size="small" />
                    )}
                    <Button className="delete-btn" icon={<DeleteOutlined />} onClick={() => showDeleteModal(record.id)} danger size="small" />
                </Space>
            )
        }
    ];

    return (
        <>
            <div className="main-doc-container">
                <div className="docs-heading ">
                    <div>
                        <p className="page-heading-title">Documents</p>
                        <span className="pl-subtitle">Upload, organize, and link documents to project activities</span>
                    </div>
                    <Button type="primary" className="bg-secondary add-doc-btn" size="small" icon={<PlusOutlined />} onClick={handleAddDocument}>
                        Add Document
                    </Button>
                </div>
                <div className="document-table-container">
                    <Table
                        columns={columns}
                        dataSource={documents}
                        rowKey="id"
                        bordered
                        pagination={false}
                        className="custom-table"
                    />
                </div>
            </div>

            <Modal title="Confirm Delete" open={isModalVisible} onOk={handleDelete} onCancel={handleCancel} okText="Delete" cancelText="Cancel" okType="danger">
                <p>
                    <ExclamationCircleOutlined style={{ color: "red", marginRight: "8px" }} />
                    Are you sure you want to delete this document? This action cannot be undone.
                </p>
            </Modal>

            <Modal open={addTypeVisible} title="Add New Document Type" onCancel={() => setAddTypeVisible(false)} onOk={handleAddType} okText="Add">
                <Input
                    placeholder="e.g., Work Order, Drawing, Permit..."
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    onPressEnter={handleAddType}
                    maxLength={60}
                />
            </Modal>

            <Modal
                title="Create Document"
                centered
                className="modal-container"
                width={"65%"}
                open={isAddModalVisible}
                onCancel={handleCancelAddedDoc}
                onOk={handleSave}
                okText="Save"
                cancelText="Cancel"
                okButtonProps={{ className: "bg-secondary" }}
            >
                <Form layout="horizontal" onFinish={handleSave} labelCol={{ span: 6 }} wrapperCol={{ span: 18 }} requiredMark={false}>
                    <div className="main-doc-container" style={{ width: "99%", height: "500px", overflow: "auto" }}>
                        <div className="left-create-document">
                            <div className="main-create-doc-container">
                                <div className="left-create-document-item">
                                    <Form.Item
                                        label={<span style={{ textAlign: "left" }}> Project </span>}
                                        name="project"
                                        rules={[{ required: true, message: "Project is required" }]}
                                        labelAlign="left"
                                        colon={false}
                                    >
                                        <Select
                                            placeholder="Select Project"
                                            value={selectedProjectId ?? undefined}
                                            onChange={(val) => {
                                                setSelectedProjectId(val);
                                                loadModulesForProject(val);
                                            }}
                                            showSearch
                                            optionFilterProp="children"
                                            style={{ marginBottom: "15px" }}
                                        >
                                            {projects.map((proj: any) => (
                                                <Option key={proj.id} value={proj.id}>
                                                    {proj.projectParameters?.projectName || proj.name || `Project ${proj.id}`}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>

                                    <Form.Item
                                        label={<span style={{ textAlign: "left" }}> Select Milestone </span>}
                                        name="milestone"
                                        rules={[{ required: true, message: "Milestone is required" }]}
                                        labelAlign="left"
                                        colon={false}
                                    >
                                        <Select
                                            placeholder="Select Milestone"
                                            value={milestone}
                                            onChange={(value) => {
                                                setMilestone(value);
                                                const selectedModule = modulesData.find((mod) => mod.moduleName === value);
                                                const acts = selectedModule?.activities || [];
                                                setActivities(acts);
                                                SetLinkedActivity("");
                                                setActivityDocs([]);
                                                setSelectedDocName(null);
                                            }}
                                            style={{ marginBottom: "15px" }}
                                        >
                                            {modulesData.map((module, index) => (
                                                <Option key={index} value={module.moduleName}>
                                                    {module.moduleName}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>

                                    <Form.Item
                                        label={<span style={{ textAlign: "left" }}> Linked Activity </span>}
                                        name="linked-activity"
                                        rules={[{ required: true, message: "Linked-Activity is required" }]}
                                        labelAlign="left"
                                        colon={false}
                                    >
                                        <Select
                                            placeholder="Select Linked Activity"
                                            value={linkedActivity || undefined}
                                            onChange={(value) => {
                                                SetLinkedActivity(value);
                                                const selectedActivity = activities.find(
                                                    (act: any) =>
                                                        act.code === value ||
                                                        act.guicode === value
                                                );
                                                setActivityDocs(selectedActivity?.documents || []);
                                                setSelectedDocName(null);
                                            }}
                                            showSearch
                                            optionFilterProp="children"
                                        >
                                            {activities.map((activity: any, index: number) => {
                                                const id = activity.code || activity.guicode || `idx-${index}`;
                                                return (
                                                    <Option key={id} value={id}>
                                                        {activity.activityName}
                                                        {activity.code ? ` (${activity.code})` : ""}
                                                    </Option>
                                                );
                                            })}
                                        </Select>
                                    </Form.Item>

                                    <Form.Item
                                        label="Document Name"
                                        name="documentname"
                                        labelAlign="left"
                                        colon={false}
                                    >
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <Select
                                                placeholder="Select Document Name"
                                                value={selectedDocName || documentName || undefined}
                                                onChange={(value) => {
                                                    setSelectedDocName(value || null);
                                                    setDocumentName(value || "");
                                                }}
                                                allowClear
                                                style={{ flex: 1, minWidth: 200 }}
                                            >
                                                {activityDocs.map((doc, index) => (
                                                    <Option key={index} value={doc}>
                                                        {doc}
                                                    </Option>
                                                ))}
                                            </Select>

                                            <Button
                                                type="dashed"
                                                icon={<PlusOutlined />}
                                                onClick={() => setAddDocNameVisible(true)}
                                            />
                                        </div>
                                    </Form.Item>

                                    <Form.Item label={<span style={{ textAlign: "left" }}> Document Type </span>} required labelAlign="left" colon={false}>
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <Select
                                                placeholder="Select Document Type"
                                                value={docType ?? undefined}
                                                onChange={setDocType}
                                                style={{ flex: 1, minWidth: 200 }}
                                                showSearch
                                                options={docTypes.map((dt: any) => ({ label: dt.name, value: dt.name }))}
                                                filterOption={(input, option) => String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                                            />
                                            <Button type="dashed" icon={<PlusOutlined />} onClick={() => setAddTypeVisible(true)} />
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

                                    <Form.Item label={<span style={{ textAlign: "left" }}> Upload Files </span>} name="files" labelAlign="left" colon={false}>
                                        <div
                                            {...getRootProps()}
                                            style={{
                                                border: "2px dashed #d9d9d9",
                                                padding: 16,
                                                textAlign: "center",
                                                borderRadius: 8,
                                                cursor: "pointer",
                                                background: isDragActive ? "#082c4bff" : "#fafafa"
                                            }}
                                        >
                                            <input {...getInputProps()} />
                                            <UploadOutlined style={{ fontSize: 32 }} />
                                            <Text style={{ display: "block", marginTop: 8 }}>
                                                {isDragActive ? "Drop the files here..." : "Drag and drop files here, or click to select files"}
                                            </Text>
                                        </div>
                                    </Form.Item>

                                    {files.length > 0 && (
                                        <List
                                            dataSource={files}
                                            renderItem={(file, index) => (
                                                <List.Item
                                                    actions={[
                                                        <CloseCircleOutlined key="remove" onClick={() => handleRemoveFile(index)} style={{ color: "#888" }} />
                                                    ]}
                                                >
                                                    <Text>{file.name}</Text>
                                                </List.Item>
                                            )}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </Form>
            </Modal>

            <Modal
                open={previewVisible}
                onCancel={() => setPreviewVisible(false)}
                footer={null}
                width="80%"
                bodyStyle={{ height: "75vh" }}
                title="Preview Document"
                className="modal-container"
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px", height: "calc(100vh - 180px)" }}>
                    {previewContent?.startsWith("data:application/pdf") ? (
                        <iframe src={previewContent} title="PDF Preview" width="100%" height="100%" style={{ border: "none" }} />
                    ) : previewContent?.startsWith("data:image/") ? (
                        <img src={previewContent} alt="Document Preview" style={{ maxWidth: "100%", maxHeight: "100%" }} />
                    ) : (
                        <div>
                            <p>Preview not available for this file type. Please download to view.</p>
                        </div>
                    )}
                </div>
            </Modal>

            <Modal
                open={addDocNameVisible}
                title="Add Custom Document Name"
                onCancel={() => {
                    setAddDocNameVisible(false);
                    setNewDocName("");
                }}
                onOk={handleAddCustomDocName}
                okText="Add"
            >
                <Input
                    placeholder="Enter custom document name"
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    onPressEnter={handleAddCustomDocName}
                    maxLength={120}
                />
            </Modal>

            <ToastContainer />
        </>
    );
};

export default Document;
