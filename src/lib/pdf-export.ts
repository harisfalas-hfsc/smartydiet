import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";
import logoUrl from "@/assets/smartydiet-logo.png";
import { mealSlotsFor, verifyPlanStructure } from "@/lib/plan-validation";
import { assertGroceryExportable, prepareGroceryWeeks } from "@/lib/pdf-document-model";

const PRIMARY = "#38b6ff";
const PRIMARY_DARK = "#0284c7";
const INK = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const BG_SOFT = "#f0f9ff";
const PAGE_WIDTH = 720;
const PAGE_HEIGHT = 1018;
const HEADER_HEIGHT = 88;
const FOOTER_HEIGHT = 46;
const CONTENT_PADDING_Y = 22;
const CONTENT_HEIGHT = PAGE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT - CONTENT_PADDING_Y * 2;

function esc(s: unknown) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function shell(bodyHtml: string, title: string, logoSrc: string, pageNumber: number, pageCount: number) {
  return `
  <div style="
    width:${PAGE_WIDTH}px;height:${PAGE_HEIGHT}px;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
    color:${INK};background:#ffffff;display:flex;flex-direction:column;overflow:hidden;">
    <div style="height:88px;box-sizing:border-box;background:linear-gradient(135deg,${PRIMARY} 0%,${PRIMARY_DARK} 100%);
      padding:16px 30px;display:flex;align-items:center;gap:14px;">
      <div style="width:48px;height:48px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;flex:0 0 48px;background:#fff;border-radius:12px;padding:5px;box-shadow:0 3px 10px rgba(15,23,42,0.16);">
        <img src="${logoSrc}" alt="SmartyDiet apple" style="display:block;width:34px;height:38px;object-fit:contain;"/>
      </div>
      <div style="min-width:0;">
        <div style="color:#fff;font-size:23px;font-weight:800;letter-spacing:0;line-height:1.1;">SmartyDiet</div>
        <div style="color:rgba(255,255,255,0.92);font-size:12px;font-weight:600;margin-top:4px;">${esc(title)}</div>
      </div>
      <div style="margin-left:auto;color:#fff;font-size:12px;font-weight:700;">smartydiet.com</div>
    </div>
    <div style="height:${PAGE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT}px;box-sizing:border-box;padding:${CONTENT_PADDING_Y}px 30px;overflow:hidden;">${bodyHtml}</div>
    <div style="height:46px;box-sizing:border-box;padding:13px 30px;color:${MUTED};font-size:10px;border-top:1px solid ${BORDER};display:flex;justify-content:space-between;align-items:center;">
      <span>Personalized nutrition by SmartyDiet</span>
      <span>smartydiet.com&nbsp;&nbsp;·&nbsp;&nbsp;Page ${pageNumber} of ${pageCount}</span>
    </div>
  </div>`;
}

async function imageAsDataUrl(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) return url;
    const blob = await response.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : url);
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

