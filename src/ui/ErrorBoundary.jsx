import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    // Vous pouvez logger si besoin (Sentry, console, etc.)
    // console.error("UI crash:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 16,
          margin: 16,
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          background: "#fff7ed",
          color: "#9a3412",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
        }}>
          <h2 style={{marginTop:0}}>Oups… une erreur est survenue 💥</h2>
          <p style={{whiteSpace:"pre-wrap"}}>
            {String(this.state.error || "Erreur inconnue")}
          </p>
          <p style={{opacity:.7, fontSize:14}}>
            Essayez de recharger la page (Ctrl+F5).  
            Si cela persiste, vérifiez la Console (F12) pour le détail.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}