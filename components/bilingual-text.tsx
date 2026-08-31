import translations from '@/data/detail-translations.zh-CN.json';

const translationMap = translations as Record<string, string>;

export function BilingualText({ text, translationClassName = 'mt-1 text-[0.92em] leading-[1.65] text-[#748187]' }: { text: string; translationClassName?: string }) {
  const translation = translationMap[text];
  if (!translation || translation === text || /[\u3400-\u9fff]/.test(text)) return <>{text}</>;
  return <span className="block"><span className="block" lang="en">{text}</span><span className={`block ${translationClassName}`} lang="zh-CN">{translation}</span></span>;
}
