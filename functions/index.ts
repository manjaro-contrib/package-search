import { Kysely, ParseJSONResultsPlugin, sql } from "kysely";
import { D1Dialect } from "kysely-d1";
import z from "zod";

export type Env = {
  PACKAGES: D1Database;
};

const archs = ["x86_64", "aarch64"] as const;
const branches = ["stable", "testing", "unstable", "upstream_stable"] as const;
const repos = ["core", "extra", "multilib"] as const;

type Table = {
  name: string;
  arch: (typeof archs)[number];
  branch: (typeof branches)[number];
  repo: (typeof repos)[number];
  raw_data: string;
};

interface Database {
  packages: Table;
}

export const getDB = (env: Env) => {
  return new Kysely<Database>({
    dialect: new D1Dialect({ database: env.PACKAGES }),
    plugins: [new ParseJSONResultsPlugin()],
  });
};

export const archValidator = z.enum(archs);
export const branchValidator = z.enum(branches);
export const repoValidator = z.enum(repos);

const inputValidator = z.object({
  q: z.string().min(3),
  arch: archValidator.default("x86_64"),
  page: z.number().int().min(1).optional().default(1),
  size: z.number().int().min(1).max(50).optional().default(10),
});

export const onRequest: PagesFunction<Env> = async (context) => {
  const cache = caches.default;
  const response = await cache.match(context.request);

  if (response) {
    console.info("cache hit");
    return response;
  }

  const db = getDB(context.env);

  const params = new URL(context.request.url).searchParams;

  const input = inputValidator.safeParse({
    q: params.get("q") ?? undefined,
    arch: params.get("arch") ?? undefined,
    page: params.get("page") ? Number(params.get("page")) : undefined,
    size: params.get("size") ? Number(params.get("size")) : undefined,
  });

  if (!input.success) {
    return Response.json(input.error, { status: 400 });
  }
  const { q, page, size } = input.data;

  const name = q;
  const nameStart = `${q}%`;
  const nameContains = `%${q}%`;

  let query = db.selectFrom("packages").select(["name"]);

  for (const arch of archs) {
    for (const branch of branches) {
      query = query.select((eb) =>
        eb
          .selectFrom(`packages as p`)
          .select("p.raw_data")
          .whereRef("p.name", "=", "packages.name")
          .where("p.branch", "=", branch)
          .where("p.arch", "=", arch)
          .as(`${branch}_${arch}`)
      );
    }
  }
  query = query.limit(size);
  query = query.offset((page - 1) * size);
  query = query.where((eb) =>
    eb.or([
      eb("name", "=", name),
      eb("name", "like", nameStart),
      eb("name", "like", nameContains),
    ])
  );
  query = query.distinct();
  query = query.orderBy(
    sql`(0 - (name LIKE ${nameStart}) + (name LIKE ${nameContains})) || name`
  );

  const result = await query.execute();

  return Response.json({result, hasNext: result.length === size }, {
    headers: {
      "content-type": "application/json",
      "Cache-Control": `public, max-age=${60 * 5}, s-maxage=${60 * 5}, stale-while-revalidate=${60 * 10}`,
    },
  });
};
