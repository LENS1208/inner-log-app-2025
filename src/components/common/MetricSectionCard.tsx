import React from "react";

type MetricSectionCardProps = {
  title: React.ReactNode;
  children: React.ReactNode;
};

export const MetricSectionCard: React.FC<MetricSectionCardProps> = ({
  title,
  children,
}) => {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 px-[18px] py-[14px]">
      <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-slate-700">
        {title}
      </h3>
      <div className="mt-2">
        {children}
      </div>
    </section>
  );
};
