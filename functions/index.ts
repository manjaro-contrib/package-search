import z from "zod";

export type Env = {
  PACKAGES: D1Database;
};

export const archValidator = z.enum(["x86_64", "aarch64"]);
export const branchValidator = z.enum(["stable", "testing", "unstable"]);
export const repoValidator = z.enum(["core", "extra", "multilib"]);

const inputValidator = z.object({
  search: z.string().min(3),
  arch: archValidator.optional().default("x86_64"),
  branch: branchValidator.optional().default("stable"),
});

export const onRequest: PagesFunction<Env> = async (context) => {
  const params = new URL(context.request.url).searchParams;

  const input = inputValidator.safeParse({
    search: params.get("search") ?? undefined,
    arch: params.get("arch") ?? undefined,
    branch: params.get("branch") ?? undefined,
  });

  if (!input.success) {
    return Response.json(input.error, { status: 400 });
  }
  const { search, arch, branch } = input.data;

  const result = await context.env.PACKAGES.prepare(
    "SELECT * FROM packages WHERE arch = ? AND branch = ? AND (name LIKE ? OR name LIKE ?) ORDER BY (0 - (name LIKE ?) + (name LIKE ?)) || name  LIMIT 100;"
  )
    .bind(
      arch,
      branch,
      `${search}%`,
      `%${search}%`,
      `${search}%`,
      `%${search}%`
    )
    .run();

  if (result.error) {
    return Response.json(
      {
        success: false,
        error: result.error,
      },
      {
        status: 500,
        headers: {
          "content-type": "application/json",
        },
      }
    );
  }

  return Response.json(result["results"]);
};
