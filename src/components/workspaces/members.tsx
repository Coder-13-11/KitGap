import { MemberRoleButton } from "./workspace-forms";

export function MemberList({
  workspaceId,
  members,
  viewerId,
  canManage,
  adminLabel,
  memberLabel,
}: {
  workspaceId: string;
  members: { userId: string; name: string; role: "admin" | "member" }[];
  viewerId: string | null;
  canManage: boolean;
  adminLabel: string;
  memberLabel: string;
}) {
  return (
    <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
      {members.map((m) => (
        <li key={m.userId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <span>
            <span className="font-semibold">{m.name}</span>
            {m.userId === viewerId ? <span className="text-muted"> (you)</span> : null}
            <span className="block text-sm text-muted">{m.role === "admin" ? adminLabel : memberLabel}</span>
          </span>
          {canManage && m.userId !== viewerId ? (
            <span className="flex flex-wrap gap-1">
              <MemberRoleButton
                workspaceId={workspaceId}
                memberId={m.userId}
                role={m.role === "admin" ? "member" : "admin"}
                label={m.role === "admin" ? `Make ${memberLabel.toLowerCase()}` : `Make ${adminLabel.toLowerCase()}`}
              />
              <MemberRoleButton workspaceId={workspaceId} memberId={m.userId} role="remove" label="Remove" />
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
