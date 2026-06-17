import { Component } from "react";

/** 페이지 렌더 오류를 잡아 흰 화면 대신 안내를 표시. 라우트별 key 로 재마운트되어 이동 시 자동 복구. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err) {
    return { err };
  }
  componentDidCatch(err) {
    // 콘솔에만 기록(외부 전송 없음 — 보안)
    if (typeof console !== "undefined") console.error("FN render error:", err);
  }
  render() {
    if (this.state.err) {
      return (
        <div className="err-box" style={{ margin: 20 }}>
          <i className="ti ti-alert-triangle" /> 이 화면을 표시하는 중 오류가 발생했습니다.
          <button className="btn" style={{ marginLeft: 12 }} onClick={() => location.reload()}>새로고침</button>
        </div>
      );
    }
    return this.props.children;
  }
}
