import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { formatDateID, formatIDR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminTransactions() {
  const transactions = await prisma.transaction.findMany({
    include: { customer: true, branch: true, items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Transaksi</CardTitle>
          <CardDescription>
            Setiap transaksi memberikan poin loyalty 10 poin / kelipatan Rp 10.000.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--color-muted)] text-left text-xs uppercase tracking-wide text-[color:var(--color-muted-fg)]">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Pelanggan</th>
                  <th className="px-4 py-3">Cabang</th>
                  <th className="px-4 py-3">Subtotal</th>
                  <th className="px-4 py-3">Diskon Poin</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Poin +</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-border)]">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-[color:var(--color-muted)]/30">
                    <td className="px-4 py-3 font-medium">{t.invoiceNumber}</td>
                    <td className="px-4 py-3">{t.customer.fullName}</td>
                    <td className="px-4 py-3">{t.branch.name}</td>
                    <td className="px-4 py-3">{formatIDR(t.subtotal)}</td>
                    <td className="px-4 py-3">- {formatIDR(t.discountAmount)}</td>
                    <td className="px-4 py-3 font-semibold">{formatIDR(t.total)}</td>
                    <td className="px-4 py-3 text-[color:var(--color-success)]">
                      +{t.earnedPoints}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={t.status === "PAID" ? "success" : "warning"}>{t.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-[color:var(--color-muted-fg)]">
                      {formatDateID(t.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
