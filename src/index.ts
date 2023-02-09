const searchUrl = (query: string) => `https://api.github.com/search/code?per_page=30&page=1&q=${query}+in:file+extension:json+repo:manjaro-contrib/trace-mirror-dbs`

const init = {
	cf: { cacheTtl: 1000 * 60 },
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
	): Promise<Response> {
		const requestUrl = new URL(request.url);

		let query = requestUrl.searchParams.get('query');
		if (!query) {
			const name = requestUrl.searchParams.get('name');
			if (!name) return new Response(JSON.stringify({ error: "param 'name' is required" }), responseInit);

			const branch = requestUrl.searchParams.get('branch') ?? 'stable';
			const arch = requestUrl.searchParams.get('arch') ?? 'x86_64';
			query = `${name}_${arch}_${branch}`
		}

		const response = await fetch(searchUrl(query), init)
		const searchResult = await response.json<{ total_count: number; items: { git_url: string; html_url: string; sha: string; }[] }>();
		console.log(JSON.stringify(searchResult.items))
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
