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
            .select(["version"])
            .whereRef("p.name", "=", "packages.name")
            .where("p.branch", "=", branch)
            .where("p.arch", "=", arch)
        ).as(`${branch}_${arch}`)
      );
    }
  }
  // .innerJoin(
  //   (eb) =>
  //     eb
  //       .selectFrom("packages as stable")
  //       .select([
  //         "stable.version as stable_version",
  //         "stable.name as stable_name",
  //         "stable.builddate as stable_builddate"
  //       ])
  //       .where("branch", "=", "stable")
  //       .where("arch", "=", arch)
  //       .as("stable"),
  //   (join) => join.onRef("stable.stable_name", "=", "name")
  // )
  // .innerJoin(
  //   (eb) =>
  //     eb
  //       .selectFrom("packages as unstable")
  //       .select([
  //         "unstable.version as unstable_version",
  //         "unstable.name as unstable_name",
  //         "unstable.builddate as unstable_builddate"
  //       ])
  //       .where("branch", "=", "unstable")
  //       .where("arch", "=", arch)
  //       .as("unstable"),
  //   (join) => join.onRef("unstable.unstable_name", "=", "name")
  // )
  // .innerJoin(
  //   (eb) =>
  //     eb
  //       .selectFrom("packages as testing")
  //       .select([
  //         "testing.version as testing_version",
  //         "testing.name as testing_name",
  //         "testing.builddate as testing_builddate"
  //       ])
  //       .where("branch", "=", "testing")
  //       .where("arch", "=", arch)
  //       .as("testing"),
  //   (join) => join.onRef("testing.testing_name", "=", "name")
  // ).select([
  //   "name",
  //   "stable.stable_version",
  //   "stable.stable_builddate",
  //   "testing.testing_version",
  //   "testing.testing_builddate",
  //   "unstable.unstable_version",
  //   "unstable.unstable_builddate",
  // ]);
  // query = query.select(({ fn }) =>
  //   fn<string>("strftime", [
  //     sql`'%Y-%m-%dT%H:%M:%fZ'`,
  //     "builddate",
  //     sql`'unixepoch'`,
  //   ]).as("builddate")
  // );
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
