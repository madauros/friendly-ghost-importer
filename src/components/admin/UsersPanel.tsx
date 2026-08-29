import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { SPACE_LABEL, STATUS_LABEL, type SpaceKey } from "@/lib/spaces";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type LevelRow = Database["public"]["Tables"]["levels"]["Row"];
type ClassRow = Database["public"]["Tables"]["classes"]["Row"];

const SPACES: SpaceKey[] = ["talameed", "taleem", "admin"];
const STATUSES: Database["public"]["Enums"]["account_status"][] = ["pending", "approved", "rejected"];

export function UsersPanel({ client }: { client: SupabaseClient<Database> }) {
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [levels, setLevels] = useState<LevelRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [spaceFilter, setSpaceFilter] = useState<"all" | SpaceKey>("all");
  const [editing, setEditing] = useState<ProfileRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: p, error: e1 }, { data: lv, error: e2 }, { data: cl, error: e3 }, { data: tc, error: e4 }] =
      await Promise.all([
        client.from("profiles").select("*").order("created_at", { ascending: false }),
        client.from("levels").select("*").order("position", { ascending: true }),
        client.from("classes").select("*").order("name", { ascending: true }),
        client.from("teacher_classes").select("teacher_id, class_id"),
      ]);
    if (e1 || e2 || e3 || e4) setError("تعذّر تحميل المستخدمين. تأكد من صلاحيات المشرف العام.");
    else {
      setError(null);
      setRows(p ?? []);
      setLevels(lv ?? []);
      setClasses(cl ?? []);
      const map: Record<string, string[]> = {};
      for (const row of tc ?? []) {
        (map[row.teacher_id] ??= []).push(row.class_id);
      }
      setTeacherClasses(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const save = async (patch: Partial<ProfileRow>, teacherClassIds: string[]) => {
    if (!editing) return;
    setBusy(true);
    const { error: err } = await client
      .from("profiles")
      .update({ ...patch, reviewed_at: new Date().toISOString() })
      .eq("id", editing.id);

    let syncError = err;
    if (!syncError) {
      const current = teacherClasses[editing.id] ?? [];
      const next = patch.space === "taleem" ? teacherClassIds : [];
      const toAdd = next.filter((id) => !current.includes(id));
      const toRemove = current.filter((id) => !next.includes(id));
      if (toRemove.length > 0) {
        const { error: delErr } = await client
          .from("teacher_classes")
          .delete()
          .eq("teacher_id", editing.id)
          .in("class_id", toRemove);
        syncError = delErr;
      }
      if (!syncError && toAdd.length > 0) {
        const { error: insErr } = await client
          .from("teacher_classes")
          .insert(toAdd.map((class_id) => ({ teacher_id: editing.id, class_id })));
        syncError = insErr;
      }
    }

    if (syncError) setError("تعذّر حفظ المستخدم.");
    else {
      setError(null);
      setEditing(null);
      await load();
    }
    setBusy(false);
  };

  const remove = async (row: ProfileRow) => {
    if (!window.confirm(`حذف المستخدم «${row.email}»؟`)) return;
    const { error: err } = await client.from("profiles").delete().eq("id", row.id);
    if (err) setError("تعذّر حذف المستخدم.");
    else await load();
  };

  const levelName = (id: string | null) => levels.find((l) => l.id === id)?.name ?? "—";
  const className = (id: string | null) => classes.find((c) => c.id === id)?.name ?? "—";
  const teacherClassNames = (id: string) =>
    (teacherClasses[id] ?? [])
      .map((cid) => classes.find((c) => c.id === cid)?.name)
      .filter(Boolean)
      .join("، ");

  const visible = rows.filter((r) => {
    if (spaceFilter !== "all" && r.space !== spaceFilter) return false;
    const q = search.trim().toLowerCase();
    if (q === "") return true;
    return (
      r.email.toLowerCase().includes(q) || (r.full_name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground">كل المستخدمين</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        عدّل الاسم والحالة والفضاء، وأسند المستوى والقسم إلى التلميذ.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <input
          className="field-input flex-1"
          placeholder="بحث بالبريد أو الاسم"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="field-input"
          value={spaceFilter}
          onChange={(e) => setSpaceFilter(e.target.value as "all" | SpaceKey)}
        >
          <option value="all">كل الفضاءات</option>
          {SPACES.map((s) => (
            <option key={s} value={s}>
              {SPACE_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">جارٍ التحميل…</p>
        ) : visible.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">لا يوجد مستخدمون.</p>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((r) => (
              <li key={r.id} className="p-4">
                {editing?.id === r.id ? (
                  <UserEditor
                    row={r}
                    levels={levels}
                    classes={classes}
                    teacherClassIds={teacherClasses[r.id] ?? []}
                    busy={busy}
                    onCancel={() => setEditing(null)}
                    onSave={save}
                  />
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        {r.full_name || <span dir="ltr">{r.email}</span>}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span dir="ltr">{r.email}</span>
                        <span>•</span>
                        <span>{SPACE_LABEL[r.space as SpaceKey]}</span>
                        <span>•</span>
                        <span>{STATUS_LABEL[r.status]}</span>
                        {r.space === "talameed" ? (
                          <>
                            <span>•</span>
                            <span>المستوى: {levelName(r.level_id)}</span>
                            <span>•</span>
                            <span>القسم: {className(r.class_id)}</span>
                          </>
                        ) : null}
                        {r.space === "taleem" ? (
                          <>
                            <span>•</span>
                            <span>الأقسام: {teacherClassNames(r.id) || "—"}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" className="btn-text" onClick={() => setEditing(r)}>
                        تعديل
                      </button>
                      <button type="button" className="btn-text" onClick={() => remove(r)}>
                        حذف
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function UserEditor({
  row,
  levels,
  classes,
  teacherClassIds,
  busy,
  onCancel,
  onSave,
}: {
  row: ProfileRow;
  levels: LevelRow[];
  classes: ClassRow[];
  teacherClassIds: string[];
  busy: boolean;
  onCancel: () => void;
  onSave: (patch: Partial<ProfileRow>, teacherClassIds: string[]) => Promise<void>;
}) {
  const [fullName, setFullName] = useState(row.full_name ?? "");
  const [space, setSpace] = useState(row.space);
  const [status, setStatus] = useState(row.status);
  const [levelId, setLevelId] = useState(row.level_id ?? "");
  const [classId, setClassId] = useState(row.class_id ?? "");
  const [teachClasses, setTeachClasses] = useState<string[]>(teacherClassIds);

  const filteredClasses = levelId === "" ? classes : classes.filter((c) => c.level_id === levelId);

  const toggleTeachClass = (id: string) =>
    setTeachClasses((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <form
      className="grid gap-3 sm:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave(
          {
            full_name: fullName.trim() === "" ? null : fullName.trim(),
            space,
            status,
            level_id: levelId === "" ? null : levelId,
            class_id: classId === "" ? null : classId,
          },
          teachClasses,
        );
      }}
    >
      <div className="text-xs text-muted-foreground sm:col-span-3" dir="ltr">
        {row.email}
      </div>
      <input
        className="field-input"
        placeholder="الاسم الكامل"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />
      <select
        className="field-input"
        value={space}
        onChange={(e) => setSpace(e.target.value as ProfileRow["space"])}
      >
        {SPACES.map((s) => (
          <option key={s} value={s}>
            {SPACE_LABEL[s]}
          </option>
        ))}
      </select>
      <select
        className="field-input"
        value={status}
        onChange={(e) => setStatus(e.target.value as ProfileRow["status"])}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <select
        className="field-input"
        value={levelId}
        onChange={(e) => {
          setLevelId(e.target.value);
          setClassId("");
        }}
      >
        <option value="">بدون مستوى</option>
        {levels.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      <select className="field-input" value={classId} onChange={(e) => setClassId(e.target.value)}>
        <option value="">بدون قسم</option>
        {filteredClasses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={busy}>
          حفظ
        </button>
        <button type="button" className="btn-text" onClick={onCancel}>
          إلغاء
        </button>
      </div>
    </form>
  );
}
