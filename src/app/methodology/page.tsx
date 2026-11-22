import AppShell from "@/components/AppShell";
import { Card, PageTitle } from "@/components/ui/kit";
import { requireUser } from "@/lib/current-user";

export const instant = false;

const ROWS: [string, string, string][] = [
  ["Planned % (نشاط)", "(Data Date − Early Start) ÷ (Early Finish − Early Start)", "توزيع خطي: النشاط بيتقدم بنفس المعدل كل يوم من بدايته لنهايته. قبل البداية 0%، وبعد النهاية 100%."],
  ["الوزن", "Budget Cost ÷ Σ Budget Cost", "كل نشاط بيأثر على نسبة المشروع حسب ميزانيته."],
  ["BAC", "Σ Budget Cost", "الميزانية الكلية للأنشطة المختارة."],
  ["PV", "Σ (Budget × Planned %)", "قيمة الشغل اللي كان لازم يكون منجز لـ Data Date."],
  ["EV", "Σ (Budget × Actual %)", "قيمة الشغل المنجز فعلياً، محسوبة بأسعار الميزانية."],
  ["AC", "Σ Actual Cost", "المصروف الفعلي التراكمي اللي سجّله المهندس."],
  ["Planned % (مشروع)", "PV ÷ BAC", "نسبة الإنجاز المخططة الموزونة."],
  ["Actual % (مشروع)", "EV ÷ BAC", "نسبة الإنجاز الفعلية الموزونة."],
  ["SV", "EV − PV", "سالب = متأخرين بقيمة الشغل."],
  ["CV", "EV − AC", "سالب = صرفنا أكتر من قيمة الشغل المنجز."],
  ["SPI", "EV ÷ PV", "أقل من 1 = أبطأ من الخطة."],
  ["CPI", "EV ÷ AC", "أقل من 1 = فوق الميزانية."],
  ["EAC", "BAC ÷ CPI", "التكلفة المتوقعة عند الانتهاء إذا ضل أداء التكلفة نفسه."],
  ["EAC (CPI×SPI)", "AC + (BAC − EV) ÷ (CPI × SPI)", "تقدير أكثر تحفّظاً، بياخد الجدول والتكلفة مع بعض."],
  ["ETC", "EAC − AC", "المبلغ اللي لسا لازم ينصرف."],
  ["VAC", "BAC − EAC", "سالب = رح نتجاوز الميزانية بهالقيمة."],
  ["TCPI", "(BAC − EV) ÷ (BAC − AC)", "الكفاءة المطلوبة بالباقي حتى نخلص ضمن الميزانية. أكبر من 1 = صعب."],
  ["Earned Schedule (ES)", "التاريخ t اللي فيه PV(t) = EV", "بندوّر على الخطة لنلاقي اليوم اللي كان المفروض نوصل فيه للإنجاز الحالي."],
  ["التأخير (يوم)", "ES − Data Date", "سالب = متأخر بهالعدد من الأيام."],
  ["الانتهاء المتوقع", "Contract Finish − Delay", "بيفترض إنه التأخير الحالي ثابت لآخر المشروع."],
];

const CONTROLS = [
  ["الأنشطة", [
    "رمز النشاط مطلوب وما بيتكرر بنفس المشروع.",
    "الميزانية لازم تكون أكبر من صفر، والساعات صفر أو أكتر.",
    "Early Finish ≥ Early Start، وLate Finish ≥ Late Start.",
    "Late Start ≥ Early Start، وLate Finish ≥ Early Finish.",
    "تحذير إذا النشاط برا مدة العقد، أو إذا عدّلت نشاط إله تقدم مسجّل.",
  ]],
  ["تحديثات التقدم", [
    "Data Date ما بيكون بالمستقبل ولا قبل بداية العقد.",
    "التحديث الجديد لازم يكون بعد آخر تحديث (أو بتعدّل تاريخ موجود).",
    "Actual % بين 0 و100، وتراكمي: ما بينزل عن التحديث السابق ولا بيطلع عن اللي بعده.",
    "التكلفة الفعلية تراكمية: ما بتنزل عن التحديث السابق.",
    "تحذيرات بدها تأكيد: تكلفة بدون إنجاز، إنجاز بدون تكلفة، قفزة أكبر من 40%، تكلفة أكتر من 150% من EV أو 125% من الميزانية، إنجاز قبل البداية المخططة.",
  ]],
  ["السجل", [
    "كل إضافة أو تعديل أو حذف بينسجّل باسم المستخدم ووقته، وبتشوفه من «الإعدادات والسجل».",
  ]],
] as const;

export default async function MethodologyPage() {
  const user = await requireUser();
  return (
    <AppShell user={user}>
      <PageTitle title="طريقة الحساب" subtitle="كل رقم بالتطبيق محسوب من بياناتك بهالمعادلات، بدون أي تقدير مخفي" />
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Card title="المعادلات" pad={false}>
          <table className="w-full text-sm">
            <tbody>
              {ROWS.map(([k, f, m]) => (
                <tr key={k} className="border-t border-line first:border-t-0 align-top">
                  <td className="whitespace-nowrap px-5 py-3 font-semibold">{k}</td>
                  <td className="px-3 py-3"><code className="num block rounded-lg bg-brand-soft px-2 py-1 text-left text-xs text-brand">{f}</code></td>
                  <td className="px-5 py-3 text-slate-600">{m}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <div className="space-y-5">
          {CONTROLS.map(([title, items]) => (
            <Card key={title} title={`رقابة: ${title}`}>
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
