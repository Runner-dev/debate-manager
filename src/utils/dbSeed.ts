import { z } from "zod";
export const dbSeedSchema = z.object({
  committees: z.array(
    z.object({
      name: z.string().nonempty(),
      countries: z.array(
        z.object({
          name: z.string().trim().nonempty(),
          shortName: z.string().trim().nonempty().optional(),
          flag: z.string().trim().url(),
          delegates: z.array(
            z.object({
              code: z.string(),
              name: z.string(),
            })
          ),
        })
      ),
    })
  ),
});