async function renderToPdf(bodyHtml: string, title: string, filename: string) {
  const holder = document.createElement("div");
  holder.style.cssText =
    "position:fixed;left:-10000px;top:0;width:660px;background:#fff;z-index:-1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";
  holder.innerHTML = bodyHtml;
  document.body.appendChild(holder);

  try {
    await document.fonts.ready;
    const blocks = Array.from(holder.children) as HTMLElement[];
    const pages: string[][] = [[]];
    let usedHeight = 0;
    let weekContext = "";
    let sectionContext = "";

    const continuationHtml = () => weekContext
      ? `<div data-pdf-block="true" style="display:flex;justify-content:space-between;align-items:baseline;margin:0 0 12px;padding:7px 10px;border-left:4px solid ${PRIMARY};background:${BG_SOFT};font-size:13px;font-weight:800;color:${PRIMARY_DARK};">
          <span>${esc(weekContext)} &mdash; continued</span>
          ${sectionContext ? `<span style="font-size:10px;color:${MUTED};font-weight:700;">${esc(sectionContext)}</span>` : ""}
        </div>`
      : "";

    const measureHtml = (html: string) => {
      if (!html) return 0;
      const measure = document.createElement("div");
      measure.innerHTML = html;
      holder.appendChild(measure);
      const height = Math.ceil(measure.getBoundingClientRect().height);
      measure.remove();
      return height;
    };
    const outerHeight = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      const styles = window.getComputedStyle(element);
      return Math.ceil(
        rect.height +
        (Number.parseFloat(styles.marginTop) || 0) +
        (Number.parseFloat(styles.marginBottom) || 0),
      );
    };

    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index];
      if (!block) continue;
      if (block.dataset.pdfWeekContext) {
        weekContext = block.dataset.pdfWeekContext;
        sectionContext = "";
      }
      if (block.dataset.pdfSectionContext) sectionContext = block.dataset.pdfSectionContext;
      const blockHeight = outerHeight(block);
      const nextBlock = blocks[index + 1];
      const nextHeight = block.dataset.pdfKeepNext === "true" && nextBlock
        ? outerHeight(nextBlock)
        : 0;
      const requiredHeight = blockHeight + nextHeight;
      const currentPage = pages[pages.length - 1];
      if (!currentPage) continue;

      if (blockHeight > CONTENT_HEIGHT) {
        throw new Error(`A PDF section is too tall to fit on one page (${blockHeight}px).`);
      }

      if (currentPage.length > 0 && usedHeight + requiredHeight > CONTENT_HEIGHT) {
        pages.push([]);
        usedHeight = 0;
        if (!block.dataset.pdfWeekContext) {
          const continuation = continuationHtml();
          const continuationHeight = measureHtml(continuation);
          const newPage = pages[pages.length - 1];
          if (newPage && continuation && continuationHeight + blockHeight <= CONTENT_HEIGHT) {
            newPage.push(continuation);
            usedHeight += continuationHeight;
          }
        }
      }

      const targetPage = pages[pages.length - 1];
      if (!targetPage) continue;
      targetPage.push(block.outerHTML);
      usedHeight += blockHeight;
    }

    const logoSrc = await imageAsDataUrl(logoUrl);
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
      const page = document.createElement("div");
      page.style.cssText = `position:fixed;left:-10000px;top:0;width:${PAGE_WIDTH}px;height:${PAGE_HEIGHT}px;background:#fff;z-index:-1;`;
      page.innerHTML = shell(
        pages[pageIndex]?.join("") ?? "",
        title,
        logoSrc,
        pageIndex + 1,
        pages.length,
      );
      document.body.appendChild(page);
      const canvas = await html2canvas(page, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
      });
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.94), "JPEG", 0, 0, pageW, pageH);
      page.remove();
    }

    pdf.save(filename);
  } finally {
    holder.remove();
  }
}

function rulesBlock(plan: any, durationWeeks: number) {
  const s = plan?.summary ?? {};
  const weeks: any[] = plan?.weeks ?? [];
  const expectedWeeks = Number(s.weeks) || weeks.length || durationWeeks;
  const mealsPerDay =
    Number(s.mealsPerDay) || Number(weeks[0]?.days?.[0]?.meals?.length) || 3;
  const slots: string[] = s.mealSlots?.length ? s.mealSlots : mealSlotsFor(mealsPerDay);
  const snacks = slots.filter((slot: string) => slot.toLowerCase().includes("snack"));
  const report = verifyPlanStructure(plan, expectedWeeks, mealsPerDay);
  const okColor = report.ok ? "#15803d" : "#b91c1c";
  const okBg = report.ok ? "#f0fdf4" : "#fef2f2";
  const row = (label: string, value: string) => `
    <div style="min-width:120px;">
      <div style="font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:0.06em;">${esc(label)}</div>
      <div style="font-size:13px;font-weight:600;color:${INK};margin-top:2px;">${esc(value)}</div>
    </div>`;
  return `
    <div data-pdf-block="true" style="border:1px solid ${BORDER};border-left:4px solid ${okColor};border-radius:10px;
      background:${okBg};padding:14px 16px;margin-bottom:20px;">
      <div style="font-size:14px;font-weight:800;color:${okColor};">
        ${report.ok ? "Plan verified &mdash; complete" : "Plan incomplete"}
      </div>
      <div style="font-size:11px;color:${MUTED};margin-top:3px;">
        ${report.weeks}/${report.expectedWeeks} weeks · ${report.totalDays}/${report.expectedDays} days · ${mealsPerDay} meals every day
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:14px 26px;margin-top:12px;padding-top:12px;border-top:1px solid ${BORDER};">
        ${row("Duration", `${expectedWeeks} week${expectedWeeks === 1 ? "" : "s"}`)}
        ${row("Days per week", "7")}
        ${row("Meals per day", String(mealsPerDay))}
        ${row("Snacks per day", String(snacks.length))}
      </div>
      <div style="margin-top:10px;font-size:11px;color:${INK};">
        <b>Daily meal order:</b> ${esc(slots.join(" · "))}
      </div>
      ${s.fastingWindow ? `<div style="margin-top:4px;font-size:11px;color:${INK};"><b>Fasting window:</b> ${esc(s.fastingWindow)}</div>` : ""}
      ${s.excludeFoods?.length ? `<div style="margin-top:4px;font-size:11px;color:${INK};"><b>Excluded foods:</b> ${esc(s.excludeFoods.join(", "))}</div>` : ""}
    </div>`;
}

