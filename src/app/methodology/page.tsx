import AppShell from "@/components/AppShell";
import { Card, PageTitle } from "@/components/ui/kit";
import { requireUser } from "@/lib/current-user";
import type { Tr } from "@/lib/i18n";
import { getTr } from "@/lib/i18n-server";

export const instant = false;

const rows = (tr: Tr): [string, string, string][] => [
  [tr("Planned % (نشاط)", "Planned % (activity)"), "(Data Date − Early Start) ÷ (Early Finish − Early Start)",
    tr("توزيع خطي: النشاط بيتقدم بنفس المعدل كل يوم من بدايته لنهايته. قبل البداية 0%، وبعد النهاية 100%.",
      "Linear distribution: the activity progresses at the same rate every day from start to finish. 0% before the start, 100% after the finish.")],
  [tr("الوزن", "Weight"), "Budget Cost ÷ Σ Budget Cost", tr("كل نشاط بيأثر على نسبة المشروع حسب ميزانيته.", "Each activity affects project progress according to its budget.")],
  ["BAC", "Σ Budget Cost", tr("الميزانية الكلية للأنشطة المختارة.", "Total budget of the selected activities.")],
  ["PV", "Σ (Budget × Planned %)", tr("قيمة الشغل اللي كان لازم يكون منجز لـ Data Date.", "Value of work that should be done by the data date.")],
  ["EV", "Σ (Budget × Actual %)", tr("قيمة الشغل المنجز فعلياً، محسوبة بأسعار الميزانية.", "Value of work actually done, at budget rates.")],
  ["AC", "Σ Actual Cost", tr("المصروف الفعلي التراكمي اللي سجّله المهندس.", "Cumulative actual spend recorded by the engineer.")],
  [tr("Planned % (مشروع)", "Planned % (project)"), "PV ÷ BAC", tr("نسبة الإنجاز المخططة الموزونة.", "Weighted planned progress.")],
  [tr("Actual % (مشروع)", "Actual % (project)"), "EV ÷ BAC", tr("نسبة الإنجاز الفعلية الموزونة.", "Weighted actual progress.")],
  ["SV", "EV − PV", tr("سالب = متأخرين بقيمة الشغل.", "Negative = behind in value of work.")],
  ["CV", "EV − AC", tr("سالب = صرفنا أكتر من قيمة الشغل المنجز.", "Negative = spent more than the value of work done.")],
  ["SPI", "EV ÷ PV", tr("أقل من 1 = أبطأ من الخطة.", "Below 1 = slower than planned.")],
  ["CPI", "EV ÷ AC", tr("أقل من 1 = فوق الميزانية.", "Below 1 = over budget.")],
  ["EAC", "BAC ÷ CPI", tr("التكلفة المتوقعة عند الانتهاء إذا ضل أداء التكلفة نفسه.", "Expected cost at completion if cost performance stays the same.")],
  ["EAC (CPI×SPI)", "AC + (BAC − EV) ÷ (CPI × SPI)", tr("تقدير أكثر تحفّظاً، بياخد الجدول والتكلفة مع بعض.", "A more conservative estimate that combines schedule and cost.")],
  ["ETC", "EAC − AC", tr("المبلغ اللي لسا لازم ينصرف.", "Amount still to be spent.")],
  ["VAC", "BAC − EAC", tr("سالب = رح نتجاوز الميزانية بهالقيمة.", "Negative = the budget will be exceeded by this amount.")],
  ["TCPI", "(BAC − EV) ÷ (BAC − AC)", tr("الكفاءة المطلوبة بالباقي حتى نخلص ضمن الميزانية. أكبر من 1 = صعب.", "Efficiency needed on the remaining work to finish within budget. Above 1 = hard.")],
  ["Earned Schedule (ES)", tr("التاريخ t اللي فيه PV(t) = EV", "the date t where PV(t) = EV"), tr("بندوّر على الخطة لنلاقي اليوم اللي كان المفروض نوصل فيه للإنجاز الحالي.", "Search the plan for the day we should have reached today's progress.")],
  [tr("التأخير (يوم)", "Delay (days)"), "ES − Data Date", tr("سالب = متأخر بهالعدد من الأيام.", "Negative = behind by this many days.")],
  [tr("الانتهاء المتوقع", "Forecast finish"), "Contract Finish − Delay", tr("بيفترض إنه التأخير الحالي ثابت لآخر المشروع.", "Assumes the current delay stays the same until the end.")],
];

