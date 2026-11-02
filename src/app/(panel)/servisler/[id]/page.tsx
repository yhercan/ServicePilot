import Link from "next/link";
import { notFound } from "next/navigation";
import { PageSuspense } from "@/components/page-suspense";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { EmptyState, PageHeader } from "@/components/page-header";
import { PriorityBadge, StatusBadge, TypeBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AssignmentForm,
  CommentForm,
  NextVisitForm,
  ProgressForm,
  UploadForm,
} from "@/components/visits/visit-widgets";
import { requireActor } from "@/lib/auth";
import { formatDate, formatDateTime, toDateInputValue, toDateTimeInputValue } from "@/lib/dates";
import { formatBytes, shortId } from "@/lib/format";
import { documentTypeLabel, serviceStatusLabel } from "@/lib/labels";
import { canManageOperations, canSuperviseTeamVisits } from "@/lib/permissions";
import { deleteAttachment } from "@/modules/attachments/actions";
import { deleteVisit } from "@/modules/visits/actions";
import { getVisit, listVisitFormOptions } from "@/modules/visits/queries";

export const metadata = { title: "Servis detayı" };

export default function VisitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PageSuspense>
      <VisitDetailContent params={params} />
    </PageSuspense>
  );
}

async function VisitDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  const { id } = await params;
  const visit = await getVisit(actor, id);
  if (!visit) notFound();
  const canManage = canManageOperations(actor.role);
  const canSupervise = canSuperviseTeamVisits(actor.role);
  const options = canSupervise ? await listVisitFormOptions(actor) : { technicians: [] };
  const report = visit.attachments.find((item) => item.documentType === "SERVICE_REPORT");

  return (
    <div>
      <PageHeader
        title={visit.title}
        description={`Kayıt no ${shortId(visit.id)}`}
        actions={
          canManage ? (
            <>
              <Button asChild variant="outline"><Link href={`/servisler/${visit.id}/duzenle`}>Düzenle</Link></Button>
              <ConfirmSubmit action={deleteVisit} id={visit.id} label="Sil" message="Bu servis ziyareti ve ekleri silinsin mi?" />
            </>
          ) : null
        }
      />
      <p className="mb-4 font-mono text-xs text-muted-foreground" title={visit.id}>{visit.id}</p>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <Card className="grid gap-3 p-4 text-sm sm:grid-cols-2">
            <p><span className="text-muted-foreground">Müşteri: </span><Link className="text-primary" href={`/musteriler/${visit.customer.id}`}>{visit.customer.companyName}</Link></p>
            <p><span className="text-muted-foreground">İlgili kişi: </span>{visit.customer.contactPerson}</p>
            <p><span className="text-muted-foreground">Telefon: </span>{visit.customer.phone || "—"}</p>
            <p><span className="text-muted-foreground">Şehir: </span>{visit.customer.city || "—"}</p>
            <p><span className="text-muted-foreground">Ekipman: </span><Link className="text-primary" href={`/ekipmanlar/${visit.equipment.id}`}>{visit.equipment.name}</Link></p>
            <p><span className="text-muted-foreground">İlgili ekip: </span>{visit.team?.name ?? "—"}</p>
            <p><span className="text-muted-foreground">Seri no: </span>{visit.equipment.serialNumber || "—"}</p>
            <p><span className="text-muted-foreground">Konum: </span>{visit.equipment.location || "—"}</p>
            <p className="flex items-center gap-2"><span className="text-muted-foreground">Tür: </span><TypeBadge type={visit.serviceType} /></p>
            <p className="flex items-center gap-2"><span className="text-muted-foreground">Öncelik: </span><PriorityBadge priority={visit.priority} /></p>
            <p className="flex items-center gap-2"><span className="text-muted-foreground">Durum: </span><StatusBadge status={visit.status} /></p>
            <p><span className="text-muted-foreground">Planlanan: </span>{formatDate(visit.plannedDate)}</p>
            <p><span className="text-muted-foreground">Başlangıç: </span>{formatDateTime(visit.actualStartDate)}</p>
            <p><span className="text-muted-foreground">Bitiş: </span>{formatDateTime(visit.actualEndDate)}</p>
            <p><span className="text-muted-foreground">Oluşturan: </span>{visit.createdBy.name}</p>
            <p className="sm:col-span-2"><span className="text-muted-foreground">SAP referans no: </span>{visit.sapReferenceNumber || "—"}</p>
            <p className="sm:col-span-2"><span className="text-muted-foreground">Açıklama: </span>{visit.description || "—"}</p>
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 font-medium">Servis formu</h2>
            {report ? (
              <a
                href={`/api/dosyalar/${report.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                Servis Formunu Görüntüle
              </a>
            ) : (
              <EmptyState title="PDF yüklenmedi" description="Bu servis ziyareti için henüz bir servis formu yok." />
            )}
            <div className="mt-4">
              <UploadForm visitId={visit.id} />
            </div>
            {visit.attachments.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm">
                {visit.attachments.map((file) => (
                  <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                    <div>
                      <a className="text-primary" href={`/api/dosyalar/${file.id}`} target="_blank" rel="noopener noreferrer">
                        {file.originalFileName}
                      </a>
                      <p className="text-xs text-muted-foreground">
                        {documentTypeLabel[file.documentType]} · {formatBytes(file.fileSize)} · {file.uploadedBy.name} · {formatDateTime(file.createdAt)}
                      </p>
                    </div>
                    {canManage || file.uploadedById === actor.userId ? (
                      <ConfirmSubmit action={deleteAttachment} id={file.id} label="Sil" message="Bu dosya silinsin mi?" />
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 font-medium">Sıradaki ziyaret</h2>
            <NextVisitForm
              visitId={visit.id}
              enabled={visit.nextVisitEnabled}
              nextVisitDate={toDateInputValue(visit.nextVisitDate)}
              nextVisitType={visit.nextVisitType ?? ""}
            />
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 font-medium">Yorumlar</h2>
            {visit.comments.length === 0 ? (
              <p className="mb-3 text-sm text-muted-foreground">Henüz yorum yok.</p>
            ) : (
              <ul className="mb-4 space-y-3">
                {visit.comments.map((comment) => (
                  <li key={comment.id} className="rounded-lg bg-muted px-3 py-2">
                    <p className="text-sm">{comment.content}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{comment.user.name} · {formatDateTime(comment.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
            <CommentForm key={visit.comments.length} visitId={visit.id} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-3 font-medium">Durum ve saha bilgisi</h2>
            <ProgressForm
              visitId={visit.id}
              status={visit.status}
              description={visit.description ?? ""}
              actualStartDate={toDateTimeInputValue(visit.actualStartDate)}
              actualEndDate={toDateTimeInputValue(visit.actualEndDate)}
            />
          </Card>
          <Card className="p-4">
            <h2 className="mb-3 font-medium">Atanan teknisyenler</h2>
            {visit.assignments.length === 0 ? (
              <p className="mb-3 text-sm text-muted-foreground">Henüz teknisyen atanmadı.</p>
            ) : (
              <ul className="mb-3 space-y-1 text-sm">
                {visit.assignments.map((assignment) => (
                  <li key={assignment.id}>{assignment.user.name} · {formatDateTime(assignment.assignedAt)}</li>
                ))}
              </ul>
            )}
            {canSupervise ? (
              <AssignmentForm
                visitId={visit.id}
                technicians={options.technicians}
                selectedIds={visit.assignments.map((item) => item.userId)}
              />
            ) : null}
          </Card>
          <Card className="p-4">
            <h2 className="mb-3 font-medium">Durum geçmişi</h2>
            {visit.statusHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">Geçmiş kaydı yok.</p>
            ) : (
              <ol className="space-y-3">
                {visit.statusHistory.map((entry) => (
                  <li key={entry.id} className="border-l-2 border-primary pl-3 text-sm">
                    <p>
                      {entry.previousStatus ? serviceStatusLabel[entry.previousStatus] : "Yeni kayıt"}
                      {" → "}
                      {serviceStatusLabel[entry.newStatus]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.changedBy.name} · {formatDateTime(entry.createdAt)}
                    </p>
                    {entry.note ? <p className="mt-1 text-muted-foreground">{entry.note}</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