export async function exportPlanPdf(plan: any, durationWeeks: number) {
  const s = plan?.summary;
  const summary = s
    ? `
      <div data-pdf-block="true" style="background:${BG_SOFT};border:1px solid ${BORDER};border-radius:10px;padding:16px;margin-bottom:20px;">
        <div style="font-size:26px;font-weight:800;color:${PRIMARY_DARK};">${esc(s.calorieTarget)} kcal <span style="font-size:14px;color:${MUTED};font-weight:500;">/ day</span></div>
        <div style="margin-top:6px;font-size:13px;color:${INK};">
          <span style="display:inline-block;background:#fff;border:1px solid ${BORDER};border-radius:999px;padding:3px 10px;margin-right:6px;">Protein ${esc(s.macros?.protein_g)}g</span>
          <span style="display:inline-block;background:#fff;border:1px solid ${BORDER};border-radius:999px;padding:3px 10px;margin-right:6px;">Carbs ${esc(s.macros?.carbs_g)}g</span>
          <span style="display:inline-block;background:#fff;border:1px solid ${BORDER};border-radius:999px;padding:3px 10px;">Fat ${esc(s.macros?.fat_g)}g</span>
        </div>
        <div style="margin-top:10px;font-size:12px;color:${MUTED};text-transform:uppercase;letter-spacing:0.06em;">
          ${esc(s.dietStyle)} · ${esc(s.goal)}
        </div>
      </div>`
    : "";

  const weeksHtml = (plan?.weeks ?? [])
    .map(
      (w: any) => `
        <div data-pdf-block="true" data-pdf-keep-next="true" data-pdf-week-context="Week ${esc(w.weekNumber)}" style="font-size:18px;font-weight:800;color:${PRIMARY_DARK};margin:8px 0 12px;
          border-left:4px solid ${PRIMARY};padding:4px 0 4px 10px;">Week ${esc(w.weekNumber)}</div>
        ${(w.days ?? [])
          .map(
            (d: any) => `
          <div data-pdf-block="true" data-pdf-keep-next="true" data-pdf-section-context="Day ${esc(d.day)}" style="border:1px solid ${BORDER};border-bottom:0;border-radius:10px 10px 0 0;padding:11px 13px 9px;background:#fff;margin-top:8px;">
            <div style="display:flex;justify-content:space-between;align-items:baseline;">
              <div style="font-weight:700;font-size:15px;color:${INK};">Week ${esc(w.weekNumber)} &middot; Day ${esc(d.day)}</div>
              <div style="font-size:12px;color:${MUTED};font-weight:600;">${esc(d.totals?.calories ?? "-")} kcal</div>
            </div>
          </div>
            ${(d.meals ?? [])
              .map(
                (m: any, mealIndex: number, meals: any[]) => `
              <div data-pdf-block="true" style="background:${BG_SOFT};border:1px solid ${BORDER};border-top-color:#fff;
                border-radius:${mealIndex === meals.length - 1 ? "0 0 10px 10px" : "0"};padding:10px 12px;
                margin-bottom:${mealIndex === meals.length - 1 ? "12px" : "0"};">
                <div style="display:flex;justify-content:space-between;gap:10px;">
                  <div style="font-weight:600;font-size:13px;color:${INK};">
                    <span style="color:${PRIMARY_DARK};">${esc(m.name)}:</span> ${esc(m.title)}
                  </div>
                  <div style="font-size:11px;color:${MUTED};white-space:nowrap;">
                    Week ${esc(w.weekNumber)} · Day ${esc(d.day)} ·
                    ${esc(m.calories)} kcal · P${esc(m.protein_g)} C${esc(m.carbs_g)} F${esc(m.fat_g)}
                  </div>
                </div>
                ${
                  m.ingredients?.length
                    ? `<div style="margin-top:6px;font-size:11px;color:${MUTED};">${esc(
                        m.ingredients.map((i: any) => `${i.qty} ${i.item}`).join(", "),
                      )}</div>`
                    : ""
                }
                ${
                  m.instructions
                    ? `<div style="margin-top:4px;font-size:11px;color:${INK};">${esc(m.instructions)}</div>`
                    : ""
                }
              </div>`,
              )
              .join("")}
          `,
          )
          .join("")}
      `,
    )
    .join("");

  const rationale = plan?.rationale
    ? `<div data-pdf-block="true" style="border:1px solid ${BORDER};border-radius:10px;padding:14px;margin-top:12px;background:#fff;">
        <div style="font-weight:700;color:${PRIMARY_DARK};margin-bottom:6px;">Why this plan fits you</div>
        <div style="font-size:12px;color:${INK};line-height:1.6;">${esc(plan.rationale)}</div>
      </div>`
    : "";

  const disclaimer = plan?.disclaimer
    ? `<div data-pdf-block="true" style="margin-top:14px;font-size:10px;color:${MUTED};line-height:1.5;">${esc(plan.disclaimer)}</div>`
    : "";

  const body = rulesBlock(plan, durationWeeks) + summary + weeksHtml + rationale + disclaimer;
  await renderToPdf(body, `Your ${durationWeeks}-week personalized plan`, "smartydiet-plan.pdf");
}

