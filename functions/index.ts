import { Kysely, sql } from "kysely";
import { D1Dialect } from "kysely-d1";
import z from "zod";

export type Env = {
  PACKAGES: D1Database;
};

const archs = ["x86_64", "aarch64"] as const;
const branches = ["stable", "testing", "unstable"] as const;
const repos = ["core", "extra", "multilib"] as const;

interface Table {
  arch: (typeof archs)[number];
  branch: (typeof branches)[number];
  repo: (typeof repos)[number];
  name: string;
  version: string;
  description: string;
  builddate: string;
}

interface Database {
  packages: Table;
}

export const getDB = (env: Env) => {
  return new Kysely<Database>({
    dialect: new D1Dialect({ database: env.PACKAGES }),
  });
};

export const archValidator = z.enum(["x86_64", "aarch64"]);
export const branchValidator = z.enum(["stable", "testing", "unstable"]);
export const repoValidator = z.enum(["core", "extra", "multilib"]);

const inputValidator = z.object({
  search: z.string().min(3),
  arch: z.array(archValidator),
  branch: z.array(branchValidator),
});

export const onRequest: PagesFunction<Env> = async (context) => {
  const db = getDB(context.env);

  const params = new URL(context.request.url).searchParams;

  const input = inputValidator.safeParse({
    search: params.get("search") ?? undefined,
    arch: params.getAll("arch") ?? undefined,
    branch: params.getAll("branch") ?? undefined,
  });

  if (!input.success) {
    return Response.json(input.error, { status: 400 });
  }
  const { search, arch, branch } = input.data;

  const name = search;
  const nameStart = `${search}%`;
  const nameContains = `%${search}%`;

  let query = db.selectFrom("packages").selectAll();
  query = query.select(({ fn, ref, val }) =>
    fn<string>("strftime", [sql`'%Y-%m-%dT%H:%M:%fZ'`, 'builddate', sql`'unixepoch'`]).as(
      "builddate"
    )
  );
  query = query.limit(100);
  query = query.where("arch", "in", arch);
  query = query.where("branch", "in", branch);
  query = query.where((eb) =>
    eb.or([
      eb("name", "=", name),
      eb("name", "like", nameStart),
      eb("name", "like", nameContains),
    ])
  );
  query = query.orderBy(
    sql`(0 - (name LIKE ${nameStart}) + (name LIKE ${nameContains})) || name`
  );
  console.log(query.compile().parameters, query.compile().sql);

  const result = await query.execute();

  return Response.json(result);
};
