import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/prisma";
import { formatDateID, formatTimeID } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type SP = {
  entity?: string;
  actorId?: string;
  page?: string;
};

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const entity = sp.entity?.trim() || undefined;
  const actorId = sp.actorId?.trim() || undefined;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where: Prisma.AuditLogWhereInput = {
    ...(entity ? { entity: { equals: entity, mode: "insensitive" } } : {}),
    ...(actorId ? { actorId } : {}),
  };

  const [logs, total, entityFacets, actorOptions] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { id: true, fullName: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({
      by: ["entity"],
      _count: { _all: true },
      orderBy: { _count: { entity: "desc" } },
      take: 12,
    }),
    prisma.user.findMany({
      where: { auditLogs: { some: {} } },
      select: { id: true, fullName: true, email: true, role: true },
      orderBy: { fullName: "asc" },
      take: 100,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildHref(patch: Partial<SP>): { pathname: string; query: Record<string, string> } {
    const next: Record<string, string> = {};
    if (entity) next.entity = entity;
    if (actorId) next.actorId = actorId;
    if (page > 1) next.page = String(page);
    Object.entries(patch).forEach(([k, v]) => {
      if (v == null || v === "") delete next[k];
      else next[k] = String(v);
    });
    return { pathname: "/admin/audit", query: next };
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Audit log</CardTitle>
          <CardDescription>
            Aktivitas sensitif (booking, transaksi, loyalty, reminder, dst.) tercatat di sini.
            Total {total.toLocaleString("id-ID")} entri.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form
            action="/admin/audit"
            method="GET"
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
          >
            <div className="grid gap-1">
              <Label htmlFor="entity">Entity</Label>
              <Input
                id="entity"
                name="entity"
                placeholder="Booking, Transaction, …"
                defaultValue={entity ?? ""}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="actorId">Actor</Label>
              <select
                id="actorId"
                name="actorId"
                defaultValue={actorId ?? ""}
                className="h-10 rounded-xl border border-[color:var(--color-border)] bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
              >
                <option value="">Semua actor</option>
                {actorOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.role})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" size="default">
                Filter
              </Button>
              {entity || actorId ? (
                <Button asChild type="button" variant="soft" size="default">
                  <Link href="/admin/audit">Reset</Link>
                </Button>
              ) : null}
            </div>
          </form>

          {entityFacets.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              <span className="self-center text-xs text-[color:var(--color-muted-fg)]">
                Pintasan entity:
              </span>
              {entityFacets.map((f) => (
                <Button
                  key={f.entity}
                  asChild
                  size="sm"
                  variant={entity?.toLowerCase() === f.entity.toLowerCase() ? "default" : "soft"}
                >
                  <Link href={buildHref({ entity: f.entity, page: "" })}>
                    {f.entity}{" "}
                    <span className="ml-1 text-[10px] opacity-70">
                      {f._count._all}
                    </span>
                  </Link>
                </Button>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <p className="p-6 text-sm text-[color:var(--color-muted-fg)]">
              Tidak ada audit entry untuk filter ini.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[color:var(--color-muted)] text-left text-xs uppercase tracking-wide text-[color:var(--color-muted-fg)]">
                  <tr>
                    <th className="px-4 py-3">Waktu</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Entity ID</th>
                    <th className="px-4 py-3">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--color-border)]">
                  {logs.map((l) => (
                    <tr key={l.id} className="align-top hover:bg-[color:var(--color-muted)]/30">
                      <td className="px-4 py-3 text-xs text-[color:var(--color-muted-fg)]">
                        <div>{formatDateID(l.createdAt)}</div>
                        <div>{formatTimeID(l.createdAt)}</div>
                      </td>
                      <td className="px-4 py-3">
                        {l.actor ? (
                          <div>
                            <div className="font-medium">{l.actor.fullName}</div>
                            <div className="text-xs text-[color:var(--color-muted-fg)]">
                              {l.actor.email ?? "-"} · {l.actor.role}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-[color:var(--color-muted-fg)]">
                            system
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{l.action}</td>
                      <td className="px-4 py-3">
                        <Badge tone="default">{l.entity}</Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[color:var(--color-muted-fg)]">
                        {l.entityId ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        {l.metadata ? (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-[color:var(--color-muted-fg)] hover:text-[color:var(--color-fg)]">
                              Lihat metadata
                            </summary>
                            <pre className="mt-1 max-w-md overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-[color:var(--color-muted)] p-2 font-mono text-[11px]">
                              {JSON.stringify(l.metadata, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-xs text-[color:var(--color-muted-fg)]">
                            -
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {total > PAGE_SIZE ? (
            <div className="flex items-center justify-between border-t border-[color:var(--color-border)] px-4 py-3 text-xs">
              <span className="text-[color:var(--color-muted-fg)]">
                Halaman {page} dari {totalPages} · menampilkan {logs.length} dari{" "}
                {total.toLocaleString("id-ID")}
              </span>
              <div className="flex gap-1">
                <Button
                  asChild
                  size="sm"
                  variant="soft"
                  disabled={page <= 1}
                  aria-disabled={page <= 1}
                >
                  <Link href={buildHref({ page: String(Math.max(1, page - 1)) })}>
                    ← Sebelumnya
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="soft"
                  disabled={page >= totalPages}
                  aria-disabled={page >= totalPages}
                >
                  <Link href={buildHref({ page: String(Math.min(totalPages, page + 1)) })}>
                    Selanjutnya →
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
