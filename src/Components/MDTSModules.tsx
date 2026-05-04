import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tooltip } from "@mui/material";
import { Button, Input, Modal, Select, Tag } from "antd";
import { ApartmentOutlined, DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import "../styles/module-library.css";
import { db } from "../Utils/dataStorege";
import { notify } from "../Utils/ToastNotify";
import { ToastContainer } from "react-toastify";
import { getCurrentUser } from "../Utils/moduleStorage";

const { Option } = Select;
const MDTS_ROUTE = "/create/mdts-modules";

type ModuleActivity = {
  code?: string;
  activityName?: string;
};

type ModuleRecord = {
  id: number;
  parentModuleCode: string;
  moduleName: string;
  mineType: string;
  moduleType: string;
  activities?: ModuleActivity[];
  createdAt?: string;
  orgId?: string;
  userGuiId?: string;
};

const MDTSModules = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [modules, setModules] = useState<ModuleRecord[]>([]);
  const [mineTypes, setMineTypes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMineType, setSelectedMineType] = useState<string>("");
  const [moduleToDelete, setModuleToDelete] = useState<ModuleRecord | null>(null);

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    })();
  }, []);

  useEffect(() => {
    if (!currentUser?.orgId) return;

    const loadData = async () => {
      try {
        const [allModules, allMineTypes] = await Promise.all([
          db.getModules(),
          db.getAllMineTypes(),
        ]);

        setModules(
          (allModules || []).filter(
            (module: ModuleRecord) =>
              module.orgId == currentUser.orgId && module.moduleType === "MDTS"
          )
        );
        setMineTypes(
          (allMineTypes || []).filter((type: any) => type.orgId == currentUser.orgId)
        );
      } catch (error) {
        console.error("Error loading MDTS modules:", error);
        notify.error("Unable to load MDTS modules.");
      }
    };

    loadData();
  }, [currentUser]);

  const filteredModules = modules.filter((module) => {
    const searchLower = searchTerm.trim().toLowerCase();
    const searchMatches =
      !searchLower ||
      String(module.moduleName ?? "").toLowerCase().includes(searchLower) ||
      String(module.parentModuleCode ?? "").toLowerCase().includes(searchLower) ||
      String(module.mineType ?? "").toLowerCase().includes(searchLower) ||
      dayjs(module.createdAt).format("DD MMM YYYY").toLowerCase().includes(searchLower);

    const mineTypeMatches = !selectedMineType || module.mineType === selectedMineType;
    return searchMatches && mineTypeMatches;
  });

  const handleCreate = () => {
    navigate("/modules", {
      state: {
        launchMode: "MDTS_CREATE",
        returnTo: MDTS_ROUTE,
      },
    });
  };

  const handleEdit = (module: ModuleRecord) => {
    navigate("/modules", {
      state: {
        ...module,
        returnTo: MDTS_ROUTE,
      },
    });
  };

  const handleDelete = async () => {
    if (!moduleToDelete?.id) return;

    try {
      await db.deleteModule(moduleToDelete.id);
      setModules((prev) => prev.filter((item) => item.id !== moduleToDelete.id));
      notify.success("MDTS module deleted successfully.");
    } catch (error) {
      console.error("Error deleting MDTS module:", error);
      notify.error("Failed to delete MDTS module.");
    } finally {
      setModuleToDelete(null);
    }
  };

  return (
    <>
      <div className="page-heading-module-library">
        <div className="mdts-heading-shell">
          <div>
            <p className="page-heading-title">MDTS Modules</p>
            <span className="pl-subtitle">
              Create, manage, and maintain the MDTS master modules used for downstream imports.
            </span>
          </div>
          <Button type="primary" className="btn-primary-sm mdts-heading-cta" icon={<PlusOutlined />} onClick={handleCreate}>
            Create MDTS Module
          </Button>
        </div>
      </div>

      <section className="mdts-module-page">
        <div className="panel-toolbar mdts-toolbar">
          <div className="mdts-toolbar-copy">
            <div className="mdts-toolbar-title">MDTS Registry</div>
            <div className="mdts-toolbar-subtitle">
              {filteredModules.length} of {modules.length} modules visible
            </div>
          </div>

          <Input
            size="small"
            placeholder="Search by code, name, mine type, date"
            prefix={<SearchOutlined />}
            className="toolbar-input mdts-toolbar-search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <Select
            size="small"
            allowClear
            placeholder="Mine Type"
            value={selectedMineType || undefined}
            className="toolbar-select mdts-toolbar-mine"
            onChange={(value) => setSelectedMineType(value)}
            onClear={() => setSelectedMineType("")}
          >
            {mineTypes.map((type: any) => (
              <Option key={type.type} value={type.type}>
                {type.type}
              </Option>
            ))}
          </Select>
        </div>

        <div className="panel-divider" />

        <div className="mdts-list-shell">
          {filteredModules.length > 0 ? (
            <div className="mdts-list-grid">
              {filteredModules.map((module) => (
                <article key={module.id} className="mdts-list-card" onClick={() => handleEdit(module)}>
                  <div className="mdts-list-card-top">
                    <div className="mdts-list-code">{module.parentModuleCode}</div>
                    <div className="mdts-list-actions">
                      <Tooltip title="Edit">
                        <Button
                          size="small"
                          className="ml-action-btn mdts-icon-action"
                          icon={<EditOutlined />}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEdit(module);
                          }}
                        />
                      </Tooltip>
                      <Tooltip title="Delete">
                        <Button
                          size="small"
                          type="primary"
                          danger
                          className="ml-action-btn mdts-icon-action"
                          icon={<DeleteOutlined />}
                          onClick={(event) => {
                            event.stopPropagation();
                            setModuleToDelete(module);
                          }}
                        />
                      </Tooltip>
                    </div>
                  </div>

                  <div className="mdts-list-name">{module.moduleName}</div>

                  <div className="mdts-list-meta">
                    <div className="mdts-list-meta-item">
                      <span className="mdts-list-meta-label">Activities</span>
                      <strong>{Array.isArray(module.activities) ? module.activities.length : 0}</strong>
                    </div>
                    <div className="mdts-list-meta-item">
                      <span className="mdts-list-meta-label">Created</span>
                      <strong>{module.createdAt ? dayjs(module.createdAt).format("DD MMM YYYY") : "-"}</strong>
                    </div>
                  </div>

                  <div className="mdts-list-tags">
                    <Tag color="green">MDTS</Tag>
                    {module.mineType ? <Tag>{module.mineType}</Tag> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mdts-empty-state">
              <ApartmentOutlined className="mdts-empty-icon" />
              <div className="mdts-empty-title">No MDTS modules found</div>
              <div className="mdts-empty-copy">
                Start your master library by creating the first MDTS module.
              </div>
              <Button type="primary" className="btn-primary-sm mdts-heading-cta" icon={<PlusOutlined />} onClick={handleCreate}>
                Create MDTS Module
              </Button>
            </div>
          )}
        </div>
      </section>

      <Modal
        title="Delete MDTS Module"
        open={Boolean(moduleToDelete)}
        onOk={handleDelete}
        onCancel={() => setModuleToDelete(null)}
        okText="Delete"
        cancelText="Cancel"
        okType="danger"
        className="modal-container"
        centered
      >
        <p>
          Delete <strong>{moduleToDelete?.moduleName || "this module"}</strong>? This action cannot be undone.
        </p>
      </Modal>

      <ToastContainer />
    </>
  );
};

export default MDTSModules;
