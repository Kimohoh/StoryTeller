/** 유형 이름이 작품마다 바뀌므로 조사를 문장에 박아둘 수 없다. 받침을 보고 고른다. */
export function josa(word: string, pair: "와/과" | "은/는" | "이/가" | "을/를"): string {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);
  const isHangul = code >= 0xac00 && code <= 0xd7a3;
  const hasFinal = isHangul ? (code - 0xac00) % 28 !== 0 : true;
  const [withFinal, withoutFinal] = {
    "와/과": ["과", "와"],
    "은/는": ["은", "는"],
    "이/가": ["이", "가"],
    "을/를": ["을", "를"],
  }[pair];
  return word + (hasFinal ? withFinal : withoutFinal);
}
