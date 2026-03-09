import { z } from "zod";

const httpUrl = z.url({
  protocol: /^https?$/,
  hostname: z.regexes.domain,
});
const mailtoUrl = z.url({ protocol: /^mailto$/ });
const telUrl = z.url({ protocol: /^tel$/ });
export const linkUrlSchema = z.union([httpUrl, mailtoUrl, telUrl]);

export function isValidLinkUrl(url) {
  return linkUrlSchema.safeParse(url).success;
}
