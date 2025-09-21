import { Link } from "react-router-dom";

export default function Placeholder({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mx-auto max-w-3xl rounded-lg border bg-card p-8 text-center">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-muted-foreground">
        {description ?? "This section will be built next. Tell me what specific fields and workflows you want and I'll generate them."}
      </p>
      <div className="mt-4 text-sm">
        <Link to="/" className="text-brand underline">Go back to Dashboard</Link>
      </div>
    </div>
  );
}
