"use client";

import { CSSProperties, ReactNode } from "react";

const colors = {
  bg: "#0b0d10",
  panel: "#0e1013",
  border: "#1f2937",
  text: "#e6e8eb",
  sub: "#9aa4b2",
  primary: "#111827",
  success: "#22c55e",
  danger: "#ef4444"
};

export function Card({ children, style, className }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <div className={className} style={{ background: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16, ...style }}>{children}</div>
  );
}

export type BtnProps = {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  title?: string;
  disabled?: boolean;
  variant?: "muted" | "danger" | "ghost" | "solid";
  small?: boolean;
  style?: CSSProperties;
  className?: string;
};

export function Btn({ children, onClick, type = "button", title, disabled, variant = "muted", small, style, className }: BtnProps) {
  const base: CSSProperties = {
    background: variant === "solid" ? colors.success : colors.primary,
    border: `1px solid ${colors.border}`,
    color: variant === "solid" ? "#052e16" : variant === "danger" ? colors.danger : colors.text,
    padding: small ? "4px 8px" : "6px 10px",
    borderRadius: 8,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    whiteSpace: "nowrap",
    ...style
  };
  if (variant === "ghost") {
    base.background = "transparent";
  }
  return (
    <button type={type} onClick={disabled ? undefined : onClick} title={title} style={base} disabled={disabled} className={className}>
      {children}
    </button>
  );
}

export function Badge({ children, tone = "default" as "default" | "success" | "danger" }: { children: ReactNode; tone?: "default" | "success" | "danger" }) {
  const bg = tone === "success" ? "#052e16" : tone === "danger" ? "#3f1515" : "#111827";
  const fg = tone === "success" ? colors.success : tone === "danger" ? colors.danger : colors.sub;
  return <span style={{ fontSize: 12, padding: "2px 6px", borderRadius: 999, background: bg, color: fg, border: `1px solid ${colors.border}` }}>{children}</span>;
}

export function Label({ children }: { children: ReactNode }) {
  return <label style={{ alignSelf: "center", color: colors.sub }}>{children}</label>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { style, ...rest } = props;
  return <input {...rest} style={{ background: "#0a0c0f", border: `1px solid ${colors.border}`, color: colors.text, padding: "6px 8px", borderRadius: 8, ...style }} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { style, ...rest } = props;
  return <select {...rest} style={{ background: "#0a0c0f", border: `1px solid ${colors.border}`, color: colors.text, padding: "6px 8px", borderRadius: 8, ...style }} />;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{children}</h3>
      <div>{right}</div>
    </div>
  );
}

export function Sparkline({ points, width = 600, height = 80, showGuides = true, tickCount = 3 }: { points: number[]; width?: number; height?: number; showGuides?: boolean; tickCount?: number }) {
  if (!points || points.length === 0) return <div style={{ color: colors.sub }}>No data</div>;
  let min = Math.min(...points);
  let max = Math.max(...points);
  if (min === max) {
    // add small padding when flat
    min = Math.max(0, min - 1);
    max = max + 1;
  }
  const span = Math.max(1, max - min);
  const labelPad = showGuides ? 44 : 0;
  const innerWidth = Math.max(1, width - labelPad - 4);
  const stepX = innerWidth / Math.max(1, points.length - 1);
  const y = (v: number) => height - ((v - min) / span) * (height - 10) - 5;
  const x = (i: number) => labelPad + i * stepX;
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p)}`)
    .join(" ");

  // ticks
  const ticks: number[] = [];
  const n = Math.max(2, tickCount || 3);
  for (let i = 0; i < n; i += 1) {
    ticks.push(min + (span * i) / (n - 1));
  }

  return (
    <svg width={width} height={height} style={{ display: "block", width: "100%" }}>
      <rect x={0} y={0} width={width} height={height} fill="#0a0c0f" stroke={colors.border} />
      {showGuides && ticks.map((t, i) => {
        const yy = y(t);
        const label = `${Math.round(t)} ms`;
        return (
          <g key={i}>
            <line x1={labelPad} y1={yy} x2={width - 2} y2={yy} stroke="#1f2937" strokeDasharray="3 3" />
            <text x={labelPad - 6} y={yy + 3} fill={colors.sub} fontSize={10} textAnchor="end">{label}</text>
          </g>
        );
      })}
      <path d={d} fill="none" stroke={colors.success} strokeWidth={2} />
    </svg>
  );
}


