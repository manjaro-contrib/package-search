import z from "zod";
import { archValidator, branchValidator, repoValidator, type Env } from ".";

const inputValidator = z.object({
  arch: archValidator,
  branch: branchValidator,
  repo: repoValidator,
});

export const onRequest: PagesFunction<Env> = async (context) => {
  const params = new URL(context.request.url).searchParams;

  const input = inputValidator.safeParse({
    arch: params.get("arch"),
    branch: params.get("branch"),
    repo: params.get("repo"),
  });

  if (!input.success) {
    return Response.json(input.error, { status: 400 });
  }
  const { arch, branch, repo } = input.data;

  const url = `https://raw.githubusercontent.com/manjaro-contrib/trace-mirror-dbs/main/db/${branch}_${repo}_${arch}.json`;
  const result = await fetch(url, {
    cf: {
      // don't refetch all dbs at the same time (between 10 and 20 minutes)
      cacheTtl: 60 * 10 + 60 * 10 * Math.random(),
    },
  });
  if (!result.ok) {
    return Response.json(
      {
        success: false,
        error: result.statusText,
      },
      {
        status: result.status,
        headers: {
          "content-type": "application/json",
        },
      }
    );
  }
  const content = await result.json<{ name: string }[]>();

  // drop all packages for this db
  await context.env.PACKAGES.prepare(
    "DELETE FROM packages WHERE db_arch = ? AND branch = ? AND repo = ?;"
  )
    .bind(arch, branch, repo)
    .run();

  const pkgNames = content.map((pkg) => pkg.name);
  // list duplicates
  const duplicates = pkgNames.filter(
    (name, index) => pkgNames.indexOf(name) !== index
  );
  if (duplicates.length > 0) {
    throw new Error(`Duplicates found: ${duplicates.join(", ")}`);
  }

  await context.env.PACKAGES.batch([
    // add all packages
    ...content.map((pkg) =>
      context.env.PACKAGES.prepare(
        "INSERT INTO packages (name, db_arch, branch, repo, raw_data) VALUES (?, ?, ?, ?, ?);"
      ).bind(
        pkg.name,
        arch,
        branch,
        repo,
        JSON.stringify(pkg)
      )
    ),
  ]);

  return Response.json(
    {
      success: true,
    },
    {
      headers: {
        "content-type": "application/json",
      },
    }
  );
};
