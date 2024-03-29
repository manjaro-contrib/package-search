const searchUrl = (query: string) =>
  `https://api.github.com/search/code?per_page=30&page=1&q=${query}+in:file+extension:json+repo:manjaro-contrib/trace-mirror-dbs`;

export interface Env {}

const responseInit = {
  headers: {
    "content-type": "application/json;charset=UTF-8",
  },
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const init = {};
    const requestUrl = new URL(request.url);

    const name = requestUrl.searchParams.get("name");
    if (!name)
      return new Response(
        JSON.stringify({ error: "param 'name' is required" }),
        responseInit
      );

    const branch = requestUrl.searchParams.get("branch") ?? "stable";
    const arch = requestUrl.searchParams.get("arch") ?? "x86_64";

    let workingUrl: string | undefined = undefined;
    for (const repo of ["core", "extra", "community", "multilib"]) {
      const url = `https://raw.githubusercontent.com/manjaro-contrib/trace-mirror-dbs/main/repo/${branch}/${repo}/${arch}/${name}.json`;
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok) {
        console.debug(`Found ${url}`);
        workingUrl = url;
        break;
      }
    }

    const response = await fetch(workingUrl!, init);

    const result = await response.text();
    return new Response(result, responseInit);
  },
};
