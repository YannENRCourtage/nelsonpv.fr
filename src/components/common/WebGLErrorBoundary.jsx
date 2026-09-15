import React from 'react';
import { AlertTriangle, RefreshCw, Layers, Image as ImageIcon } from 'lucide-react';

/**
 * WebGLErrorBoundary
 * Isole les composants 3D (Three.js, React Three Fiber, Canvas) pour empêcher
 * un crash global de l'application en cas d'échec d'initialisation WebGL
 * ("Error creating WebGL context with your selected attributes").
 */
export default class WebGLErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[WebGLErrorBoundary] Crash WebGL intercepté:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const { fallbackImage, fallbackTitle, onContinueWithout3D, height = 280 } = this.props;

      return (
        <div
          className="relative rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/70 p-4 flex flex-col items-center justify-center text-center overflow-hidden"
          style={{ minHeight: height }}
        >
          {fallbackImage ? (
            <div className="relative w-full max-w-xs mb-3 rounded-xl overflow-hidden border border-amber-200 shadow-sm aspect-video bg-white">
              <img src={fallbackImage} alt="Aperçu 2D de secours" className="w-full h-full object-cover" />
              <span className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                Aperçu 2D
              </span>
            </div>
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-2.5 shadow-2xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
          )}

          <h4 className="text-xs font-black text-amber-950 mb-1">
            {fallbackTitle || "Accélération 3D indisponible sur ce navigateur"}
          </h4>
          <p className="text-[11px] text-amber-800/90 max-w-sm mb-3 leading-relaxed">
            Le contexte WebGL 3D n'a pas pu être initialisé (accélération matérielle limitée ou limite de contextes atteinte). Vous pouvez continuer normalement votre dossier.
          </p>

          <div className="flex items-center gap-2 flex-wrap justify-center">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold transition-all shadow-2xs active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Réessayer le rendu 3D</span>
            </button>

            {onContinueWithout3D && (
              <button
                type="button"
                onClick={onContinueWithout3D}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Continuer en mode 2D</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