export async function exportGroceryPdf(plan: any) {
  const groceryWeeks = prepareGroceryWeeks(plan);
  assertGroceryExportable(plan, groceryWeeks);
  const weekCount = groceryWeeks.length;
  const weeksHtml = groceryWeeks.map((week) => {
    const categories = week.categories.map((category) => {
      const rows = category.items.map((item) => `
        <div data-pdf-block="true" style="display:grid;grid-template-columns:18px 120px 1fr;align-items:start;column-gap:9px;padding:8px 10px;border:1px solid ${BORDER};border-radius:6px;background:#fff;font-size:12px;line-height:1.35;margin-bottom:6px;">
          <span style="display:block;width:13px;height:13px;border:2px solid ${PRIMARY};border-radius:3px;box-sizing:border-box;margin-top:1px;"></span>
          <b style="color:${PRIMARY_DARK};">${esc(item.qty)}</b>
          <span style="color:${INK};">${esc(item.item)} <small style="display:block;margin-top:2px;color:${MUTED};font-size:9px;">Week ${week.weekNumber} · ${esc(category.name)}</small></span>
        </div>`).join("");
      return `
        <div data-pdf-block="true" data-pdf-keep-next="true" data-pdf-section-context="${esc(category.name)}" style="display:flex;justify-content:space-between;align-items:center;margin:13px 0 7px;padding-bottom:5px;border-bottom:1px solid ${BORDER};">
          <span style="font-size:13px;font-weight:800;color:${INK};">${esc(category.name)}</span>
          <span style="font-size:10px;font-weight:700;color:${MUTED};">${category.items.length} item${category.items.length === 1 ? "" : "s"}</span>
        </div>
        ${rows}`;
    }).join("");
    return `
      <div data-pdf-block="true" data-pdf-keep-next="true" data-pdf-week-context="Week ${week.weekNumber}" style="display:flex;justify-content:space-between;align-items:baseline;font-size:18px;font-weight:800;color:${PRIMARY_DARK};margin:8px 0 12px;border-left:4px solid ${PRIMARY};padding:4px 0 4px 10px;">
        <span>Week ${week.weekNumber}</span>
        <span style="font-size:11px;color:${MUTED};font-weight:700;">${week.itemCount} grocery item${week.itemCount === 1 ? "" : "s"}</span>
      </div>
      ${categories}`;
  }).join("");

  await renderToPdf(
    rulesBlock(plan, weekCount) + weeksHtml,
    "Your printable grocery list",
    "smartydiet-grocery.pdf",
  );
}
