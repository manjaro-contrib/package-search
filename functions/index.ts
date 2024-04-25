import z from "zod";

export type Env = {
  PACKAGES: D1Database;
};

const inputValidator = z.object({
  search: z.string().min(1),
});

export const onRequest: PagesFunction<Env> = async (context) => {
  const params = new URL(context.request.url).searchParams;

  const input = inputValidator.safeParse({
    search: params.get("search"),
  });

  if (!input.success) {
    return Response.json(input.error, { status: 400 });
  }
  const { search } = input.data;

  const result = await context.env.PACKAGES.prepare(
    "SELECT * FROM packages WHERE name LIKE ?;"
  )
    .bind(`%${search}%`)
    .run();

  return Response.json(result);
};
