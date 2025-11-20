import React, { useEffect, useState } from "react";
import AppShell from "./shells/AppShell";
import { supabase } from "./lib/supabase";

import DashboardKPI from "./widgets/DashboardKPI";
import ForecastHybrid from "./widgets/ForecastHybrid";
import EquityCurvePage from "./widgets/EquityCurvePage";
import TradeListPage from "./widgets/TradeListPage";
import TradeDiaryPage from "./widgets/TradeDiaryPage";
import DiaryIndexPage from "./widgets/DiaryIndexPage";
import MonthlyCalendar from "./widgets/MonthlyCalendar";
import ReportsPage from "./widgets/ReportsPage";
import CalendarDayPage from "./widgets/CalendarDayPage";
import DailyNotePage from "./widgets/DailyNotePage";
import JournalNotesPage from "./pages/JournalNotesPage";
import AiProposalPage from "./pages/AiProposalPage";
import AiEvaluationPage from "./pages/AiEvaluationPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import AiProposalListPage from "./widgets/AiProposalListPage";
import AiProposalContainer from "./widgets/AiProposalContainer";

type NewRoute = "/dashboard" | "/calendar" | `/calendar/day/${string}` | "/trades" | "/reports" | `/reports/${string}` | "/notebook" | `/notebook/${string}` | "/settings" | "/journal-v0" | "/ai-proposal" | `/ai-proposal/${string}` | "/ai-evaluation" | "/login" | "/signup";

function parseHashToNewRoute(): NewRoute {
  const h = location.hash.replace(/^#/, "");

  // 旧→新の読み替え（互換） 
  if (h.startsWith("/kpi")) return "/dashboard";
  if (h.startsWith("/equity")) return "/dashboard";
  if (h === "/") return "/dashboard";
  if (h.startsWith("/trade-diary")) {
    const id = h.split("/")[2];
    return id ? `/notebook/${id}` : "/notebook";
  }
  if (h.startsWith("/new-diary")) return "/notebook";
  if (h === "/journal" || h.startsWith("/journal/")) {
    const id = h.split("/")[2];
    return id ? `/notebook/${id}` : "/notebook";
  }

  // 新ルート群
  if (h.startsWith("/dashboard")) return "/dashboard";
  if (h.startsWith("/calendar/day/")) return h as NewRoute;
  if (h.startsWith("/calendar")) return "/calendar";
  if (h.startsWith("/trades")) return "/trades";
  if (h.startsWith("/reports")) return h as NewRoute;
  if (h.startsWith("/forecast")) return "/ai-proposal";
  if (h === "/notebook" || h.startsWith("/notebook/")) return h as NewRoute;
  if (h.startsWith("/settings")) return "/settings";
  if (h === "/journal-v0") return "/journal-v0";
  if (h.startsWith("/ai-proposal/")) return h as NewRoute;
  if (h === "/ai-proposal") return "/ai-proposal";
  if (h.startsWith("/ai-evaluation")) return "/ai-evaluation";
  if (h === "/login") return "/login";
  if (h === "/signup") return "/signup";

  return "/dashboard";
}

export default function App() {
  const [route, setRoute] = useState<NewRoute>(parseHashToNewRoute());
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  console.log("🔄 App render - route:", route);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onHash = () => {
      console.log("🔄 hashchange event");
      setRoute(parseHashToNewRoute());
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  let Page: JSX.Element;
  if (route === "/dashboard") Page = <EquityCurvePage />;
  else if (route === "/calendar") Page = <MonthlyCalendar />;
  else if (route.startsWith("/calendar/day/")) {
    const dateKey = route.split("/")[3] ?? "";
    Page = <DailyNotePage kpi={{ dateJst: dateKey } as any} />;
  }
  else if (route === "/trades") Page = <TradeListPage />;
  else if (route.startsWith("/reports")) Page = <ReportsPage />;
  else if (route === "/notebook") Page = <JournalNotesPage />;
  else if (route.startsWith("/notebook/")) {
    const entryId = route.split("/")[2] ?? "";
    Page = <TradeDiaryPage entryId={entryId as any} />;
  }
  else if (route === "/settings") Page = <SettingsPage />;
  else if (route === "/ai-proposal") {
    Page = (
      <AiProposalListPage
        onSelectProposal={(id) => {
          location.hash = `/ai-proposal/${id}`;
        }}
      />
    );
  }
  else if (route.startsWith("/ai-proposal/")) {
    const proposalId = route.split("/")[2];
    Page = (
      <AiProposalContainer
        proposalId={proposalId}
        onBack={() => {
          location.hash = '/ai-proposal';
        }}
        onNavigateToTradeNote={(ideaId) => {
          console.log('Navigate to trade note with idea:', ideaId);
        }}
      />
    );
  }
  else if (route === "/ai-evaluation") {
    Page = <AiEvaluationPage />;
  }
  else {
    Page = <EquityCurvePage />;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ fontSize: 18, color: 'var(--muted)' }}>読み込み中...</div>
      </div>
    );
  }

  if (!user && route === "/login") {
    return <LoginPage />;
  }

  if (!user && route === "/signup") {
    return <SignupPage />;
  }

  if (!user) {
    return <AppShell><EquityCurvePage /></AppShell>;
  }

  return <AppShell>{Page}</AppShell>;
}
