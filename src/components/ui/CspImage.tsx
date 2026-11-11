import { getImageProps, type ImageProps } from "next/image";

/**
 * next/image, minus one thing: the component writes `style="color:transparent"`
 * on every <img>, and this site's CSP (nonce-only style-src) blocks inline style
 * attributes. getImageProps keeps the optimisation (resized srcset, sizes, lazy
 * loading, async decoding); we just render the <img> without that attribute.
 */
export function CspImage(props: ImageProps) {
  const imgProps: React.ComponentProps<"img"> = { ...getImageProps(props).props };
  delete imgProps.style;
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- props come from getImageProps, alt included
  return <img {...imgProps} />;
}