const controls = (tr: Tr): [string, string[]][] => [
  [tr("الأنشطة", "Activities"), [
    tr("رمز النشاط مطلوب وما بيتكرر بنفس المشروع.", "Activity code is required and unique within the project."),
    tr("الميزانية لازم تكون أكبر من صفر، والساعات صفر أو أكتر.", "Budget must be greater than zero; manhours zero or more."),
    "Early Finish ≥ Early Start, Late Finish ≥ Late Start.",
    "Late Start ≥ Early Start, Late Finish ≥ Early Finish.",
    tr("تحذير إذا النشاط برا مدة العقد، أو إذا عدّلت نشاط إله تقدم مسجّل.", "Warning if the activity falls outside the contract, or if you edit an activity with recorded progress."),
  ]],
  [tr("تحديثات التقدم", "Progress updates"), [
    tr("Data Date ما بيكون بالمستقبل ولا قبل بداية العقد.", "The data date can't be in the future or before the contract start."),
    tr("التحديث الجديد لازم يكون بعد آخر تحديث (أو بتعدّل تاريخ موجود).", "A new update must be after the last one (or you edit an existing date)."),
    tr("Actual % بين 0 و100، وتراكمي: ما بينزل عن التحديث السابق ولا بيطلع عن اللي بعده.", "Actual % is 0–100 and cumulative: it can't drop below the previous update or exceed the next one."),
    tr("التكلفة الفعلية تراكمية: ما بتنزل عن التحديث السابق.", "Actual cost is cumulative: it can't drop below the previous update."),
    tr("تحذيرات بدها تأكيد: تكلفة بدون إنجاز، إنجاز بدون تكلفة، قفزة أكبر من 40%، تكلفة أكتر من 150% من EV أو 125% من الميزانية، إنجاز قبل البداية المخططة.",
      "Warnings that need confirmation: cost without progress, progress without cost, a jump over 40%, cost above 150% of EV or 125% of budget, progress before the planned start."),
  ]],
  [tr("السجل", "Log"), [
    tr("كل إضافة أو تعديل أو حذف بينسجّل باسم المستخدم ووقته، وبتشوفه من «الإعدادات والسجل».", "Every add, edit or delete is recorded with the user and time, under “Settings & log”."),
  ]],
];

export default async function MethodologyPage() {
  const user = await requireUser();
  const tr = await getTr();
  return (
    <AppShell user={user}>
      <PageTitle
        title={tr("طريقة الحساب", "Methodology")}
        subtitle={tr("كل رقم بالتطبيق محسوب من بياناتك بهالمعادلات، بدون أي تقدير مخفي", "Every number in the app is calculated from your data with these formulas — no hidden estimates")}
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Card title={tr("المعادلات", "Formulas")} pad={false}>
          <table className="w-full text-sm">
            <tbody>
              {rows(tr).map(([k, f, m]) => (
                <tr key={k} className="border-t border-line align-top first:border-t-0">
                  <td className="whitespace-nowrap px-5 py-3 font-semibold">{k}</td>
                  <td className="px-3 py-3"><code dir="ltr" className="num block rounded-lg bg-brand-soft px-2 py-1 text-left text-xs text-brand">{f}</code></td>
                  <td className="px-5 py-3 text-slate-600">{m}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <div className="space-y-5">
          {controls(tr).map(([title, items]) => (
            <Card key={title} title={`${tr("رقابة", "Checks")}: ${title}`}>
              <ul className="space-y-2 text-sm text-slate-600">
                {items.map((t) => <li key={t} className="flex gap-2"><span className="text-brand">✓</span>{t}</li>)}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
