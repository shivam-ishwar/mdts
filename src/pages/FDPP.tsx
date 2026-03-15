import { useEffect, useMemo, useState } from "react";
import { db } from "../Utils/dataStorege.ts";
import {
  Card,
  Col,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Row,
  Spin,
  Timeline,
  Tooltip,
  Typography,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "../styles/fdpp.css";
import { CloseCircleOutlined, DownloadOutlined } from "@ant-design/icons";
import { ToastContainer } from "react-toastify";
import { notify } from "../Utils/ToastNotify.tsx";

dayjs.extend(customParseFormat);

const { Title, Text } = Typography;

type EDPPProps = {
  code?: string;
};

type DocFile = File;

type ProjectDocument = {
  id: string;
  documentName: string;
  uploadedAt?: string | number | Date;
  files?: DocFile[];
};

type ProjectDetails = {
  id?: string;
  projectParameters?: Record<string, unknown>;
  locations?: Record<string, unknown>;
  contractualDetails?: Record<string, unknown>;
  financialParameters?: Record<string, unknown>;
  documents?: ProjectDocument[];
  initialStatus?: {
    library?: unknown;
    items?: Array<{
      moduleName?: string;
      parentModuleCode?: string;
      activities?: Array<{
        code?: string;
        activityName?: unknown;
        duration?: unknown;
      }>;
    }>;
  };
};

const parseDateStrict = (val: unknown): Dayjs | null => {
  if (!val) return null;
  if (typeof val === "object" && (val as any)?.$isDayjsObject) return val as Dayjs;
  if (val instanceof Date) return dayjs(val);
  if (typeof val === "number") {
    const d = dayjs(val);
    return d.isValid() ? d : null;
  }
  if (typeof val === "string") {
    const formats = [
      "YYYY-MM-DD",
      "YYYY-MM-DDTHH:mm:ss.SSS[Z]",
      "YYYY-MM-DDTHH:mm:ss.SSSZ",
      "YYYY-MM-DDTHH:mm:ss[Z]",
      "YYYY-MM-DDTHH:mm:ssZ",
      "YYYY/MM/DD",
      "DD-MM-YYYY",
      "DD/MM/YYYY",
    ];
    for (const f of formats) {
      const d = dayjs(val, f, true);
      if (d.isValid()) return d;
    }
    const d = dayjs(val);
    return d.isValid() ? d : null;
  }
  return null;
};

const hasValue = (value: unknown) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  return true;
};

const displayValue = (value: unknown) => (hasValue(value) ? String(value) : "-");

const formatDate = (value: unknown) => {
  const d = parseDateStrict(value);
  return d ? d.format("DD-MM-YYYY") : "-";
};

const displayWithUnit = (value: unknown, unit: string, prefix?: string) => {
  if (!hasValue(value)) return "-";
  const val = String(value);
  const pre = prefix ? `${prefix} ` : "";
  return `${pre}${val} ${unit}`;
};

