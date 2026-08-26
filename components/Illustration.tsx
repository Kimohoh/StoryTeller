/**
 * 호출부는 이것 하나로 통일한다 — <Illustration k="p3_door_opens" />
 * type이 svg면 인라인, 아니면 <img>. 부르는 쪽은 무엇이 걸려 있는지 모른다.
 */
import { entry, inlineSvg, publicUrl } from "@/lib/illustrations";

export function Illustration({ k, className }: { k: string | null; className?: string }) {
  if (!k) return null;
  const e = entry(k);
  if (!e) {
    if (process.env.NODE_ENV !== "production") {
      throw new Error(`manifest에 없는 삽화 키: ${k}`);
    }
    return null;
  }

  if (e.type === "svg") {
    return (
      <figure className={className} data-illustration={k}>
        <div
          role="img"
          aria-label={e.alt}
          dangerouslySetInnerHTML={{ __html: inlineSvg(e) }}
        />
        {e.credit ? <figcaption>{e.credit}</figcaption> : null}
      </figure>
    );
  }

  return (
    <figure className={className} data-illustration={k}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={publicUrl(k, e)} alt={e.alt} loading="lazy" />
      {e.credit ? <figcaption>{e.credit}</figcaption> : null}
    </figure>
  );
}
