/**
 * 호출부는 이것 하나로 통일한다 — <Illustration work="metamorphosis" k="p3_door_opens" />
 * type이 svg면 인라인, 아니면 <img>. 부르는 쪽은 무엇이 걸려 있는지 모른다.
 */
import { entry, inlineSvg, publicUrl } from "@/lib/illustrations";

export function Illustration({
  work,
  k,
  className,
  priority,
}: {
  work: string;
  k: string | null;
  className?: string;
  /** 첫 화면을 채우는 그림이면 미리 받는다 */
  priority?: boolean;
}) {
  if (!k) return null;
  const e = entry(work, k);
  if (!e) {
    if (process.env.NODE_ENV !== "production") {
      throw new Error(`manifest의 ${work}에 없는 삽화 키: ${k}`);
    }
    return null;
  }

  const caption = e.credit ? <figcaption>{e.credit}</figcaption> : null;

  if (e.type === "svg") {
    return (
      <figure className={className} data-illustration={k}>
        <div role="img" aria-label={e.alt} dangerouslySetInnerHTML={{ __html: inlineSvg(e) }} />
        {caption}
      </figure>
    );
  }

  return (
    <figure className={className} data-illustration={k}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={publicUrl(work, k, e)}
        alt={e.alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
      />
      {caption}
    </figure>
  );
}