const downloadFile = (file?: File) => {
  if (!file) return;
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name || "download";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function EDPP({ code }: EDPPProps) {
  const [projectDetails, setProjectDetails] = useState<ProjectDetails>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;

    const getProjectDetails = async () => {
      if (!code) {
        setProjectDetails({});
        return;
      }
      setLoading(true);
      try {
        let storedData: any = await db.getProjects();
        const list = Array.isArray(storedData) ? storedData : [];
        const match = list.find((item: any) => item?.id === code);
        if (!alive) return;
        setProjectDetails(match || {});
      } catch {
        if (!alive) return;
        setProjectDetails({});
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    getProjectDetails();

    return () => {
      alive = false;
    };
  }, [code]);

  const sections = useMemo(() => {
    const p = projectDetails?.projectParameters || {};
    const l = projectDetails?.locations || {};
    const c = projectDetails?.contractualDetails || {};
    const f = projectDetails?.financialParameters || {};
    return [
      {
        title: "Project Details",
        entries: [
          { label: "Company Name", value: displayValue((p as any).companyName) },
          { label: "Project Name", value: displayValue((p as any).projectName) },
          { label: "Mineral", value: displayValue((p as any).mineral) },
          { label: "Type of Mine", value: displayValue((p as any).typeOfMine) },
          { label: "Grade (in case of Coal)", value: displayValue((p as any).grade) },
          { label: "Reserve", value: displayWithUnit((p as any).reserve, "MT") },
          { label: "Net Geological Reserve", value: displayWithUnit((p as any).netGeologicalReserve, "MT") },
          { label: "Extractable Reserve", value: displayWithUnit((p as any).extractableReserve, "MT") },
          { label: "Strip Ratio", value: displayWithUnit((p as any).stripRatio, "m³/t") },
          { label: "Peak Capacity", value: displayWithUnit((p as any).peakCapacity, "MTPA") },
          { label: "Mine Life", value: displayWithUnit((p as any).mineLife, "years") },
          { label: "Total Coal Block Area", value: displayWithUnit((p as any).totalCoalBlockArea, "hectares") },
        ],
      },
      {
        title: "Location Details",
        entries: [
          { label: "Mine Location", value: displayValue((l as any).mineLocation) },
          { label: "State", value: displayValue((l as any).state) },
          { label: "District", value: displayValue((l as any).district) },
          { label: "Nearest Town", value: displayValue((l as any).nearestTown) },
          { label: "Nearest Airport", value: displayValue((l as any).nearestAirport) },
          { label: "Nearest Railway Station", value: displayValue((l as any).nearestRailwayStation) },
        ],
      },
      {
        title: "Contractual Details",
        entries: [
          { label: "Mine Owner", value: displayValue((c as any).mineOwner) },
          { label: "Date of H1 Bidder", value: formatDate((c as any).dateOfH1Bidder) },
          { label: "CBDPA Date", value: formatDate((c as any).cbdpaDate) },
          { label: "Vesting Order Date", value: formatDate((c as any).vestingOrderDate) },
          { label: "PBG Amount", value: displayWithUnit((c as any).pbgAmount, "Cr", "₹") },
        ],
      },
      {
        title: "Financial Parameters",
        entries: [
          { label: "Total Project cost", value: displayWithUnit((f as any).totalProjectCost, "Cr", "₹") },
          { label: "EBITDA Percentage", value: displayWithUnit((f as any).ebitdaPercentage, "%") },
          { label: "IRR", value: displayWithUnit((f as any).irrPercentage, "%") },
          { label: "NPV", value: displayWithUnit((f as any).npvPercentage, "%") },
          { label: "PAT", value: displayWithUnit((f as any).patPercentage, "%") },
          { label: "PAT / Ton", value: displayWithUnit((f as any).patPerTon, "/ton", "₹") },
          { label: "ROE", value: displayWithUnit((f as any).roePercentage, "%") },
          { label: "ROCE", value: displayWithUnit((f as any).rocePercentage, "%") },
        ],
      },
    ] as Array<{ title: string; entries: Array<{ label: string; value: string }> }>;
  }, [projectDetails]);

  const documents = useMemo(() => {
    const docs = projectDetails?.documents;
    return Array.isArray(docs) ? docs : [];
  }, [projectDetails]);

  const initialModules = useMemo(() => {
    const items = projectDetails?.initialStatus?.items;
    return Array.isArray(items) ? items : [];
  }, [projectDetails]);


  const handleDeleteDocument = (docId: string) => {
    Modal.confirm({
      title: "Delete document?",
      content: "Are you sure you want to delete this document? This action cannot be undone.",
      okText: "Delete",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: async () => {
        try {
          const currentDocs = Array.isArray(projectDetails?.documents) ? projectDetails.documents : [];
          const updatedDocs = currentDocs.filter((d) => d?.id !== docId);
          const updatedProjectDetails = { ...projectDetails, documents: updatedDocs };
          if (code) await db.updateProject(code, updatedProjectDetails);
          setProjectDetails(updatedProjectDetails);
          notify.success("Document deleted successfully.");
        } catch {
          notify.error("Failed to delete document.");
        }
      },
    });
  };

  return (
    <div className="edpp-main-cont">
      <Spin spinning={loading}>
        {!code ? (
          <div className="edpp-empty">
            <Empty description="No project selected" />
          </div>
        ) : (
          <>
            {sections.map((s) => (
              <Card key={s.title} title={s.title} style={{ marginBottom: 20 }}>
                {s.entries.length === 0 ? (
                  <div className="edpp-empty">
                    <Empty description="No details available" />
                  </div>
                ) : (
                  <Form
                    layout="horizontal"
                    labelCol={{ span: 8, style: { textAlign: "left" } }}
                    wrapperCol={{ span: 16 }}
                  >
                    <Row gutter={16}>
                      {s.entries.map((entry) => (
                        <Col span={12} key={entry.label}>
                          <Form.Item
                            label={<span style={{ fontWeight: 800 }}>{entry.label}</span>}
                            colon={false}
                          >
                            <Input value={entry.value} readOnly />
                          </Form.Item>
                        </Col>
                      ))}
                    </Row>
                  </Form>
                )}

                {s.title === "Contractual Details" && documents.length > 0 && (
                  <div className="edpp-docs-wrap">
                    <div className="edpp-docs-heading">
                      <Title level={5} className="edpp-docs-heading-title">
                        Attached Contractual Documents
                      </Title>
                      <Text className="edpp-subtle">{documents.length} files</Text>
                    </div>

                    <List
                      className="edpp-docs-list"
                      dataSource={documents}
                      renderItem={(doc) => (
                        <List.Item
                          actions={[
                            <Tooltip title="Download" key="download">
                              <button
                                type="button"
                                className="edpp-doc-action edpp-doc-action-download"
                                onClick={() => downloadFile(doc?.files?.[0])}
                              >
                                <DownloadOutlined />
                              </button>
                            </Tooltip>,
                            <Tooltip title="Delete" key="delete">
                              <button
                                type="button"
                                className="edpp-doc-action edpp-doc-action-delete"
                                onClick={() => handleDeleteDocument(doc.id)}
                              >
                                <CloseCircleOutlined />
                              </button>
                            </Tooltip>,
                          ]}
                        >
                          <List.Item.Meta
                            title={<span className="edpp-docs-meta-title">{doc.documentName}</span>}
                            description={
                              <span className="edpp-docs-meta-desc">
                                Uploaded on: {formatDate(doc.uploadedAt)}
                              </span>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  </div>
                )}
              </Card>
            ))}

            <Card title="Initial Status - Activities" style={{ marginBottom: 20 }}>
              {projectDetails?.initialStatus?.library ? (
                <Title level={5} className="edpp-timeline-title">
                  {displayValue(projectDetails.initialStatus.library)}
                </Title>
              ) : null}

              {initialModules.length === 0 ? (
                <div className="edpp-empty">
                  <Empty description="No activities available" />
                </div>
              ) : (
                initialModules.map((mod, idx) => {
                  const acts = Array.isArray(mod?.activities) ? mod.activities : [];
                  const moduleTitle = mod?.moduleName || mod?.parentModuleCode || `Module ${idx + 1}`;

                  return (
                    <Card
                      key={`${moduleTitle}-${idx}`}
                      type="inner"
                      title={moduleTitle}
                      style={{ marginBottom: 12 }}
                    >
                      {acts.length === 0 ? (
                        <Empty description="No activities in this module" />
                      ) : (
                        <Timeline>
                          {acts.map((activity) => (
                            <Timeline.Item key={String(activity.code || activity.activityName || Math.random())}>
                              <strong>{displayValue(activity.activityName)}</strong>
                              <span className="edpp-subtle">
                                {" "}
                                • Code: {displayValue(activity.code)} • Duration: {displayWithUnit(activity.duration, "days")}
                              </span>
                            </Timeline.Item>
                          ))}
                        </Timeline>
                      )}
                    </Card>
                  );
                })
              )}
            </Card>
          </>
        )}
      </Spin>

      <ToastContainer />
    </div>
  );
}
