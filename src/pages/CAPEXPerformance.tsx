import React, { useEffect, useMemo, useState } from "react";
import { Card, DatePicker, Row, Col, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Dayjs } from "dayjs";
import "../styles/CAPEX-performance.css";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { db } from "../Utils/dataStorege.ts";

const { Title, Text } = Typography;

type CAPEXPerformanceProps = {
  code?: string; // ✅ project id
};

interface CapexData {
  key: React.Key;
  activity: string;
  totalApprovedBudget: number;
  actualExpensePreviousFY: number;
  remainingPreviousFY: number;
  approvedCurrentFY: number;
  approvedYTD: number;
  actualExpenseYTD: number;
  remainingYTD: number;
  budgetUtilizationYTD: string;
}

interface MetricCard {
  title: string;
  subInfo?: string;
}

interface TimelineActivity {
  code: string;
  activityName: string;
  start?: string | null;
  end?: string | null;
  actualStart?: string | null;
  actualFinish?: string | null;
  cost?: {
    projectCost?: number | string | null;
    opCost?: number | string | null;
  };
}

type ProjectDetails = {
  id?: string;
  financialParameters?: {
    totalProjectCost?: any;
    ebitdaPercentage?: any;
    irrPercentage?: any;
    npvPercentage?: any;
    patPercentage?: any;
    patPerTon?: any;
    roePercentage?: any;
    rocePercentage?: any;
  };
};

const formatCr = (n: number) =>
  new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const pretty = (v: any) => {
  if (v === null || v === undefined) return "--";
  if (typeof v === "string" && v.trim() === "") return "--";
  return String(v);
};

const toNumber = (v: any) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const cleaned = v.replace(/,/g, "").trim();
    if (!cleaned) return 0;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const toCr = (n: number) => n / 10000000;

const parseAnyDate = (raw?: string | null) => {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  const dmY = /^(\d{2})-(\d{2})-(\d{4})$/;
  const m = s.match(dmY);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3]);
    return new Date(yyyy, mm - 1, dd);
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

