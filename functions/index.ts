import { Kysely, sql } from "kysely";
import { D1Dialect } from "kysely-d1";
import { jsonObjectFrom } from "kysely/helpers/sqlite";
import z from "zod";

export type Env = {
  PACKAGES: D1Database;
};

const archs = ["x86_64", "aarch64"] as const;
const branches = ["stable", "testing", "unstable"] as const;
const repos = ["core", "extra", "multilib"] as const;

type SingleOrMulti = string | string[] | null;

type Table = {
  name: string;
  db_arch: (typeof archs)[number];
  branch: (typeof branches)[number];
  repo: (typeof repos)[number];
  raw_data: string;
  version: string;
  desc: string | null;
  builddate: string;
  filename: string;
  base: string | null;
  csize: number;
  isize: number;
  md5sum: string;
  sha256sum: string;
  pgpsig: string | null;
  url: string | null;
  packager: string | null;
  license: SingleOrMulti;
  provides: SingleOrMulti;
  conflicts: SingleOrMulti;
  replaces: SingleOrMulti;
  optdepends: SingleOrMulti;
  depends: SingleOrMulti;
  makedepends: SingleOrMulti;
}

interface Database {
  packages: Table;
}

export const getDB = (env: Env) => {
  return new Kysely<Database>({
    dialect: new D1Dialect({ database: env.PACKAGES }),
  });
};

export const archValidator = z.enum(archs);
export const branchValidator = z.enum(branches);
export const repoValidator = z.enum(repos);

const inputValidator = z.object({
  search: z.string().min(3),
  arch: archValidator.default("x86_64"),
});

export const onRequest: PagesFunction<Env> = async (context) => {
  const db = getDB(context.env);

  const params = new URL(context.request.url).searchParams;

  const input = inputValidator.safeParse({
    search: params.get("search") ?? undefined,
    arch: params.get("arch") ?? undefined,
  });

  if (!input.success) {
    return Response.json(input.error, { status: 400 });
  }
  const { search } = input.data;

  const name = search;
  const nameStart = `${search}%`;
  const nameContains = `%${search}%`;

  let query = db.selectFrom("packages").select(["name"]);

  for (const arch of archs) {
    for (const branch of branches) {
      query = query.select((eb) =>
        jsonObjectFrom(
          eb
            .selectFrom(`packages as p`)
            .select([
              "p.version",
              "p.desc",
              ({ fn }) =>
                fn<string>("strftime", [
                  sql`'%Y-%m-%dT%H:%M:%fZ'`,
                  "p.builddate",
                  sql`'unixepoch'`,
                ]).as("builddate"),
            ])
            .whereRef("p.name", "=", "packages.name")
            .where("p.branch", "=", branch)
            .where("p.db_arch", "=", arch)
        ).as(`${branch}_${arch}`)
      );
    }
  }
  query = query.limit(100);
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
  console.log(query.compile().parameters, query.compile().sql);

  const result = await query.execute();

  return Response.json(result);
};
