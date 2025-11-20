import React, { useEffect, useState } from "react";
import { useDataset } from "../lib/dataset.context";
import ReportsTimeAxis from "./reports/ReportsTimeAxis";
import ReportsMarket from "./reports/ReportsMarket";
import ReportsStrategy from "./reports/ReportsStrategy";
import ReportsRisk from "./reports/ReportsRisk";

type TabKey = "time" | "market" | "strategy" | "risk";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const hash = location.hash.replace(/^#\/reports\/?/, "") || "time";
    return ["time", "market", "strategy", "risk"].includes(hash) ? (hash as TabKey) : "time";
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = location.hash.replace(/^#\/reports\/?/, "") || "time";
      const tab: TabKey = ["time", "market", "strategy", "risk"].includes(hash) ? (hash as TabKey) : "time";
      setActiveTab(tab);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "time", label: "時間軸" },
    { key: "market", label: "通貨ペア" },
    { key: "risk", label: "リスク管理" },
    { key: "strategy", label: "トレード戦略" },
  ];

  return (
    <div style={{ width: "100%" }}>
      {/* タブナビゲーション */}
      <nav
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid var(--line)",
          marginBottom: 20,
          overflowX: "auto",
          background: "var(--surface)",
        }}
      >
        {tabs.map((tab) => (
          <a
            key={tab.key}
            href={`#/reports/${tab.key}`}
            onClick={(e) => {
              e.preventDefault();
              location.hash = `/reports/${tab.key}`;
            }}
            style={{
              padding: "12px 20px",
              textDecoration: "none",
              color: activeTab === tab.key ? "var(--accent)" : "var(--ink)",
              borderBottom: activeTab === tab.key ? "2px solid var(--accent)" : "2px solid transparent",
              fontWeight: activeTab === tab.key ? 600 : 400,
              whiteSpace: "nowrap",
              transition: "all 0.2s",
              background: activeTab === tab.key ? "var(--chip)" : "transparent",
            }}
          >
            {tab.label}
          </a>
        ))}
      </nav>

      {/* コンテンツ */}
      <div>
        {activeTab === "time" && <ReportsTimeAxis />}
        {activeTab === "market" && <ReportsMarket />}
        {activeTab === "strategy" && <ReportsStrategy />}
        {activeTab === "risk" && <ReportsRisk />}
      </div>
    </div>
  );
}
