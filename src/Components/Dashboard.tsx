import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

type Task = {
  id: string;
  module: string;
  activity: string;
  owner: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string;
  actualEnd: string;
};

type Row = {
  name: string;
  module: string;
  activity: string;
  owner: string;

  plannedOffset: number;
  plannedDuration: number;

  actualOffset: number;
  actualDuration: number;

  plannedStart: string;
  plannedEnd: string;
  actualStart: string;
  actualEnd: string;

  delayDays: number;
  startSlipDays: number;
};

const dayMs = 24 * 60 * 60 * 1000;

const parseDate = (s: string) => {
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date(s + "T00:00:00") : d;
};

const toDay = (d: Date) => Math.floor(d.getTime() / dayMs);

const diffDays = (a: Date, b: Date) => toDay(a) - toDay(b);

const clampNonNeg = (n: number) => (n < 0 ? 0 : n);

const formatDate = (s: string) => {
  const d = parseDate(s);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const Dashboard = () => {
  const tasks: Task[] = useMemo(
    () => [
      {
        id: "T1",
        module: "Project Setup",
        activity: "Kickoff & Mobilization",
        owner: "PMO",
        plannedStart: "2026-02-03",
        plannedEnd: "2026-02-07",
        actualStart: "2026-02-03",
        actualEnd: "2026-02-08",
      },
      {
        id: "T2",
        module: "Survey",
        activity: "Topographic Survey",
        owner: "Survey",
        plannedStart: "2026-02-06",
        plannedEnd: "2026-02-12",
        actualStart: "2026-02-07",
        actualEnd: "2026-02-15",
      },
      {
        id: "T3",
        module: "Geotech",
        activity: "Soil & Geotech Investigation",
        owner: "Geotech",
        plannedStart: "2026-02-10",
        plannedEnd: "2026-02-20",
        actualStart: "2026-02-12",
        actualEnd: "2026-02-24",
      },
      {
        id: "T4",
        module: "Permits",
        activity: "Statutory Clearances",
        owner: "Compliance",
        plannedStart: "2026-02-05",
        plannedEnd: "2026-03-05",
        actualStart: "2026-02-08",
        actualEnd: "2026-03-10",
      },
      {
        id: "T5",
        module: "Design",
        activity: "Mine Plan Draft",
        owner: "Planning",
        plannedStart: "2026-02-18",
        plannedEnd: "2026-03-02",
        actualStart: "2026-02-20",
        actualEnd: "2026-03-06",
      },
      {
        id: "T6",
        module: "Procurement",
        activity: "Explosives & Consumables PO",
        owner: "Procurement",
        plannedStart: "2026-02-25",
        plannedEnd: "2026-03-10",
        actualStart: "2026-02-26",
        actualEnd: "2026-03-12",
      },
      {
        id: "T7",
        module: "Haul Road",
        activity: "Road Formation",
        owner: "Civil",
        plannedStart: "2026-03-01",
        plannedEnd: "2026-03-18",
        actualStart: "2026-03-03",
        actualEnd: "2026-03-24",
      },
      {
        id: "T8",
        module: "Utilities",
        activity: "Power & Water Setup",
        owner: "Utilities",
        plannedStart: "2026-03-05",
        plannedEnd: "2026-03-22",
        actualStart: "2026-03-06",
        actualEnd: "2026-03-26",
      },
      {
        id: "T9",
        module: "Drilling",
        activity: "Production Drilling - Phase 1",
        owner: "Ops",
        plannedStart: "2026-03-15",
        plannedEnd: "2026-04-05",
        actualStart: "2026-03-18",
        actualEnd: "2026-04-12",
      },
      {
        id: "T10",
        module: "Blasting",
        activity: "Controlled Blasting - Phase 1",
        owner: "Ops",
        plannedStart: "2026-04-01",
        plannedEnd: "2026-04-10",
        actualStart: "2026-04-05",
        actualEnd: "2026-04-15",
      },
      {
        id: "T11",
        module: "Loading & Hauling",
        activity: "Overburden Removal - Phase 1",
        owner: "Ops",
        plannedStart: "2026-04-08",
        plannedEnd: "2026-04-30",
        actualStart: "2026-04-12",
        actualEnd: "2026-05-06",
      },
      {
        id: "T12",
        module: "QA & Handover",
        activity: "Safety Audit & Readiness Sign-off",
        owner: "HSE",
        plannedStart: "2026-05-01",
        plannedEnd: "2026-05-07",
        actualStart: "2026-05-05",
        actualEnd: "2026-05-10",
      },
    ],
    []
  );

  const { data, projectStart, projectEnd } = useMemo(() => {
    const allStarts = tasks.flatMap((t) => [parseDate(t.plannedStart), parseDate(t.actualStart)]);
    const allEnds = tasks.flatMap((t) => [parseDate(t.plannedEnd), parseDate(t.actualEnd)]);
    const minStart = new Date(Math.min(...allStarts.map((d) => d.getTime())));
    const maxEnd = new Date(Math.max(...allEnds.map((d) => d.getTime())));

    const rows: Row[] = tasks.map((t) => {
      const ps = parseDate(t.plannedStart);
      const pe = parseDate(t.plannedEnd);
      const as = parseDate(t.actualStart);
      const ae = parseDate(t.actualEnd);

      const plannedOffset = clampNonNeg(diffDays(ps, minStart));
      const plannedDuration = clampNonNeg(diffDays(pe, ps)) + 1;

      const actualOffset = clampNonNeg(diffDays(as, minStart));
      const actualDuration = clampNonNeg(diffDays(ae, as)) + 1;

      const delayDays = diffDays(ae, pe);
      const startSlipDays = diffDays(as, ps);

      const name = `${t.module} • ${t.activity}`;

      return {
        name,
        module: t.module,
        activity: t.activity,
        owner: t.owner,

        plannedOffset,
        plannedDuration,
        actualOffset,
        actualDuration,

        plannedStart: formatDate(t.plannedStart),
        plannedEnd: formatDate(t.plannedEnd),
        actualStart: formatDate(t.actualStart),
        actualEnd: formatDate(t.actualEnd),

        delayDays,
        startSlipDays,
      };
    });

    return {
      data: rows,
      projectStart: minStart,
      projectEnd: maxEnd,
    };
  }, [tasks]);

  const totalDays = useMemo(() => clampNonNeg(diffDays(projectEnd, projectStart)) + 1, [projectEnd, projectStart]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const row: Row = payload[0].payload;

    const delayLabel =
      row.delayDays > 0 ? `+${row.delayDays}d delayed` : row.delayDays < 0 ? `${row.delayDays}d ahead` : "On time";
    const startSlipLabel =
      row.startSlipDays > 0 ? `+${row.startSlipDays}d start slip` : row.startSlipDays < 0 ? `${row.startSlipDays}d early start` : "Start on time";

    const boxStyle: React.CSSProperties = {
      background: "rgba(255,255,255,0.96)",
      border: "1px solid rgba(0,0,0,0.12)",
      borderRadius: 12,
      padding: 12,
      boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
      maxWidth: 420,
    };

    const titleStyle: React.CSSProperties = { fontWeight: 700, marginBottom: 6, fontSize: 14 };
    const metaStyle: React.CSSProperties = { fontSize: 12, opacity: 0.8, marginBottom: 10 };
    const rowStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 16, fontSize: 12, marginBottom: 6 };

    return (
      <div style={boxStyle}>
        <div style={titleStyle}>{row.activity}</div>
        <div style={metaStyle}>
          {row.module} • Owner: {row.owner}
        </div>
        <div style={rowStyle}>
          <span>Planned</span>
          <span>
            {row.plannedStart} → {row.plannedEnd} ({row.plannedDuration}d)
          </span>
        </div>
        <div style={rowStyle}>
          <span>Actual</span>
          <span>
            {row.actualStart} → {row.actualEnd} ({row.actualDuration}d)
          </span>
        </div>
        <div style={rowStyle}>
          <span>Start variance</span>
          <span>{startSlipLabel}</span>
        </div>
        <div style={{ ...rowStyle, marginBottom: 0 }}>
          <span>End variance</span>
          <span>{delayLabel}</span>
        </div>
      </div>
    );
  };

  const containerStyle: React.CSSProperties = {
    width: "100%",
    padding: 16,
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  };

  const titleStyle: React.CSSProperties = { fontSize: 18, fontWeight: 800, margin: 0 };
  const subtitleStyle: React.CSSProperties = { fontSize: 12, opacity: 0.75, margin: 0 };

  const cardStyle: React.CSSProperties = {
    border: "1px solid rgba(0,0,0,0.10)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 14px 40px rgba(0,0,0,0.06)",
    background: "white",
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>Project Timeline (Gantt)</h2>
          <p style={subtitleStyle}>
            Baseline vs Actual • {formatDate(projectStart.toISOString().slice(0, 10))} → {formatDate(projectEnd.toISOString().slice(0, 10))} • Total {totalDays} days
          </p>
        </div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          {data.length} activities
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ height: Math.max(520, data.length * 44) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 10, right: 24, bottom: 10, left: 240 }}
              barCategoryGap={14}
              barGap={8}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, totalDays]} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={230} tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="plannedOffset" stackId="planned" fill="rgba(0,0,0,0)" />
              <Bar dataKey="plannedDuration" stackId="planned" name="Planned (Baseline)" fill="#64748b" radius={[10, 10, 10, 10]} />
              <Bar dataKey="actualOffset" stackId="actual" fill="rgba(0,0,0,0)" />
              <Bar dataKey="actualDuration" stackId="actual" name="Actual" fill="#0ea5e9" radius={[10, 10, 10, 10]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;