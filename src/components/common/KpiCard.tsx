import React from "react";
import { HelpIcon } from "./HelpIcon";

type KpiCardProps = {
  label: string;
  tooltip: string;
  value: React.ReactNode;
  subtext?: React.ReactNode;
  className?: string;
};

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  tooltip,
  value,
  subtext,
  className = "",
}) => {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 ${className}`}
    >
      <div className="flex items-center gap-1">
        <p className="text-[13px] font-medium leading-snug text-slate-600">
          {label}
        </p>
        <HelpIcon text={tooltip} />
      </div>
      <div className="mt-1 text-xl font-semibold">
        {value}
      </div>
      {subtext && (
        <p className="mt-1 text-[12px] text-slate-500">
          {subtext}
        </p>
      )}
    </div>
  );
};
