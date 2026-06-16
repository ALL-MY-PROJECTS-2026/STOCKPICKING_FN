import { useState, useEffect, useRef, useCallback } from "react";
import { apiGet, apiSend } from "../api.js";
import { SectionHd, Badge } from "../components/ui.jsx";

const STAGES = ["대기", "실행 중"];

function authStr() {
  const pw = localStorage.getItem("fn-pass");
  return pw ? "admin:" + pw : null;
}

function RunStatus({ status }) {
  if (!status) return null;
  const running = status.status === "running";
  const prog = Math.round((status.progress ?? 0) * (status.progress > 1 ? 1 : 100));
  return (
    <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Badge kind={running ? "ok" : "mut"} dot>{running ? "실행 중" : "대기"}</Badge>
        <b style={{ fontSize: ".9rem" }}>{status.stage || (running ? "분석 진행" : "유휴")}</b>
        {status.duration_sec != null && <span className="desc" style={{ marginLeft: "auto", color: "var(--muted)", fontSize: ".75rem" }}>{Math.round(status.duration_sec)}초</span>}
      </div>
      {running && (
        <div className="heat" style={{ height: 7 }}>
          <i style={{ width: Math.max(4, Math.min(100, prog)) + "%" }} />
        </div>
      )}
      {status.error && <div className="err-box">{status.error}</div>}
    </div>
  );
}

export default function SchedulePage() {
  const [status, setStatus] = useState(null);
  const [log, setLog] = useState("");
  const [sched, setSched] = useState(null);
  const [needAuth, setNeedAuth] = useState(!authStr());
  const [pw, setPw] = useState("");
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const logRef = useRef(null);

  const loadPublic = useCallback(async () => {
    try { setStatus(await apiGet("/api/run-status")); } catch { /* */ }
    try {
      const d = await apiGet("/api/run-log");
      setLog(d.tail || d.content || "(로그 없음)");
    } catch { setLog("(로그 로드 실패)"); }
  }, []);

  const loadSched = useCallback(async () => {
    const a = authStr(); if (!a) return;
    try { setSched(await apiGet("/api/schedule", { auth: a })); setNeedAuth(false); }
    catch { setNeedAuth(true); }
  }, []);

  useEffect(() => {
    loadPublic(); loadSched();
    const t = setInterval(loadPublic, 5000);
    return () => clearInterval(t);
  }, [loadPublic, loadSched]);

  const flash = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2600); };

  const unlock = async () => {
    localStorage.setItem("fn-pass", pw);
    try { setSched(await apiGet("/api/schedule", { auth: "admin:" + pw })); setNeedAuth(false); flash("인증 성공"); }
    catch { localStorage.removeItem("fn-pass"); flash("인증 실패 — 비밀번호 확인", false); }
  };

  const runNow = async () => {
    const a = authStr(); if (!a) { setNeedAuth(true); return; }
    setBusy(true);
    const r = await apiSend("/api/run-now", { auth: a });
    setBusy(false);
    if (r.ok) { flash("분석 실행 시작"); setTimeout(loadPublic, 800); }
    else flash("실행 실패 (" + r.status + ")", false);
  };

  const toggleSched = async () => {
    const a = authStr(); if (!a || !sched) { setNeedAuth(true); return; }
    const r = await apiSend("/api/schedule", { auth: a, body: { ...sched, enabled: !sched.enabled } });
    if (r.ok) { setSched(r.data || { ...sched, enabled: !sched.enabled }); flash(sched.enabled ? "자동 실행 OFF" : "자동 실행 ON"); }
    else flash("변경 실패", false);
  };

  return (
    <>
      <SectionHd icon="clock-play" title="자동 분석 스케쥴러"
        desc="예약 실행 · 실시간 수행 로그"
        right={<button className="btn primary" disabled={busy} onClick={runNow}><i className="ti ti-player-play" />{busy ? "실행 중…" : "지금 실행"}</button>} />

      <div className="grid" style={{ gridTemplateColumns: "1.2fr 1fr", gap: 14, alignItems: "start" }}>
        <RunStatus status={status} />

        <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {needAuth ? (
            <>
              <div className="k" style={{ color: "var(--muted)", fontSize: ".8rem" }}><i className="ti ti-lock" /> 스케쥴 설정은 인증이 필요합니다</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && unlock()} placeholder="대시보드 비밀번호"
                  style={{ flex: 1, padding: "9px 12px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)",
                    background: "var(--surface-2)", color: "var(--text)", fontFamily: "inherit" }} />
                <button className="btn primary" onClick={unlock}>인증</button>
              </div>
            </>
          ) : sched ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Badge kind={sched.enabled ? "ok" : "mut"} dot>{sched.enabled ? "자동 실행 ON" : "자동 실행 OFF"}</Badge>
                <span className="count-chip">{sched.mode || "interval"}</span>
                <button className="btn" style={{ marginLeft: "auto" }} onClick={toggleSched}>
                  {sched.enabled ? "끄기" : "켜기"}
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: ".8rem" }}>
                <Row k="마지막 실행" v={sched.last_run || "-"} />
                <Row k="다음 실행" v={sched.next_run || "-"} hi />
                <Row k="상태" v={sched.status || "-"} />
              </div>
            </>
          ) : <div className="sk" style={{ height: 80 }} />}
        </div>
      </div>

      <SectionHd icon="terminal-2" title="수행 로그" desc="5초 자동 갱신" />
      <div className="console" ref={logRef}>{log}</div>

      <MysqlPanel flash={flash} />

      {toast && <div className="toast-wrap"><div className={"toast " + (toast.ok ? "ok" : "err")}>{toast.msg}</div></div>}
    </>
  );
}

