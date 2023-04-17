const searchUrl = (query: string) => `https://api.github.com/search/code?per_page=30&page=1&q=${query}+in:file+extension:json+repo:manjaro-contrib/trace-mirror-dbs`

export interface Env {
	GITHUB_TOKEN: string;
}

const responseInit = {
	headers: {
		'content-type': 'application/json;charset=UTF-8',
	}
}

export default {
	async fetch(
		request: Request,
		env: Env,
	): Promise<Response> {
		const init = {
			// cf: { cacheTtl: 1000 * 60 },
			headers: {
				'Accept': 'application/vnd.github+json',
				'User-Agent': 'test',
				"Authorization": `Bearer ${env.GITHUB_TOKEN}`
			}
		}
		const requestUrl = new URL(request.url);

		let query = requestUrl.searchParams.get('query');
		if (!query) {
			const name = requestUrl.searchParams.get('name');
			if (!name) return new Response(JSON.stringify({ error: "param 'name' is required" }), responseInit);

			const branch = requestUrl.searchParams.get('branch') ?? 'stable';
			const arch = requestUrl.searchParams.get('arch') ?? 'x86_64';
			query = `${name}_${arch}_${branch}`
		}

		//{"message":"Requires authentication","errors":[{"message":"Must be authenticated to access the code search API","resource":"Search","field":"q","code":"invalid"}],"documentation_url":"https://docs.github.com/rest/reference/search#search-code"}
		const response = await fetch(searchUrl(query), init)
		const searchResult = await response.json<{ total_count: number; items: { git_url: string; html_url: string; sha: string; }[] }>();
		console.log(JSON.stringify(searchResult))
		const results = await Promise.all(searchResult.items.map(async item => {
			const itemResult = await fetch(item.git_url, init);
			const raw = await itemResult.json<{ content: string }>();
			const json = JSON.parse(atob(raw.content));
			const meta = {
				html_url: item.html_url,
				sha: item.sha
			}
			return { ...json, meta };
		}))

		return new Response(JSON.stringify(results), responseInit);
	},
};
