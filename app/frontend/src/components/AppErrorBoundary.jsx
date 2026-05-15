import React from "react";
import { Button } from "@/components/ui/button";

export class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  resetApp = () => {
    localStorage.removeItem("qp_token");
    localStorage.removeItem("qp_user");
    window.location.href = "/";
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-white grid place-items-center p-6">
        <div className="max-w-md border border-zinc-200 rounded-sm p-8 text-center">
          <div className="label-mono">Application error</div>
          <h1 className="font-heading text-2xl font-semibold mt-2">The app could not render</h1>
          <p className="text-sm text-zinc-600 mt-3">
            The local session may be stale. Resetting will clear the saved login and reload the app.
          </p>
          <Button onClick={this.resetApp} className="mt-6 rounded-sm bg-zinc-900 hover:bg-zinc-800">
            Reset and reload
          </Button>
        </div>
      </div>
    );
  }
}
