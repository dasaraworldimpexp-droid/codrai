import { Component } from "react";
import CodraiBrandMark from "./CodraiBrandMark.jsx";

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("CODRAI runtime UI boundary captured an error", { error, info });
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="codrai-os-bg grid min-h-screen place-items-center p-6 text-[var(--theme-text)]">
        <section className="glass-card max-w-xl rounded-lg p-6 text-center">
          <div className="flex justify-center">
            <CodraiBrandMark to={null} />
          </div>
          <p className="mt-8 text-sm font-black uppercase tracking-[0.18em] text-codrai-cyan">Runtime UI Recovery</p>
          <h1 className="mt-3 text-3xl font-black">CODRAI interface recovered safely.</h1>
          <p className="mt-4 text-sm leading-6 text-[var(--theme-text-muted)]">
            A frontend rendering error was isolated before it could destabilize the operating system shell.
          </p>
          <button className="codrai-primary-button mt-6 inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-black" type="button" onClick={() => window.location.reload()}>
            Reload interface
          </button>
        </section>
      </main>
    );
  }
}
