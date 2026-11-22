import { buildTemplate } from "@/lib/excel";
import { sampleProject } from "@/lib/sample";

// GET /template          -> empty template
// GET /template?example  -> template filled with demo data
export async function GET(req: Request) {
  const withExample = new URL(req.url).searchParams.has("example");
  let buf: Buffer;
  if (withExample) {
    const p = sampleProject();
    buf = await buildTemplate(p.activities, p.dataDates);
  } else {
    buf = await buildTemplate();
  }
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="hsdevapp-template${withExample ? "-example" : ""}.xlsx"`,
    },
  });
}
