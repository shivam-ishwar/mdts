import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Empty, Form, Input, Modal, Spin, Tooltip } from "antd";
import { ArrowLeftOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { db, type StandardizationMaster, type StandardizedActivity } from "../Utils/dataStorege";
import { getCurrentUser } from "../Utils/moduleStorage";
import { notify } from "../Utils/ToastNotify";
import "../styles/standardization-links.css";

const makeActivityKey = (item: Partial<StandardizedActivity>) =>
  `${String(item.orgId || "")}__${String(item.moduleCode || "")}__${String(item.activityCode || "")}`;

const getUniqueActivities = (items: StandardizedActivity[]) => {
  const map = new Map<string, StandardizedActivity>();
  for (const item of items) {
    const key = makeActivityKey(item);
    if (!map.has(key)) {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
};

export default function StandardizationLinks() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [masters, setMasters] = useState<StandardizationMaster[]>([]);
  const [records, setRecords] = useState<StandardizedActivity[]>([]);
  const [selectedMasterName, setSelectedMasterName] = useState<string>("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingMaster, setEditingMaster] = useState<StandardizationMaster | null>(null);
  const [savingMaster, setSavingMaster] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [deletingMasterId, setDeletingMasterId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      setCurrentUser(user);

      if (!user?.orgId) {
        setMasters([]);
        setRecords([]);
        return;
      }

      const [masterList, linkedRecords] = await Promise.all([
        db.getStandardizationMastersByOrg(String(user.orgId)),
        db.getStandardizedActivitiesByOrg(String(user.orgId)),
      ]);

      const sortedMasters = masterList
        .slice()
        .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

      setMasters(sortedMasters);
      setRecords(linkedRecords);

      setSelectedMasterName((prev) => {
        if (prev && sortedMasters.some((item) => item.name === prev)) {
          return prev;
        }
        return sortedMasters[0]?.name || "";
      });
    } catch (error) {
      console.error("Failed to load standardization masters", error);
      setMasters([]);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedMasterRecords = useMemo(() => {
    return getUniqueActivities(
      records.filter((item) => String(item.standardizedName || "") === String(selectedMasterName || ""))
    );
  }, [records, selectedMasterName]);

  const masterRows = useMemo(() => {
    return masters.map((master) => ({
      ...master,
      linkedCount: records.filter((item) => String(item.standardizedName || "") === String(master.name || "")).length,
    }));
  }, [masters, records]);

  const openCreateMaster = () => {
    setEditingMaster(null);
    form.resetFields();
    setEditorOpen(true);
  };

  const openEditMaster = (master: StandardizationMaster) => {
    setEditingMaster(master);
    form.setFieldsValue({ name: master.name });
    setEditorOpen(true);
  };

  const handleSaveMaster = async () => {
    try {
      const values = await form.validateFields();
      if (!currentUser?.orgId) return;

      setSavingMaster(true);
      const nextName = String(values.name || "").trim();

      if (editingMaster?.id) {
        await db.renameStandardizationMaster(
          String(currentUser.orgId),
          String(editingMaster.name || ""),
          nextName,
          editingMaster.id
        );
        notify.success("Standardization updated.");
      } else {
        await db.upsertStandardizationMaster({
          orgId: String(currentUser.orgId),
          name: nextName,
        });
        notify.success("Standardization created.");
      }

      setEditorOpen(false);
      setEditingMaster(null);
      form.resetFields();
      setSelectedMasterName(nextName);
      await loadData();
    } catch (error: any) {
      if (error?.errorFields) return;
      console.error("Failed to save standardization master", error);
      notify.error(error?.message || "Unable to save standardization.");
    } finally {
      setSavingMaster(false);
    }
  };

  const handleDeleteMaster = (master: StandardizationMaster) => {
    Modal.confirm({
      title: "Delete this standardization?",
      content: `This will remove "${master.name}" from the master list.`,
      okText: "Continue",
      cancelText: "Cancel",
      okButtonProps: { danger: true },
      centered: true,
      className: "modal-container",
      onOk: () => {
        Modal.confirm({
          title: "Delete linked activities as well?",
          content: "All activity links attached to this standardization will also be deleted. This action cannot be undone.",
          okText: "Delete",
          cancelText: "Cancel",
          okButtonProps: { danger: true },
          centered: true,
          className: "modal-container",
          onOk: async () => {
            try {
              setDeletingMasterId(master.id || null);
              await db.deleteStandardizedActivitiesByName(
                String(currentUser?.orgId || ""),
                String(master.name || "")
              );
              if (master.id) {
                await db.deleteStandardizationMaster(master.id);
              }
              notify.success("Standardization deleted.");
              await loadData();
            } catch (error) {
              console.error("Failed to delete standardization master", error);
              notify.error("Unable to delete standardization.");
            } finally {
              setDeletingMasterId(null);
            }
          },
        });
      },
    });
  };

  const handleDeleteLinkedActivity = (item: StandardizedActivity) => {
    Modal.confirm({
      title: "Delete this linked activity?",
      content: `${item.activityName || "Activity"} will be removed from this standardization.`,
      okText: "Delete",
      cancelText: "Cancel",
      okButtonProps: { danger: true },
      centered: true,
      className: "modal-container",
      onOk: async () => {
        try {
          const key = makeActivityKey(item);
          setDeletingKey(key);
          await db.deleteStandardizedActivity(
            String(item.orgId || currentUser?.orgId || ""),
            String(item.moduleCode || ""),
            String(item.activityCode || "")
          );
          notify.success("Linked activity deleted.");
          await loadData();
        } catch (error) {
          console.error("Failed to delete linked activity", error);
          notify.error("Unable to delete linked activity.");
        } finally {
          setDeletingKey(null);
        }
      },
    });
  };

  /*
  const renderGraph = () => {
    const leftItems = selectedMasterRecords.filter((_, index) => index % 2 === 0);
    const rightItems = selectedMasterRecords.filter((_, index) => index % 2 === 1);
    const centerY = 50;

    const getY = (index: number, total: number) => {
      if (total <= 1) return centerY;
      return 18 + (index * 64) / (total - 1);
    };

    return (
      <section className="sl-page-panel sl-page-graph-panel">
        <div className="sl-page-panel-toolbar">
          <div>
            <p className="page-heading-title">{selectedMasterName}</p>
            <span className="pl-subtitle">Update activity progress, actual dates, and execution status</span>
          </div>
        </div>

        <div className="sl-page-graph-shell">
          <svg className="sl-page-graph-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
            {leftItems.map((item, index) => (
              <line key={`left-${makeActivityKey(item)}`} x1="50" y1={centerY} x2="20" y2={getY(index, leftItems.length)} />
            ))}
            {rightItems.map((item, index) => (
              <line key={`right-${makeActivityKey(item)}`} x1="50" y1={centerY} x2="80" y2={getY(index, rightItems.length)} />
            ))}
          </svg>

          <div className="sl-page-graph-center" style={{ left: "50%", top: `${centerY}%` }}>
            {selectedMasterName}
          </div>

          {leftItems.map((item, index) => (
            <div
              key={`left-node-${makeActivityKey(item)}`}
              className="sl-page-graph-node"
              style={{ left: "20%", top: `${getY(index, leftItems.length)}%` }}
            >
              <div className="sl-page-graph-node-name">{item.moduleName || "Module"}</div>
              <div className="sl-page-graph-node-sub">{item.activityName || "Activity"}</div>
            </div>
          ))}

          {rightItems.map((item, index) => (
            <div
              key={`right-node-${makeActivityKey(item)}`}
              className="sl-page-graph-node"
              style={{ left: "80%", top: `${getY(index, rightItems.length)}%` }}
            >
              <div className="sl-page-graph-node-name">{item.moduleName || "Module"}</div>
              <div className="sl-page-graph-node-sub">{item.activityName || "Activity"}</div>
            </div>
          ))}
        </div>
      </section>
    );
  };
  */

  return (
    <div className="sl-page-root">
      <div className="sl-page-header-shell">
        <div className="sl-page-header">
          <div>
            <p className="sl-page-heading-title">Standardization Master</p>
            <span className="sl-page-heading-subtitle">Create, update, delete, and review standardized activity masters.</span>
          </div>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/create/status-update")}>
            Back
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="sl-page-loading"><Spin size="large" /></div>
      ) : (
        <><div className="sl-page-main">
          <section className="sl-page-panel">
            <div className="sl-page-panel-toolbar">
              <div>
                <div className="sl-page-section-title">Standardization Library</div>
              </div>
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateMaster}>Add</Button>
            </div>

            {masterRows.length === 0 ? (
              <Empty description="No standardization created yet." />
            ) : (
              <div className="sl-page-master-grid">
                {masterRows.map((row: any) => {
                  const isSelected = String(row.name || "") === String(selectedMasterName || "");
                  return (
                    <button
                      type="button"
                      key={String(row.id)}
                      className={`sl-page-master-chip ${isSelected ? "sl-page-master-chip--selected" : ""}`}
                      onClick={() => setSelectedMasterName(String(row.name || ""))}
                    >
                      <Tooltip title={row.name}>
                        <div className="sl-page-master-chip__name">{row.name}</div>
                      </Tooltip>
                      <div className="sl-page-master-chip__meta">{row.linkedCount} linked activities</div>
                      <div className="sl-page-master-chip__actions" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Edit">
                          <Button
                            type="text"
                            size="small"
                            className="sl-page-master-chip__action-btn"
                            icon={<EditOutlined />}
                            onClick={() => openEditMaster(row)}
                          />
                        </Tooltip>
                        <Tooltip title="Delete">
                          <Button
                            danger
                            type="text"
                            size="small"
                            className="sl-page-master-chip__action-btn"
                            icon={<DeleteOutlined />}
                            loading={deletingMasterId === row.id}
                            onClick={() => handleDeleteMaster(row)}
                          />
                        </Tooltip>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {!selectedMasterName ? (
            <section className="sl-page-panel sl-page-empty-panel">
              <Empty description="No standardization selected." />
            </section>
          ) : selectedMasterRecords.length === 0 ? (
            <section className="sl-page-panel sl-page-empty-panel">
              <Empty description="No activity linked with this standardization." />
            </section>
          ) : (
            <>
              {/* Hidden table section kept here for future use.
              <section className="sl-page-panel sl-page-table-panel">
                <div className="sl-page-panel-toolbar">
                  <div>
                    <div className="sl-page-section-title">{selectedMasterName}</div>
                    <div className="sl-page-section-subtitle">Activities linked to this standardization.</div>
                  </div>
                  <Button type="text" icon={<NodeIndexOutlined />} onClick={() => setViewMode("graph")} />
                </div>
                <Table
                  rowKey="id"
                  dataSource={linkRows}
                  pagination={false}
                  className="sl-page-table"
                  columns={[
                    {
                      title: "Activity",
                      key: "sourceActivity",
                      render: (_: unknown, row: LinkRow) => row.source.activityName || "Activity",
                    },
                    {
                      title: "Module",
                      key: "sourceModule",
                      render: (_: unknown, row: LinkRow) => row.source.moduleName || "Module",
                    },
                    {
                      title: "Linked Activity",
                      key: "targetActivity",
                      render: (_: unknown, row: LinkRow) => row.target.activityName || "Activity",
                    },
                    {
                      title: "Linked Module",
                      key: "targetModule",
                      render: (_: unknown, row: LinkRow) => row.target.moduleName || "Module",
                    },
                    {
                      title: "Action",
                      key: "action",
                      width: 120,
                      render: (_: unknown, row: LinkRow) => (
                        <Button
                          danger
                          type="text"
                          icon={<DeleteOutlined />}
                          loading={deletingKey === makeActivityKey(row.target)}
                          onClick={() => handleDeleteLinkedActivity(row.target)}
                        >
                          Delete
                        </Button>
                      ),
                    },
                  ]}
                />
              </section>
              */}
              {/* Hidden graph section kept here for future use.
              {renderGraph()}
              */}
            </>
          )}
        </div>
        </>
      )}

      <Modal
        title={editingMaster ? "Edit" : "Add"}
        open={editorOpen}
        onCancel={() => {
          setEditorOpen(false);
          setEditingMaster(null);
          form.resetFields();
        }}
        onOk={handleSaveMaster}
        okText={editingMaster ? "Update" : "Create"}
        confirmLoading={savingMaster}
        destroyOnClose
        className="modal-container"
        centered
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Standardization Name"
            name="name"
            rules={[{ required: true, message: "Please enter standardization name" }]}
          >
            <Input placeholder="Enter standardization name" maxLength={120} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