const CAPEXPerformance: React.FC<CAPEXPerformanceProps> = ({ code }) => {
  const [selectedMonth, setSelectedMonth] = useState<Dayjs | null>(null);

  const [projectDetails, setProjectDetails] = useState<ProjectDetails>({});
  const [timelineActivities, setTimelineActivities] = useState<TimelineActivity[]>([]);
  const [activityCosts, setActivityCosts] = useState<any[]>([]);
  const [activityBudgets, setActivityBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const loadCapexContext = async () => {
      if (!code) {
        setProjectDetails({});
        setTimelineActivities([]);
        setActivityCosts([]);
        setActivityBudgets([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const storedData: any = await db.getProjects();
        const list = Array.isArray(storedData) ? storedData : [];
        const match = list.find((item: any) => String(item?.id) === String(code));
        const versions = match?.projectTimeline || [];
        const latestVersion = localStorage.getItem("latestProjectVersion");
        const selectedTimeline =
          (latestVersion ? versions.find((v: any) => String(v?.version) === String(latestVersion)) : null) ||
          versions[versions.length - 1] ||
          versions[0];

        let activities: TimelineActivity[] = [];
        if (selectedTimeline?.timelineId) {
          const timeline = await db.getProjectTimelineById(selectedTimeline.timelineId);
          const modules = Array.isArray(timeline) ? timeline : [];
          activities = modules.flatMap((module: any) =>
            (module?.activities || []).map((a: any) => ({
              code: String(a?.code ?? a?.guicode ?? ""),
              activityName: String(a?.activityName ?? a?.keyActivity ?? a?.code ?? "Activity"),
              start: a?.start ?? null,
              end: a?.end ?? null,
              actualStart: a?.actualStart ?? null,
              actualFinish: a?.actualFinish ?? null,
              cost: a?.cost ?? {},
            }))
          );
        }

        const [costs, budgets] = await Promise.all([
          db.getActivityCostsForProject(String(code)),
          db.getActivityBudgetsForProject(String(code)),
        ]);

        if (!alive) return;
        setProjectDetails(match || {});
        setTimelineActivities(activities);
        setActivityCosts(Array.isArray(costs) ? costs : []);
        setActivityBudgets(Array.isArray(budgets) ? budgets : []);
      } catch {
        if (!alive) return;
        setProjectDetails({});
        setTimelineActivities([]);
        setActivityCosts([]);
        setActivityBudgets([]);
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadCapexContext();
    return () => {
      alive = false;
    };
  }, [code]);

  const financial = projectDetails?.financialParameters || {};

  // ✅ metrics now show project financialParameters
  const metrics: MetricCard[] = useMemo(() => {
    const totalProjectCost = pretty(financial.totalProjectCost);
    const ebitda = pretty(financial.ebitdaPercentage);
    const irr = pretty(financial.irrPercentage);
    const npv = pretty(financial.npvPercentage);
    const pat = pretty(financial.patPercentage);
    const patPerTon = pretty(financial.patPerTon);
    const roe = pretty(financial.roePercentage);
    const roce = pretty(financial.rocePercentage);

    return [
      { title: `Total Project cost - ${totalProjectCost}` },
      { title: `EBITDA Percentage - ${ebitda}` },
      { title: `IRR (%) - ${irr}`, subInfo: `NPV (%) - ${npv}` },
      { title: `PAT (%) - ${pat}`, subInfo: `PAT / Ton - ${patPerTon}` },
      { title: `ROE % - ${roe}`, subInfo: `ROCE% - ${roce}` },
    ];
  }, [financial]);

  const columns: ColumnsType<CapexData> = useMemo(
    () => [
      {
        title: "Activity",
        dataIndex: "activity",
        key: "activity",
        width: 280,
        render: (v: string) => <span className="capex-activity">{v}</span>,
      },
      { title: "Total Approved Budget", dataIndex: "totalApprovedBudget", key: "totalApprovedBudget", render: (v) => `${formatCr(v)}` },
      { title: "Actual Expense till previous FY", dataIndex: "actualExpensePreviousFY", key: "actualExpensePreviousFY", render: (v) => `${formatCr(v)}` },
      { title: "Remaining total budget at the end of previous FY", dataIndex: "remainingPreviousFY", key: "remainingPreviousFY", render: (v) => `${formatCr(v)}` },
      { title: "Approved Budget for Current FY", dataIndex: "approvedCurrentFY", key: "approvedCurrentFY", render: (v) => `${formatCr(v)}` },
      { title: "Approved budget current FY (YTD)", dataIndex: "approvedYTD", key: "approvedYTD", render: (v) => `${formatCr(v)}` },
      { title: "Actual Expense for current FY (YTD)", dataIndex: "actualExpenseYTD", key: "actualExpenseYTD", render: (v) => `${formatCr(v)}` },
      { title: "Remaining budget for current FY (YTD)", dataIndex: "remainingYTD", key: "remainingYTD", render: (v) => `${formatCr(v)}` },
      {
        title: "% budget utilization for current FY (YTD)",
        dataIndex: "budgetUtilizationYTD",
        key: "budgetUtilizationYTD",
        render: (v: string) => <span className="capex-pill">{v}</span>,
      },
    ],
    []
  );

  const { data, overallData, currentFYData } = useMemo(() => {
    const byCode = new Map<string, { activityName: string; date: Date | null; inlineBudget: number; inlineActual: number }>();

    for (const a of timelineActivities) {
      if (!a.code) continue;
      const dateRef = parseAnyDate(a.actualFinish) || parseAnyDate(a.actualStart) || parseAnyDate(a.end) || parseAnyDate(a.start);
      byCode.set(a.code, {
        activityName: a.activityName || a.code,
        date: dateRef,
        inlineBudget: toNumber(a?.cost?.projectCost),
        inlineActual: toNumber(a?.cost?.opCost),
      });
    }

    for (const c of activityCosts) {
      const codeKey = String(c?.activityCode ?? "").trim();
      if (!codeKey) continue;
      const prev = byCode.get(codeKey);
      byCode.set(codeKey, {
        activityName: String(c?.activityName ?? prev?.activityName ?? codeKey),
        date: prev?.date ?? null,
        inlineBudget: toNumber(c?.projectCost ?? prev?.inlineBudget ?? 0),
        inlineActual: toNumber(c?.opportunityCost ?? prev?.inlineActual ?? 0),
      });
    }

    const budgetMap = new Map<string, any>();
    for (const b of activityBudgets) {
      const codeKey = String(b?.activityCode ?? "").trim();
      if (!codeKey) continue;
      budgetMap.set(codeKey, b);
      if (!byCode.has(codeKey)) {
        byCode.set(codeKey, {
          activityName: String(b?.activityName ?? codeKey),
          date: null,
          inlineBudget: 0,
          inlineActual: 0,
        });
      }
    }

    const asOf = selectedMonth ? selectedMonth.endOf("month").toDate() : new Date();
    const fyStartYear = asOf.getMonth() >= 3 ? asOf.getFullYear() : asOf.getFullYear() - 1;
    const fyStart = new Date(fyStartYear, 3, 1, 0, 0, 0, 0);
    const fyEnd = new Date(fyStartYear + 1, 2, 31, 23, 59, 59, 999);

    const fySpan = Math.max(1, fyEnd.getTime() - fyStart.getTime());
    const elapsed = Math.max(0, Math.min(1, (asOf.getTime() - fyStart.getTime()) / fySpan));

    let totalApprovedAll = 0;
    let totalActualTillDate = 0;
    let totalApprovedYTD = 0;
    let totalActualYTD = 0;

    const rows: CapexData[] = Array.from(byCode.entries()).map(([codeKey, rec], idx) => {
      const budgetRec = budgetMap.get(codeKey);
      const history = Array.isArray(budgetRec?.revisionHistory) ? budgetRec.revisionHistory : [];
      const latestRevision = history.length ? history[history.length - 1] : null;
      const approvedRaw =
        toNumber(latestRevision?.amount) ||
        toNumber(budgetRec?.revisedBudget) ||
        toNumber(budgetRec?.originalBudget) ||
        toNumber(rec.inlineBudget);

      const actualRaw = toNumber(rec.inlineActual);
      const spendDate = rec.date;

      const actualPrevRaw = spendDate && spendDate < fyStart ? actualRaw : 0;
      const actualYtdRaw = spendDate && spendDate >= fyStart && spendDate <= asOf ? actualRaw : 0;
      const actualTillDateRaw = spendDate && spendDate <= asOf ? actualRaw : 0;

      const approvedCurrentFYRaw = Math.max(approvedRaw - actualPrevRaw, 0);
      const approvedYtdRaw = approvedCurrentFYRaw * elapsed;
      const remainingPrevRaw = Math.max(approvedRaw - actualPrevRaw, 0);
      const remainingYtdRaw = Math.max(approvedYtdRaw - actualYtdRaw, 0);
      const utilizationPct = approvedYtdRaw > 0 ? Math.min(100, Math.round((actualYtdRaw / approvedYtdRaw) * 100)) : 0;

      totalApprovedAll += approvedRaw;
      totalActualTillDate += actualTillDateRaw;
      totalApprovedYTD += approvedYtdRaw;
      totalActualYTD += actualYtdRaw;

      return {
        key: `${codeKey}-${idx}`,
        activity: rec.activityName || codeKey,
        totalApprovedBudget: toCr(approvedRaw),
        actualExpensePreviousFY: toCr(actualPrevRaw),
        remainingPreviousFY: toCr(remainingPrevRaw),
        approvedCurrentFY: toCr(approvedCurrentFYRaw),
        approvedYTD: toCr(approvedYtdRaw),
        actualExpenseYTD: toCr(actualYtdRaw),
        remainingYTD: toCr(remainingYtdRaw),
        budgetUtilizationYTD: `${utilizationPct}%`,
      };
    });

    const overallUtilized = Math.min(totalActualTillDate, totalApprovedAll);
    const overallRemaining = Math.max(totalApprovedAll - overallUtilized, 0);
    const fyYtdUtilized = Math.min(totalActualYTD, totalApprovedYTD);
    const fyYtdRemaining = Math.max(totalApprovedYTD - fyYtdUtilized, 0);

    const overallPie = [
      { name: "Budget utilized till date", value: Number(toCr(overallUtilized).toFixed(2)) },
      { name: "Remaining", value: Number(toCr(overallRemaining).toFixed(2)) },
    ];

    const currentFyPie = [
      { name: "Actual expense current FY (YTD)", value: Number(toCr(fyYtdUtilized).toFixed(2)) },
      { name: "Remaining", value: Number(toCr(fyYtdRemaining).toFixed(2)) },
    ];

    return {
      data: rows,
      overallData: overallPie,
      currentFYData: currentFyPie,
    };
  }, [timelineActivities, activityCosts, activityBudgets, selectedMonth]);

  const COLORS = ["#1F7A63", "#34D399"];
  const hasOperationalData = timelineActivities.length > 0 || activityCosts.length > 0 || activityBudgets.length > 0;

  if (loading) {
    return (
      <div className="capex-container">
        <div className="capex-empty-state">
          <div className="capex-empty-title">Loading CAPEX data...</div>
          <div className="capex-empty-sub">Preparing budget and cost insights for this project.</div>
        </div>
      </div>
    );
  }

  if (!hasOperationalData) {
    return (
      <div className="capex-container">
        <div className="capex-header-row">
          <div className="capex-heading">
            <Title level={5} className="capex-title">
              CAPEX Performance
            </Title>
            <Text className="capex-subtitle">
              Budget utilization overview with FY breakdown and activity-wise details.
            </Text>
          </div>
        </div>

        <div className="capex-empty-state">
          <div className="capex-empty-title">No CAPEX content available</div>
          <div className="capex-empty-sub">
            This project does not have timeline activities, activity budgets, or activity costs yet. Add timeline and cost data to view CAPEX analytics.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="capex-container">
      <div className="capex-header-row">
        <div className="capex-heading">
          <Title level={5} className="capex-title">
            CAPEX Performance
          </Title>
          <Text className="capex-subtitle">
            Budget utilization overview with FY breakdown and activity-wise details.
          </Text>
        </div>

        <div className="capex-date-row">
          <Text className="capex-date-label">Date</Text>
          <DatePicker picker="month" onChange={(date) => setSelectedMonth(date)} className="capex-datepicker" />
        </div>
      </div>

      <div className="capex-cards-flex">
        {metrics.map((metric, index) => (
          <Card className="capex-card" key={index}>
            <Text className="capex-metric">{metric.title}</Text>
            {metric.subInfo ? <Text className="capex-metric-sub">{metric.subInfo}</Text> : null}
          </Card>
        ))}
      </div>

      <div className="capex-charts">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card className="capex-chart-card">
              <div className="capex-chart-head">
                <Title level={4} className="capex-chart-title">
                  Overall CAPEX Performance
                </Title>
                <Text className="capex-chart-meta">Utilized vs remaining till date</Text>
              </div>

              <div className="capex-chart-wrap">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={overallData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={95}
                      innerRadius={55}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {overallData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend layout="vertical" align="right" verticalAlign="middle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card className="capex-chart-card">
              <div className="capex-chart-head">
                <Title level={4} className="capex-chart-title">
                  Current FY CAPEX Performance
                </Title>
                <Text className="capex-chart-meta">YTD actual vs remaining budget</Text>
              </div>

              <div className="capex-chart-wrap">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={currentFYData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={95}
                      innerRadius={55}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {currentFYData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend layout="vertical" align="right" verticalAlign="middle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      <Card className="capex-table-card">
        <div className="capex-table-head">
          <Title level={4} className="capex-table-title">
            Activity-wise CAPEX
          </Title>
          <Text className="capex-table-meta">All values in Cr</Text>
        </div>

        <div className="capex-table-scroll">
          <Table columns={columns} dataSource={data} bordered pagination={false} className="capex-table" rowKey="key" />
        </div>
      </Card>
    </div>
  );
};

export default CAPEXPerformance;
