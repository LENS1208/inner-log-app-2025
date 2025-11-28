import React, { useState, useEffect } from "react";
import type { JournalPayload } from "./types";
import { getDailyNote, saveDailyNote } from "../../lib/db.service";
import { showToast } from "../../lib/toast";
import { useDataset } from "../../lib/dataset.context";
import { DemoModeRestriction } from "../../components/common/DemoModeRestriction";

type DayJournalCardProps = {
  dateKey: string;
  onSave?: (payload: JournalPayload) => void;
};

export function DayJournalCard({ dateKey, onSave }: DayJournalCardProps) {
  const { useDatabase } = useDataset();

  const handleUploadClick = () => {
    const currentHash = window.location.hash;
    if (currentHash === '#/trades') {
      window.dispatchEvent(new CustomEvent("fx:openUpload"));
    } else {
      window.location.hash = '#/trades';
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("fx:openUpload"));
      }, 100);
    }
  };

  if (!useDatabase) {
    return <DemoModeRestriction featureName="日次ノート" onUploadClick={handleUploadClick} />;
  }
  const [good, setGood] = useState("");
  const [improve, setImprove] = useState("");
  const [nextPromise, setNextPromise] = useState("");
  const [free, setFree] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('DayJournalCard dateKey:', dateKey);
    let timeoutId: NodeJS.Timeout;

    (async () => {
      try {
        setLoading(true);
        const note = await getDailyNote(dateKey);
        console.log('Loaded daily note:', note);
        if (note) {
          setGood(note.good || "");
          setImprove(note.improve || "");
          setNextPromise(note.next_promise || "");
          setFree(note.free || "");
        }
      } catch (err) {
        console.error('Failed to load daily note:', err);
      } finally {
        setLoading(false);
      }
    })();

    // 3秒後に強制的にloadingを解除（タイムアウト対策）
    timeoutId = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [dateKey]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveDailyNote({
        date_key: dateKey,
        title: `${dateKey}の日次ノート`,
        good,
        improve,
        next_promise: nextPromise,
        free,
      });
      if (onSave) {
        onSave({ good, improve, nextPromise, free });
      }
      showToast('保存しました', 'success');
    } catch (err) {
      console.error('Failed to save daily note:', err);
      showToast('保存に失敗しました', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel-card">
      <div className="panel-header">
        <h2 className="panel-title">当日の推移</h2>
        <button className="save-btn" onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '保存'}
        </button>
      </div>

      <div className="journal-inputs">
        <label>
          <div className="input-label">うまくいった点</div>
          <textarea
            className="journal-textarea"
            value={good}
            onChange={(e) => setGood(e.target.value)}
            placeholder="例）エントリー前にしっかり水平線を引いて待てた。損切りラインも事前に決めていたので迷わず実行できた。"
          />
        </label>

        <label>
          <div className="input-label">改善点</div>
          <textarea
            className="journal-textarea"
            value={improve}
            onChange={(e) => setImprove(e.target.value)}
            placeholder="例）利確が早すぎた。もう少し引っ張れば目標価格に到達していた。感情で決済してしまった。"
          />
        </label>

        <label>
          <div className="input-label">自由メモ</div>
          <textarea
            className="journal-textarea"
            value={free}
            onChange={(e) => setFree(e.target.value)}
            placeholder="例）今日は集中力が高かった。朝のニュースで日銀の発言があったので、円高に動くと予想。次回も経済指標の前後は注意深く観察する。"
          />
        </label>
      </div>
    </div>
  );
}
