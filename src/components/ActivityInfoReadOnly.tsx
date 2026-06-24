type ActivityInfoReadOnlyProps = {
  info: {
    company_name: string | null;
    pfmp_period: string | null;
    situation_date: string | null;
    student_role: string | null;
    realization_conditions: string | null;
  };
};

function displayValue(value: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "Non renseigné";
}

function FieldValue({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string | null;
  multiline?: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-950/60 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`mt-1 text-sm font-medium text-slate-100 ${
          multiline ? "whitespace-pre-wrap leading-6" : ""
        }`}
      >
        {displayValue(value)}
      </p>
    </div>
  );
}

export default function ActivityInfoReadOnly({
  info,
}: ActivityInfoReadOnlyProps) {
  return (
    <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Contrôle professeur
        </p>
        <h2 className="mt-2 text-lg font-semibold leading-snug text-slate-100 sm:text-xl">
          Informations sur l'activité
        </h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FieldValue label="Organisation concernée" value={info.company_name} />
        <FieldValue label="Période de PFMP" value={info.pfmp_period} />
        <FieldValue label="Date de la situation" value={info.situation_date} />
        <FieldValue
          label="Place et rôle de l'élève"
          value={info.student_role}
          multiline
        />
        <div className="sm:col-span-2">
          <FieldValue
            label="Conditions de réalisation"
            value={info.realization_conditions}
            multiline
          />
        </div>
      </div>
    </section>
  );
}
