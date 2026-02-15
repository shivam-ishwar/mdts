import { useEffect, useState } from "react";
import "../styles/dprcost.css";
import { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import { Table } from "antd";
import eventBus from "../Utils/EventEmitter";
import { db } from "../Utils/dataStorege.ts";
import { getCurrentUser } from "../Utils/moduleStorage";
import { FolderOpenOutlined } from "@mui/icons-material";

const DPRCostBuilder = () => {
  const navigate = useNavigate();
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [dataSource, setDataSource] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [modulesData, setModulesData] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    })();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    db.getModules()
      .then((mods: any[]) =>
        setModulesData(
          (mods || []).filter(
            (mod: any) => mod.orgId === currentUser.orgId && mod.moduleType !== "MDTS"
          )
        )
      )
      .catch(() => setModulesData([]));
  }, [currentUser]);

  useEffect(() => {
    handleLibraryChange(modulesData);
  }, [modulesData]);

  const toNumber = (val: any): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === "number") return isFinite(val) ? val : 0;
    const n = parseFloat(String(val).replace(/,/g, "").trim());
    return isNaN(n) ? 0 : n;
  };

  const handleLibraryChange = (libraryItems: any[]) => {
    if (!libraryItems || libraryItems.length === 0) {
      setDataSource([]);
      return;
    }

    const fin = libraryItems.map((module: any, mi: number) => {
      let total = 0;

      const children = (module.activities || []).map((a: any, ai: number) => {
        const dpr = a?.cost?.dprCost ? toNumber(a.cost.dprCost) : 0;
        total += dpr;

        return {
          key: `activity-${mi}-${ai}`,
          SrNo: module.parentModuleCode,
          Code: a.code,
          keyActivity: a.activityName,
          duration: a.duration ?? "",
          preRequisite: a.prerequisite ?? "-",
          dprCost: a.cost?.dprCost && dpr > 0 ? a.cost.dprCost : "-"
        };
      });

      children.push({
        key: `module-${mi}-total`,
        keyActivity: "Total DPR Cost",
        isTotal: true,
        dprCost: total,
        moduleName: module.moduleName
      });

      return {
        key: `module-${mi}`,
        Code: module.parentModuleCode,
        keyActivity: module.moduleName,
        isModule: true,
        children
      };
    });

    setDataSource(fin);
    setExpandedKeys(fin.map((_, i) => `module-${i}`));
  };

  const columns: ColumnsType<any> = [
    {
      title: "Sr No",
      dataIndex: "Code",
      key: "Code",
      align: "center",
      render: (v, r) => (r.isTotal ? null : v)
    },
    {
      title: "Key Activity",
      dataIndex: "keyActivity",
      key: "keyActivity",
      render: (v, r) =>
        r.isTotal ? (
          <div className="dpr-cost-total-label">Total DPR Cost</div>
        ) : (
          v
        )
    },
    {
      title: "Duration",
      dataIndex: "duration",
      key: "duration",
      align: "center",
      render: (v, r) => (r.isTotal ? null : v)
    },
    {
      title: "Pre-Requisite",
      dataIndex: "preRequisite",
      key: "preRequisite",
      align: "center",
      render: (v, r) => (r.isTotal ? null : v)
    },
    {
      title: "DPR Cost",
      dataIndex: "dprCost",
      key: "dprCost",
      align: "right",
      render: (v, r) =>
        r.isModule
          ? ""
          : r.isTotal
            ? <div className="dpr-cost-total-value">{new Intl.NumberFormat("en-IN").format(toNumber(v))}</div>
            : v === "-"
              ? "-"
              : new Intl.NumberFormat("en-IN").format(toNumber(v))
    }
  ];

  return (
    <>
      <div className="dpr-cost-heading">
        <div className="dpr-cost-heading-inner">
          <div>
            <p className="page-heading-title">DPR Cost Builder</p>
            <span className="pl-subtitle">Review and consolidate DPR cost across activities</span>
          </div>
        </div>
      </div>

      <div className="dpr-cost-main">
        {modulesData.length > 0 ? (
          <div className="dpr-cost-content">
            <div className="dpr-cost-table-shell">
              <Table
                columns={columns}
                dataSource={dataSource}
                className="dpr-cost-table"
                pagination={false}
                expandable={{
                  expandedRowRender: () => null,
                  rowExpandable: (r: any) => !!r.children,
                  expandedRowKeys: expandedKeys,
                  onExpand: (e, r: any) =>
                    setExpandedKeys(
                      e ? [...expandedKeys, r.key] : expandedKeys.filter(k => k !== r.key)
                    )
                }}
                rowClassName={(r: any) =>
                  r.isModule ? "module-header" : r.isTotal ? "module-total-row" : "activity-row"
                }
                bordered
                scroll={{ x: "max-content", y: "calc(100vh - 255px)" }}
              />
            </div>
          </div>
        ) : (
          <div className="dpr-cost-empty-wrap">
            <div className="dpr-cost-empty-card">
              <FolderOpenOutlined className="dpr-cost-empty-icon" />
              <h3>No Module Found</h3>
              <p>You need to create a module.</p>
              <button
                onClick={() => {
                  eventBus.emit("updateTab", "/modules");
                  navigate("/modules");
                }}
              >
                Create Module
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default DPRCostBuilder;
