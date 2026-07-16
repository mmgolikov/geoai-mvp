"use client";
import { useState } from "react";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function records(value: unknown) {
  return Array.isArray(value) ? value.map(record).filter((item): item is JsonRecord => Boolean(item)) : [];
}

function display(value: unknown) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "—";
}

export function AdminPanel() {
  const [organizationId, setOrganizationId] = useState("");
  const [snapshot, setSnapshot] = useState<JsonRecord | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [acceptPath, setAcceptPath] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [membershipScope, setMembershipScope] = useState<"organization" | "project">("organization");

  async function loadSnapshot(target = organizationId) {
    if (!target.trim()) {
      setMessage("Enter an organization UUID.");
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin?organizationId=${encodeURIComponent(target.trim())}`, {
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" }
      });
      const result = await response.json() as { ok?: unknown; status?: unknown; data?: unknown };
      if (!response.ok || result.ok !== true) {
        setSnapshot(null);
        setMessage("The organization snapshot is unavailable or this account is not authorized.");
        return;
      }
      setSnapshot(record(result.data));
      setMessage("Initial bounded snapshot loaded. Each collection is capped at 25 records.");
    } catch {
      setMessage("Admin API is temporarily unavailable.");
    } finally {
      setPending(false);
    }
  }

  async function runAction(action: string, payload: JsonRecord) {
    setPending(true);
    setMessage(null);
    setAcceptPath(null);
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action, ...payload })
      });
      const result = await response.json() as { ok?: unknown; status?: unknown; data?: unknown; acceptPath?: unknown };
      if (!response.ok || result.ok !== true) {
        setMessage("The action was denied, invalid or conflicted with a newer row version.");
        return null;
      }
      if (typeof result.acceptPath === "string") setAcceptPath(result.acceptPath);
      setMessage(`${action.replace(/_/g, " ")} completed.`);
      if (organizationId) await loadSnapshot(organizationId);
      return record(result.data);
    } catch {
      setMessage("Admin action is temporarily unavailable.");
      return null;
    } finally {
      setPending(false);
    }
  }

  async function createOrganization(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await runAction("create_organization", {
      organizationName: form.get("organizationName"),
      organizationSlug: form.get("organizationSlug")
    });
    if (typeof result?.id === "string") {
      setOrganizationId(result.id);
      await loadSnapshot(result.id);
    }
  }

  const counts = record(snapshot?.counts);
  const clients = records(snapshot?.clients);
  const projects = records(snapshot?.projects);
  const members = records(snapshot?.members);
  const invitations = records(snapshot?.invitations);
  const audit = records(snapshot?.audit);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Organization administration</p>
          <h1 className="mt-3 text-3xl font-semibold text-ink">Organization Admin workspace</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            All writes use the authenticated 14-RPC API allowlist, optimistic row versions and append-only audit.
            This candidate UI is not active in Production.
          </p>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            aria-label="Organization UUID"
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
            placeholder="Organization UUID"
            className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand"
          />
          <button type="button" disabled={pending} onClick={() => void loadSnapshot()} className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-5 text-sm font-semibold text-white transition hover:bg-[#113f50] disabled:opacity-60">
            Load initial snapshot
          </button>
        </div>

        {message ? <p aria-live="polite" className="mt-4 rounded-md bg-surface px-3 py-2 text-sm leading-6 text-muted">{message}</p> : null}
        {acceptPath ? (
          <div className="mt-4 rounded-md border border-[#d8b66a] bg-[#fff9e9] p-4">
            <p className="text-sm font-semibold text-ink">One-time acceptance path</p>
            <code className="mt-2 block break-all text-xs text-muted">{acceptPath}</code>
            <p className="mt-2 text-xs leading-5 text-muted">Copy it now. The raw token is not stored and will not be returned by later snapshots.</p>
          </div>
        ) : null}

        <div className="mt-8 grid gap-5 xl:grid-cols-2">
          <form onSubmit={createOrganization} className="grid gap-3 rounded-lg border border-line p-4">
            <h2 className="text-lg font-semibold text-ink">Create organization</h2>
            <input aria-label="Organization name" name="organizationName" required placeholder="Organization name" className="h-10 rounded-md border border-line px-3 text-sm" />
            <input aria-label="Organization slug" name="organizationSlug" required placeholder="organization-slug" pattern="[a-z0-9][a-z0-9-]{1,62}[a-z0-9]" className="h-10 rounded-md border border-line px-3 text-sm" />
            <button disabled={pending} className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60">Create</button>
          </form>

          <form onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void runAction("create_client", {
              organizationId,
              clientKey: form.get("clientKey"),
              displayName: form.get("displayName"),
              legalName: form.get("legalName")
            });
          }} className="grid gap-3 rounded-lg border border-line p-4">
            <h2 className="text-lg font-semibold text-ink">Create client</h2>
            <input aria-label="Client key" name="clientKey" required placeholder="client-key" className="h-10 rounded-md border border-line px-3 text-sm" />
            <input aria-label="Client display name" name="displayName" required placeholder="Display name" className="h-10 rounded-md border border-line px-3 text-sm" />
            <input aria-label="Client legal name" name="legalName" placeholder="Legal name (optional)" className="h-10 rounded-md border border-line px-3 text-sm" />
            <button disabled={pending || !organizationId} className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60">Create</button>
          </form>

          <form onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void runAction("create_project", {
              organizationId,
              clientId: form.get("clientId"),
              projectKey: form.get("projectKey"),
              name: form.get("projectName"),
              description: form.get("description")
            });
          }} className="grid gap-3 rounded-lg border border-line p-4">
            <h2 className="text-lg font-semibold text-ink">Create project</h2>
            <input aria-label="Client UUID" name="clientId" placeholder="Client UUID (optional)" className="h-10 rounded-md border border-line px-3 text-sm" />
            <input aria-label="Project key" name="projectKey" required placeholder="project-key" className="h-10 rounded-md border border-line px-3 text-sm" />
            <input aria-label="Project name" name="projectName" required placeholder="Project name" className="h-10 rounded-md border border-line px-3 text-sm" />
            <textarea aria-label="Project description" name="description" placeholder="Description (optional)" className="min-h-20 rounded-md border border-line p-3 text-sm" />
            <button disabled={pending || !organizationId} className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60">Create</button>
          </form>

          <form onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const projectId = String(form.get("projectId") ?? "").trim();
            void runAction("create_invitation", {
              organizationId,
              projectId,
              email: form.get("email"),
              organizationRole: form.get("organizationRole"),
              projectRole: projectId ? form.get("projectRole") : null,
              expiresInDays: Number(form.get("expiresInDays"))
            });
          }} className="grid gap-3 rounded-lg border border-line p-4">
            <h2 className="text-lg font-semibold text-ink">Create invitation</h2>
            <input aria-label="Invitee email" name="email" type="email" required placeholder="invitee@company.com" className="h-10 rounded-md border border-line px-3 text-sm" />
            <input aria-label="Invitation project UUID" name="projectId" placeholder="Project UUID (optional)" className="h-10 rounded-md border border-line px-3 text-sm" />
            <div className="grid gap-3 sm:grid-cols-2">
              <select aria-label="Invitation organization role" name="organizationRole" defaultValue="member" className="h-10 rounded-md border border-line px-3 text-sm">
                <option value="member">Organization member</option><option value="admin">Organization admin</option><option value="owner">Organization owner</option>
              </select>
              <select aria-label="Invitation project role" name="projectRole" defaultValue="viewer" className="h-10 rounded-md border border-line px-3 text-sm">
                <option value="viewer">Project viewer</option><option value="analyst">Project analyst</option><option value="client_viewer">Client viewer</option><option value="admin">Project admin</option><option value="owner">Project owner</option>
              </select>
            </div>
            <input aria-label="Invitation expiry in days" name="expiresInDays" type="number" min="1" max="30" defaultValue="7" className="h-10 rounded-md border border-line px-3 text-sm" />
            <button disabled={pending || !organizationId} className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60">Create one-time invitation</button>
          </form>

          <form onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const scope = membershipScope;
            const base = {
              profileId: form.get("profileId"),
              role: form.get("role"),
              status: form.get("status"),
              rowVersion: form.get("rowVersion") ? Number(form.get("rowVersion")) : null
            };
            void runAction(scope === "project" ? "set_project_member" : "set_organization_member", scope === "project"
              ? { ...base, projectId: form.get("scopeId") }
              : { ...base, organizationId: form.get("scopeId") });
          }} className="grid gap-3 rounded-lg border border-line p-4 xl:col-span-2">
            <h2 className="text-lg font-semibold text-ink">Set membership</h2>
            <div className="grid gap-3 md:grid-cols-3">
              <select aria-label="Membership scope" name="scope" value={membershipScope} onChange={(event) => setMembershipScope(event.target.value as "organization" | "project")} className="h-10 rounded-md border border-line px-3 text-sm"><option value="organization">Organization</option><option value="project">Project</option></select>
              <input aria-label={membershipScope === "project" ? "Project UUID" : "Organization UUID"} name="scopeId" required placeholder={membershipScope === "project" ? "Project UUID" : "Organization UUID"} className="h-10 rounded-md border border-line px-3 text-sm" />
              <input aria-label="Profile UUID" name="profileId" required placeholder="Profile UUID" className="h-10 rounded-md border border-line px-3 text-sm" />
              <select key={`${membershipScope}-role`} aria-label="Membership role" name="role" defaultValue={membershipScope === "project" ? "viewer" : "member"} className="h-10 rounded-md border border-line px-3 text-sm">
                {membershipScope === "project" ? <><option value="viewer">viewer</option><option value="analyst">analyst</option><option value="client_viewer">client_viewer</option><option value="admin">admin</option><option value="owner">owner</option></> : <><option value="member">member</option><option value="admin">admin</option><option value="owner">owner</option></>}
              </select>
              <select key={`${membershipScope}-status`} aria-label="Membership status" name="status" defaultValue="active" className="h-10 rounded-md border border-line px-3 text-sm">
                <option value="active">active</option><option value="invited">invited</option><option value="disabled">disabled</option>{membershipScope === "organization" ? <option value="suspended">suspended</option> : null}
              </select>
              <input aria-label="Expected membership row version" name="rowVersion" type="number" min="1" placeholder="Expected row version (required for update)" className="h-10 rounded-md border border-line px-3 text-sm" />
            </div>
            <button disabled={pending} className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60">Apply membership mutation</button>
          </form>
        </div>

        {snapshot ? (
          <div className="mt-8 grid gap-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[["Clients", counts?.clients], ["Projects", counts?.projects], ["Members", counts?.members], ["Pending invitations", counts?.pendingInvitations]].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg border border-line bg-surface p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{String(label)}</p><p className="mt-2 text-2xl font-semibold text-ink">{display(value)}</p></div>
              ))}
            </div>

            {[["Clients", clients, "display_name"], ["Projects", projects, "name"], ["Members", members, "email"]].map(([title, rows, labelKey]) => (
              <div key={String(title)} className="rounded-lg border border-line p-4">
                <h2 className="text-lg font-semibold text-ink">{String(title)}</h2>
                <div className="mt-3 grid gap-2">
                  {(rows as JsonRecord[]).map((row) => <div key={display(row.id)} className="break-all rounded-md bg-surface px-3 py-2 text-sm text-muted"><span className="font-semibold text-ink">{display(row[String(labelKey)])}</span> · {display(row.id)} · {display(row.status ?? row.role)} · v{display(row.row_version)}</div>)}
                  {(rows as JsonRecord[]).length === 0 ? <p className="text-sm text-muted">No records in the initial page.</p> : null}
                </div>
              </div>
            ))}

            <div className="rounded-lg border border-line p-4">
              <h2 className="text-lg font-semibold text-ink">Invitations</h2>
              <div className="mt-3 grid gap-2">
                {invitations.map((row) => (
                  <div key={display(row.id)} className="flex flex-col gap-2 rounded-md bg-surface px-3 py-2 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
                    <span className="min-w-0 break-all"><strong className="text-ink">{display(row.email)}</strong> · {display(row.status)} · v{display(row.row_version)}</span>
                    {row.status === "pending" ? <button type="button" disabled={pending} onClick={() => void runAction("revoke_invitation", { invitationId: row.id, rowVersion: row.row_version })} className="text-xs font-semibold text-[#8a3030] hover:underline">Revoke</button> : null}
                  </div>
                ))}
                {invitations.length === 0 ? <p className="text-sm text-muted">No invitations in the initial page.</p> : null}
              </div>
            </div>

            <div className="rounded-lg border border-line p-4">
              <h2 className="text-lg font-semibold text-ink">Append-only audit</h2>
              <div className="mt-3 grid gap-2">
                {audit.map((row) => <div key={display(row.id)} className="break-all rounded-md bg-surface px-3 py-2 text-sm text-muted"><strong className="text-ink">{display(row.action)}</strong> · {display(row.target_type)} · {display(row.created_at)} · request {display(row.request_id)}</div>)}
                {audit.length === 0 ? <p className="text-sm text-muted">No audit records in the initial page.</p> : null}
              </div>
            </div>
          </div>
        ) : null}

        <p className="mt-8 text-xs leading-5 text-muted">
          Aggregate snapshot pagination is intentionally initial-only and capped at 25 records per collection. Resource-specific typed keyset RPCs are still required before any collection can continue beyond this page.
        </p>
      </div>
    </section>
  );
}
