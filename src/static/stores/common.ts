export function apiPath(route: string) {
	const port = process.env.NODE_ENV === 'development' ? ':5008' : '';
	return `${location.protocol}//${location.hostname}${port}/api/${route}`
}