function MysqlPanel({ flash }) {
  const [st, setSt] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { setSt(await apiGet("/api/mysql/status")); } catch { /* */ } }, []);
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);

  const collect = async () => {
    let pass = localStorage.getItem("fn-pass");
    if (!pass) { pass = window.prompt("대시보드 비밀번호"); if (!pass) return; localStorage.setItem("fn-pass", pass); }
    setBusy(true);
    const r = await apiSend("/api/mysql/collect", { auth: "admin:" + pass });
    setBusy(false);
    if (r.ok) { flash("전체 수집 시작 — 잠시 후 갱신"); setTimeout(load, 4000); }
    else { localStorage.removeItem("fn-pass"); flash("실패 — 비밀번호 확인", false); }
  };

  const lc = st?.last_collect;
  return (
    <>
      <SectionHd icon="database" title="MySQL 전체 종목 적재"
        desc="매주 일요일 새벽 코스피·코스닥 전체 수집"
        right={<button className="btn primary" disabled={busy} onClick={collect}>
          <i className="ti ti-database-import" />{busy ? "수집 중…" : "지금 수집"}</button>} />
      <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Badge kind={st?.connected ? "ok" : "mut"} dot>{st?.connected ? "연결됨" : "미연결"}</Badge>
          <span className="count-chip">{st?.db || "testdb"}</span>
          {st?.running && <Badge kind="warn" dot>수집 중</Badge>}
        </div>
        {st?.latest_snapshot ? (
          <div className="grid grid-stats">
            <div className="card stat"><div className="k"><i className="ti ti-list" />적재 종목</div><div className="v num">{st.latest_snapshot.count.toLocaleString()}</div></div>
            <div className="card stat"><div className="k"><i className="ti ti-building" />코스피</div><div className="v num">{lc?.kospi?.toLocaleString() ?? "-"}</div></div>
            <div className="card stat"><div className="k"><i className="ti ti-building-store" />코스닥</div><div className="v num">{lc?.kosdaq?.toLocaleString() ?? "-"}</div></div>
            <div className="card stat"><div className="k"><i className="ti ti-clock" />스냅샷</div><div className="v num" style={{ fontSize: "1rem" }}>{st.latest_snapshot.date}</div></div>
          </div>
        ) : st?.connected ? <div className="empty" style={{ padding: 20 }}>아직 수집 이력이 없습니다 — "지금 수집"</div>
          : <div className="err-box">MySQL 미연결: {st?.error || "확인 필요"}</div>}
        {lc && <div style={{ fontSize: ".74rem", color: "var(--muted)" }}>최근 수집: {lc.finished_at} · {lc.status}{lc.error ? " · " + lc.error : ""}</div>}
      </div>
    </>
  );
}

function Row({ k, v, hi }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "var(--muted)" }}>{k}</span>
      <b className="num" style={hi ? { color: "var(--primary-2)" } : null}>{v}</b>
    </div>
  );
}
