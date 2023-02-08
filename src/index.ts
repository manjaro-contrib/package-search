const searchUrl = (query: string) => `https://api.github.com/search/code?per_page=30&page=1&q=${query}+in:file+extension:json+repo:manjaro-contrib/trace-mirror-dbs`

interface Env { }

const init = {
	cf: { cacheTtl: 84600 },
	headers: {
		'Accept': 'application/vnd.github+json',
		'User-Agent': 'test'
	}
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
		ctx: ExecutionContext
	): Promise<Response> {
		const requestUrl = new URL(request.url);

		let query = requestUrl.searchParams.get('query');
		if (!query) {
			const name = requestUrl.searchParams.get('name');
			if (!name) return new Response(JSON.stringify({ error: "param 'name' is required" }), responseInit);

			const branch = requestUrl.searchParams.get('branch') ?? 'stable';
			const arch = requestUrl.searchParams.get('arch') ?? 'x86_64';

			query = `path:/\/${branch}\/*\/${arch}\/${name}.*\.json$`
		}

		const response = await fetch(searchUrl(query), init)
		const searchResult = await response.json<{ total_count: number; items: { git_url: string; }[] }>();
		const results = await Promise.all(searchResult.items.map(async item => {
			const itemResult = await fetch(item.git_url, init);
			const raw = await itemResult.json<{ content: string }>();
			const json = JSON.parse(atob(raw.content));
			return json;
		}))

		return new Response(JSON.stringify(results), responseInit);
	},
};
