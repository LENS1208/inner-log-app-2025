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
  console.log("📍 Parsing hash:", h);

  // 認証ページを最初にチェック
  if (h === "/login") {
    console.log("✅ Routing to /login");
    return "/login";
  }
  if (h === "/signup") {
    console.log("✅ Routing to /signup");
    return "/signup";
  }

  // 旧→新の読み替え（互換）
  if (h.startsWith("/kpi")) return "/dashboard";
  if (h.startsWith("/equity")) return "/dashboard";
  if (h === "/" || h === "") return "/dashboard";
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

  return "/dashboard";
}

export default function App() {
  const [route, setRoute] = useState<NewRoute>(parseHashToNewRoute());
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  console.log("🔄 App render - route:", route);

  useEffect(() => {
    (async () => {
      try {
        // 破損したトークンをクリアする
        const authKeys = Object.keys(localStorage).filter(key =>
          key.includes('supabase') || key.includes('auth')
        );

        // 古いセッションをチェック
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.warn('⚠️ Session error detected, clearing all auth data:', error);
          // 破損したトークンをクリア
          authKeys.forEach(key => localStorage.removeItem(key));
          await supabase.auth.signOut();
          sessionStorage.clear();
          setUser(null);
        } else if (session && !session.user) {
          console.warn('⚠️ Invalid session (no user), clearing all auth data');
          authKeys.forEach(key => localStorage.removeItem(key));
          await supabase.auth.signOut();
          sessionStorage.clear();
          setUser(null);
        } else {
          setUser(session?.user ?? null);
        }
      } catch (err) {
        console.error('❌ Error checking session:', err);
        // エラーの場合も認証データをクリア
        const authKeys = Object.keys(localStorage).filter(key =>
          key.includes('supabase') || key.includes('auth')
        );
        authKeys.forEach(key => localStorage.removeItem(key));
        await supabase.auth.signOut();
        sessionStorage.clear();
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state changed:', event);

      const newUser = session?.user ?? null;

      // SIGNED_OUTイベントの場合は即座にnullに設定してログインページへ
      if (event === 'SIGNED_OUT') {
        console.log('🚪 User signed out, redirecting to login');
        setUser(null);
        if (location.hash !== '#/login' && location.hash !== '#/signup') {
          window.location.href = '#/login';
        }
        return;
      }

      setUser(prevUser => {
        // ユーザーIDが変わった場合（ログイン/ログアウト）のみ更新
        if (prevUser?.id !== newUser?.id) {
          console.log('👤 User changed, updating state');
          return newUser;
        }

        // USER_UPDATEDイベントの場合は新しいユーザーオブジェクトを使用
        // user_metadataの更新を反映するため
        if (event === 'USER_UPDATED' && newUser) {
          console.log('📝 User metadata updated, using new user object');
          return newUser;
        }

        // それ以外のイベント（INITIAL_SESSION等）では既存の状態を維持
        console.log('ℹ️ Event', event, 'ignored, keeping existing user state');
        return prevUser;
      });
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

  console.log("🎯 Current route:", route, "Hash:", location.hash);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ fontSize: 18, color: 'var(--muted)' }}>読み込み中...</div>
      </div>
    );
  }

  // 認証ページは AppShell なしで表示
  if (route === "/login") {
    console.log("✅ Rendering LoginPage");
    return <LoginPage />;
  }

  if (route === "/signup") {
    console.log("✅ Rendering SignupPage");
    return <SignupPage />;
  }

  // その他のページは AppShell で表示
  let Page: JSX.Element;
  if (route === "/dashboard") {
    console.log("✅ Rendering DashboardPage (EquityCurvePage)");
    Page = <EquityCurvePage />;
  }
  else if (route === "/calendar") {
    console.log("✅ Rendering MonthlyCalendar");
    Page = <MonthlyCalendar />;
  }
  else if (route.startsWith("/calendar/day/")) {
    const dateKey = route.split("/")[3] ?? "";
    console.log("✅ Rendering DailyNotePage for date:", dateKey);
    Page = <DailyNotePage kpi={{ dateJst: dateKey } as any} />;
  }
  else if (route === "/trades") {
    console.log("✅ Rendering TradeListPage");
    Page = <TradeListPage />;
  }
  else if (route.startsWith("/reports")) {
    console.log("✅ Rendering ReportsPage");
    Page = <ReportsPage />;
  }
  else if (route === "/notebook") {
    console.log("✅ Rendering JournalNotesPage");
    Page = <JournalNotesPage />;
  }
  else if (route.startsWith("/notebook/")) {
    const entryId = route.split("/")[2] ?? "";
    Page = <TradeDiaryPage entryId={entryId as any} />;
  }
  else if (route === "/settings") {
    console.log("✅ Rendering SettingsPage");
    Page = <SettingsPage />;
  }
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

  if (!user) {
    console.log("⚠️ No user logged in, showing demo mode with selected page");
  }

  return <AppShell>{Page}</AppShell>;
}
