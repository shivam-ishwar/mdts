import { useEffect, useState } from "react";
import "../styles/delay-cost.css";
import { ColumnsType } from "antd/es/table";
import { Table } from "antd";

const DelayCostCalculator = () => {
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [dataSource, setDataSource] = useState<any[]>([]);

  useEffect(() => {
    const data = getStaticTimeline();
    setDataSource(data);
    setExpandedKeys(data.map((item: any) => item.key));
  }, []);

  const baseColumns: ColumnsType<any> = [
    { title: "Sr No", dataIndex: "Code", key: "Code", align: "center", width: 130 },
    { title: "Key Activity", dataIndex: "keyActivity", key: "keyActivity", width: 240 },
    { title: "Pre-Requisite", dataIndex: "preRequisite", key: "preRequisite", align: "center", width: 120 },
    { title: "Planned Start", dataIndex: "plannedStart", key: "plannedStart", align: "center", width: 120 },
    { title: "Planned Finish", dataIndex: "plannedFinish", key: "plannedFinish", align: "center", width: 120 },
    { title: "Actual Start", dataIndex: "actualStart", key: "actualStart", align: "center", width: 120 },
    { title: "Actual Finish", dataIndex: "actualFinish", key: "actualFinish", align: "center", width: 120 },
    {
      title: "Delay (Days)",
      dataIndex: "delay",
      key: "delay",
      align: "center",
      width: 100,
      sorter: (a, b) => a.delay - b.delay,
      render: (value: number) => {
        let color = "#52c41a";
        if (value > 30) color = "#ff4d4f";
        else if (value > 10) color = "#faad14";

        return <span style={{ color, fontWeight: value > 0 ? 600 : 400 }}>{value}</span>;
      }
    },
    {
      title: "Project Cost (/day)",
      dataIndex: "projectCost",
      key: "projectCost",
      align: "right",
      width: 140,
      render: (value: number) =>
        <span style={{ fontWeight: value > 2000 ? 600 : 400 }}>
          ₹{value.toLocaleString("en-IN")}
        </span>
    },
    {
      title: "Opportunity Cost (/day)",
      dataIndex: "opCost",
      key: "opCost",
      align: "right",
      width: 150,
      render: (value: number) =>
        <span style={{ fontWeight: value > 2000 ? 600 : 400 }}>
          ₹{value.toLocaleString("en-IN")}
        </span>
    },
  ];

  const getStaticTimeline = () => {
    const activities = [
      {
        "code": "CF/10",
        "activityName": "Declaration as H1 Bidder",
        "prerequisite": null,
        "start": "01-05-2025",
        "end": "02-05-2025",
        "actualStart": "01-05-2025",
        "actualFinish": "05-08-2025",
        "cost": {
          "projectCost": 1000,
          "opCost": 1000
        },
        "delay": 95
      },
      {
        "code": "CF/20",
        "activityName": "Signing of CBDPA",
        "prerequisite": "CF/10",
        "start": "05-05-2025",
        "end": "16-06-2025",
        "actualStart": "06-08-2025",
        "actualFinish": "17-09-2025",
        "cost": {
          "projectCost": 2000,
          "opCost": 2000
        },
        "delay": 93
      },
      {
        "code": "CF/30",
        "activityName": "Payment to MoC",
        "prerequisite": "CF/20",
        "start": "17-06-2025",
        "end": "29-07-2025",
        "actualStart": "18-09-2025",
        "actualFinish": "30-10-2025",
        "cost": {
          "projectCost": 3000,
          "opCost": 3000
        },
        "delay": 63
      },
      {
        "code": "GY/10",
        "activityName": "Preparation of NFA for interim budget",
        "prerequisite": null,
        "start": "01-06-2025",
        "end": "15-06-2025",
        "actualStart": "01-06-2025",
        "actualFinish": "15-06-2025",
        "cost": {
          "projectCost": 500,
          "opCost": 500
        },
        "delay": 0
      },
      {
        "code": "GY/20",
        "activityName": "Approval of Interim Budget",
        "prerequisite": "GY/10",
        "start": "23-06-2025",
        "end": "14-07-2025",
        "actualStart": "23-06-2025",
        "actualFinish": "10-07-2025",
        "cost": {
          "projectCost": 1000,
          "opCost": 1000
        },
        "delay": -4
      },
      {
        "code": "GY/30",
        "activityName": "Preparation of DPR",
        "prerequisite": "GY/20",
        "start": "15-07-2025",
        "end": "18-11-2025",
        "actualStart": "15-07-2025",
        "actualFinish": "18-11-2025",
        "cost": {
          "projectCost": 1500,
          "opCost": 1500
        },
        "delay": 0
      },
      {
        "code": "RD/10",
        "activityName": "Requirement Finalization",
        "prerequisite": null,
        "start": "10-06-2025",
        "end": "20-06-2025",
        "actualStart": "10-06-2025",
        "actualFinish": "30-06-2025",
        "cost": {
          "projectCost": 800,
          "opCost": 900
        },
        "delay": 10
      },
      {
        "code": "RD/20",
        "activityName": "Development",
        "prerequisite": "RD/10",
        "start": "21-06-2025",
        "end": "15-07-2025",
        "actualStart": "01-07-2025",
        "actualFinish": "25-07-2025",
        "cost": {
          "projectCost": 2500,
          "opCost": 3000
        },
        "delay": 10
      },
      {
        "code": "RD/30",
        "activityName": "Testing and Quality Assurance",
        "prerequisite": "RD/20",
        "start": "16-07-2025",
        "end": "30-07-2025",
        "actualStart": "26-07-2025",
        "actualFinish": "10-08-2025",
        "cost": {
          "projectCost": 1200,
          "opCost": 1500
        },
        "delay": 11
      },
      {
        "code": "RD/40",
        "activityName": "Deployment and Go-Live",
        "prerequisite": "RD/30",
        "start": "01-08-2025",
        "end": "10-08-2025",
        "actualStart": "11-08-2025",
        "actualFinish": "20-08-2025",
        "cost": {
          "projectCost": 500,
          "opCost": 800
        },
        "delay": 10
      },
      {
        "code": "PL/10",
        "activityName": "Project Planning and Scoping",
        "prerequisite": null,
        "start": "01-04-2025",
        "end": "30-04-2025",
        "actualStart": "01-04-2025",
        "actualFinish": "30-04-2025",
        "cost": {
          "projectCost": 2000,
          "opCost": 1000
        },
        "delay": 0
      },
      {
        "code": "PL/20",
        "activityName": "Resource Allocation",
        "prerequisite": "PL/10",
        "start": "01-05-2025",
        "end": "15-05-2025",
        "actualStart": "01-05-2025",
        "actualFinish": "15-05-2025",
        "cost": {
          "projectCost": 800,
          "opCost": 400
        },
        "delay": 0
      },
      {
        "code": "PL/30",
        "activityName": "Risk Assessment and Mitigation",
        "prerequisite": "PL/20",
        "start": "16-05-2025",
        "end": "31-05-2025",
        "actualStart": "16-05-2025",
        "actualFinish": "31-05-2025",
        "cost": {
          "projectCost": 1500,
          "opCost": 700
        },
        "delay": 0
      },
      {
        "code": "DE/10",
        "activityName": "Initial Design & Architecture",
        "prerequisite": "PL/30",
        "start": "01-06-2025",
        "end": "30-06-2025",
        "actualStart": "05-06-2025",
        "actualFinish": "05-07-2025",
        "cost": {
          "projectCost": 3000,
          "opCost": 2000
        },
        "delay": 5
      },
      {
        "code": "DE/20",
        "activityName": "Backend Development",
        "prerequisite": "DE/10",
        "start": "01-07-2025",
        "end": "31-08-2025",
        "actualStart": "06-07-2025",
        "actualFinish": "10-09-2025",
        "cost": {
          "projectCost": 5000,
          "opCost": 4000
        },
        "delay": 10
      },
      {
        "code": "DE/30",
        "activityName": "Frontend Development",
        "prerequisite": "DE/10",
        "start": "01-07-2025",
        "end": "31-08-2025",
        "actualStart": "06-07-2025",
        "actualFinish": "15-09-2025",
        "cost": {
          "projectCost": 4500,
          "opCost": 3500
        },
        "delay": 15
      },
      {
        "code": "DE/40",
        "activityName": "Database Integration",
        "prerequisite": "DE/20",
        "start": "01-09-2025",
        "end": "30-09-2025",
        "actualStart": "11-09-2025",
        "actualFinish": "15-10-2025",
        "cost": {
          "projectCost": 2000,
          "opCost": 1500
        },
        "delay": 15
      },
      {
        "code": "OP/10",
        "activityName": "System Maintenance",
        "prerequisite": "DE/40",
        "start": "01-10-2025",
        "end": "31-12-2025",
        "actualStart": "16-10-2025",
        "actualFinish": "15-01-2026",
        "cost": {
          "projectCost": 2500,
          "opCost": 2500
        },
        "delay": 15
      },
      {
        "code": "OP/20",
        "activityName": "User Training",
        "prerequisite": "DE/40",
        "start": "01-10-2025",
        "end": "31-10-2025",
        "actualStart": "16-10-2025",
        "actualFinish": "20-11-2025",
        "cost": {
          "projectCost": 1000,
          "opCost": 800
        },
        "delay": 20
      }
    ]
    const parseDate = (dateString: string) => {
      const [day, month, year] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    const calculateDelay = (plannedFinishStr: string, actualFinishStr: string) => {
      const plannedFinish = parseDate(plannedFinishStr);
      const actualFinish = parseDate(actualFinishStr);
      if (actualFinish <= plannedFinish) return 0;
      const diffTime = actualFinish.getTime() - plannedFinish.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const augmentedActivities = activities.map(a => ({
      ...a,
      delay: calculateDelay(a.end, a.actualFinish),
      children: [] as any[],
    }));
    const activityMap = new Map(augmentedActivities.map(a => [a.code, a]));

    const allRoots: any[] = [];
    augmentedActivities.forEach(activity => {
      if (activity.prerequisite && activityMap.has(activity.prerequisite)) {
        activityMap.get(activity.prerequisite)!.children.push(activity);
      } else {
        allRoots.push(activity);
      }
    });

    const delayedHeaders: any[] = [];
    const collectAllDescendants = (node: any, descendants: any[] = []) => {
      for (const child of node.children) {
        descendants.push(child);
        collectAllDescendants(child, descendants);
      }
      return descendants;
    };

    const findDelayedChains = (nodes: any[]) => {
      nodes.forEach(node => {
        if (node.delay > 0) {
          const flatDescendants = collectAllDescendants(node);
          const cleanedDescendants = flatDescendants.map(desc => ({ ...desc, children: undefined }));
          const headerWithFlatChildren = {
            ...node,
            children: cleanedDescendants,
          };
          delayedHeaders.push(headerWithFlatChildren);

        } else {
          findDelayedChains(node.children);
        }
      });
    };
    findDelayedChains(allRoots);

    const mapActivityToRow = (a: any): any => ({
      key: a.code,
      Code: a.code,
      keyActivity: a.activityName,
      preRequisite: a.prerequisite ?? '-',
      plannedStart: a.start,
      plannedFinish: a.end,
      actualStart: a.actualStart,
      actualFinish: a.actualFinish,
      delay: a.delay,
      projectCost: a.cost.projectCost,
      opCost: a.cost.opCost,
      children: a.children?.map(mapActivityToRow),
    });

    return delayedHeaders.map(mapActivityToRow);
  };

  return (
    <>
      <div className="delay-cost-heading">
        <div>
          <p className="page-heading-title">Delay Cost Builder</p>
          <span className="pl-subtitle">Estimate delay impact and cost exposure activity-wise</span>
        </div>
      </div>

      <div className="delay-cost-main">
        <div className="delay-cost-content">
          <div className="delay-cost-table-shell">
            <Table
              columns={baseColumns}
              dataSource={dataSource}
              className="delay-cost-table"
              pagination={false}
              expandable={{
                expandedRowKeys: expandedKeys,
                onExpand: (expanded, record: any) => {
                  setExpandedKeys(
                    expanded
                      ? [...expandedKeys, record.key]
                      : expandedKeys.filter((key) => key !== record.key)
                  );
                },
              }}
              rowClassName={(record: any) => {
                if (record.delay > 30) return "delay-cost-row-high";
                if (record.delay > 10) return "delay-cost-row-medium";
                return "";
              }}
              bordered
              scroll={{ x: "max-content", y: "calc(100vh - 300px)" }}
              summary={() => {
                const flatten = (rows: any[]): any[] =>
                  rows.flatMap((row) => [row, ...(row.children ? flatten(row.children) : [])]);

                const allRows = flatten(dataSource);

                const totalProjectCost = allRows.reduce((sum, r) => {
                  return sum + (r.delay > 0 ? r.delay * (r.projectCost || 0) : 0);
                }, 0);

                const totalOpCost = allRows.reduce((sum, r) => {
                  return sum + (r.delay > 0 ? r.delay * (r.opCost || 0) : 0);
                }, 0);

                const formatCurrency = (value: number) =>
                  new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0,
                  }).format(value);

                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row className="delay-cost-summary-row">
                      <Table.Summary.Cell
                        index={0}
                        colSpan={8}
                        align="right"
                        className="delay-cost-summary-label"
                      >
                        Total Cost (Based on Delay × Per Day Cost)
                      </Table.Summary.Cell>

                      <Table.Summary.Cell
                        index={8}
                        align="right"
                        className="delay-cost-summary-value"
                      >
                        {formatCurrency(totalProjectCost)}
                      </Table.Summary.Cell>

                      <Table.Summary.Cell
                        index={9}
                        align="right"
                        className="delay-cost-summary-value"
                      >
                        {formatCurrency(totalOpCost)}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />
          </div>
        </div>
      </div>
    </>
  );

};

export default DelayCostCalculator;
