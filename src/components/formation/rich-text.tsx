import { Fragment } from "react";

/** Espaces insécables de la typographie française : « » : ; ? ! ne restent jamais seuls en début de ligne. */
export const frenchSpacing = (s: string) =>
  s.replace(/« /g, "« ").replace(/ »/g, " »").replace(/ ([:;?!])/g, " $1");

/** Rend les marques en ligne du contenu de formation : **gras** et *italique*. */
export function RichText({ text }: { text: string }) {
  const parts = frenchSpacing(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
