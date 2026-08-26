/**
 * md 본문의 인라인 표기만 처리한다.
 * 정본이 쓰는 건 *강조*(그레고르의 속말)와 `원어` 둘뿐이다.
 */
export function Prose({ paragraphs, className }: { paragraphs: string[]; className?: string }) {
  return (
    <div className={className ?? "prose"}>
      {paragraphs.map((p, i) => (
        <p key={i}>{renderInline(p)}</p>
      ))}
    </div>
  );
}

function renderInline(text: string): React.ReactNode[] {
  return text.split(/(\*[^*]+\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return <span className="term" key={i}>{part.slice(1, -1)}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}
