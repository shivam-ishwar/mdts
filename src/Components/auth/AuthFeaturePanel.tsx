import { motion } from "framer-motion";
import {
    ArrowUpOutlined,
    ApartmentOutlined,
    FundProjectionScreenOutlined,
    SafetyCertificateOutlined,
    DeploymentUnitOutlined,
} from "@ant-design/icons";

const highlights = [
    { label: "Programs under control", value: "48+", detail: "active mine development workstreams" },
    { label: "Schedule confidence", value: "92%", detail: "baseline alignment across leadership dashboards" },
    { label: "Decision latency", value: "< 4h", detail: "from field signal to reviewed intervention" },
];

const capabilities = [
    { icon: DeploymentUnitOutlined, title: "Dependency intelligence", copy: "Understand the next blockage before it impacts the critical path." },
    { icon: FundProjectionScreenOutlined, title: "Cost and progress signal", copy: "Unify status updates, CAPEX drift, and variance in one operating view." },
    { icon: SafetyCertificateOutlined, title: "Governance by default", copy: "Keep every approval, risk note, and execution change audit-ready." },
];

export function AuthFeaturePanel() {
    return (
        <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(160deg,rgba(9,22,19,0.96),rgba(7,17,15,0.98))] p-6 shadow-auth-glow sm:p-8 lg:min-h-[720px] lg:p-10">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-[-8%] top-[-12%] h-52 w-52 rounded-full bg-emerald-400/14 blur-3xl" />
                <div className="absolute bottom-[-10%] right-[-4%] h-56 w-56 rounded-full bg-cyan-400/12 blur-3xl" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:88px_88px] opacity-30" />
            </div>

            <div className="relative z-10 flex h-full flex-col justify-between gap-8">
                <div className="space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200"
                    >
                        Enterprise delivery cockpit
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 22 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                        className="space-y-4"
                    >
                        <h1 className="max-w-xl font-display text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
                            Run mine development with the clarity of a premium operating system.
                        </h1>
                        <p className="max-w-xl text-base leading-7 text-slate-300 sm:text-[17px]">
                            MineSense brings schedule, execution, compliance, and commercial signal into one polished command layer for leadership and field teams.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 28 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.65, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
                        className="grid gap-4 sm:grid-cols-3"
                    >
                        {highlights.map((item) => (
                            <div
                                key={item.label}
                                className="rounded-3xl border border-white/10 bg-white/6 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md"
                            >
                                <div className="text-2xl font-semibold tracking-[-0.04em] text-white">{item.value}</div>
                                <div className="mt-2 text-sm font-medium text-slate-200">{item.label}</div>
                                <div className="mt-1 text-sm leading-6 text-slate-400">{item.detail}</div>
                            </div>
                        ))}
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]"
                >
                    <div className="rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur-md">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200/80">Operational pulse</p>
                                <p className="mt-2 text-lg font-semibold text-white">One view for portfolio velocity</p>
                            </div>
                            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-200">
                                <ApartmentOutlined className="text-lg" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            {capabilities.map(({ icon: Icon, title, copy }) => (
                                <div key={title} className="flex gap-4 rounded-2xl border border-white/8 bg-black/10 p-4">
                                    <div className="mt-1 rounded-2xl border border-white/8 bg-white/8 p-2 text-emerald-200">
                                        <Icon />
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">{title}</p>
                                        <p className="mt-1 text-sm leading-6 text-slate-400">{copy}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-[28px] border border-emerald-400/18 bg-[linear-gradient(180deg,rgba(16,185,129,0.12),rgba(255,255,255,0.04))] p-5 backdrop-blur-md">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200/80">Trusted outcomes</p>
                                <p className="mt-2 text-lg font-semibold text-white">Built for fast executive review</p>
                            </div>
                            <ArrowUpOutlined className="text-base text-emerald-200" />
                        </div>

                        <div className="mt-6 rounded-[24px] border border-white/10 bg-slate-950/35 p-4">
                            <div className="flex items-center justify-between border-b border-white/8 pb-4">
                                <div>
                                    <p className="text-sm font-medium text-slate-300">Weekly performance brief</p>
                                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">portfolio summary</p>
                                </div>
                                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/12 px-3 py-1 text-xs font-semibold text-emerald-200">
                                    Stable
                                </span>
                            </div>

                            <div className="space-y-4 pt-4">
                                <div className="flex items-end justify-between gap-4">
                                    <div>
                                        <p className="text-3xl font-semibold tracking-[-0.04em] text-white">14 sites</p>
                                        <p className="text-sm text-slate-400">cross-functional view with traceable status</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-slate-400">Escalations reduced</p>
                                        <p className="text-xl font-semibold text-emerald-200">31%</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.22em] text-slate-500">
                                            <span>Execution visibility</span>
                                            <span>94%</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-white/8">
                                            <div className="h-full w-[94%] rounded-full bg-[linear-gradient(90deg,#34d399,#22d3ee)]" />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.22em] text-slate-500">
                                            <span>Governance readiness</span>
                                            <span>89%</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-white/8">
                                            <div className="h-full w-[89%] rounded-full bg-[linear-gradient(90deg,#10b981,#34d399)]" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
