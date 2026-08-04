export interface DesignVariant {
  label: string;
  size: string;
  beds?: string;
  baths?: string;
  cars?: string;
}

export interface DesignLookup {
  design: string;
  link: string;
  variants: DesignVariant[];
}

const SITE = "https://www.hudsonhomes.com.au";

function normalise(v: string) {
  return v
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "Hudson 28 — Aspire Facade" -> ["hudson 28 aspire facade", "hudson", "aspire", ...] */
function candidateWords(name: string) {
  return normalise(name)
    .split(" ")
    .filter((w) => w.length > 2 && !/^\d+$/.test(w) && w !== "facade" && w !== "hudson");
}

function decode(html: string) {
  return html
    .replace(/&sup2;/g, "²")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseVariants(html: string): DesignVariant[] {
  const out: DesignVariant[] = [];
  const blocks = html.split("class='s1-title'").slice(1);
  for (const raw of blocks) {
    const end = raw.indexOf("</h5>");
    const label = decode(raw.slice(0, end > 0 ? end : 120));
    if (!label) continue;
    const seg = raw.slice(0, 6000);
    const total = /Total Area<span>([^<]+)<\/span>/.exec(seg);
    const beds = /s1-icon-bed'>(\d+)/.exec(seg);
    const baths = /s1-icon-bath'>(\d+)/.exec(seg);
    const cars = /s1-icon-garage'>(\d+)/.exec(seg);
    out.push({
      label: label.replace(/^>/, "").trim(),
      size: total ? decode(total[1]) : "",
      beds: beds?.[1],
      baths: baths?.[1],
      cars: cars?.[1],
    });
  }
  return out.filter((v) => v.size);
}

export async function lookupDesign(input: { data: { name: string } }): Promise<DesignLookup | null> {
  const name = String(input?.data?.name ?? "");
  const words = candidateWords(name);
  if (!words.length) return null;

  try {
    const listRes = await fetch(
      `${SITE}/wp-json/wp/v2/homes?per_page=100&_fields=slug,title,link`,
      { headers: { accept: "application/json" } }
    );
    if (!listRes.ok) return null;
    const homes = (await listRes.json()) as {
      slug: string;
      link: string;
      title: { rendered: string };
    }[];

    let best: { home: (typeof homes)[number]; score: number } | null = null;
    for (const home of homes) {
      const title = normalise(home.title?.rendered ?? "");
      let score = 0;
      for (const w of words) {
        if (title === w) score += 10;
        else if (title.split(" ").includes(w)) score += 6;
        else if (title.includes(w)) score += 3;
      }
      if (score > (best?.score ?? 0)) best = { home, score };
    }
    if (!best) return null;

    const pageRes = await fetch(best.home.link);
    if (!pageRes.ok) return null;
    const html = await pageRes.text();

    return {
      design: decode(best.home.title.rendered),
      link: best.home.link,
      variants: parseVariants(html),
    };
  } catch {
    return null;
  }
}
