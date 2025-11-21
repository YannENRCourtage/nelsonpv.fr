import React from "react";

export default class DevErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    // Log console pour diagnostic
    console.error("💥 UI crash:", error, info);
    this.setState({ info });
  }
  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;
    return (
      <div style={{ padding: 24, fontFamily: "system-ui" }}>
        <h2>Une erreur est survenue</h2>
        <p style={{ color: "#b91c1c" }}>{String(error?.message || error)}</p>
        {info?.componentStack && (
          <pre style={{ whiteSpace: "pre-wrap", background: "#f8fafc", padding: 12, borderRadius: 8 }}>
            {info.componentStack}
          </pre>
        )}
        <p style={{ marginTop: 12, color: "#475569" }}>
          Ouvre la Console du navigateur (F12) pour plus de détails si besoin.
        </p>
      </div>
    );
  }
}