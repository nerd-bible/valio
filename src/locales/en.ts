const templates: Record<string, string> = {
	gt: "must be > {$n}",
	lt: "must be < {$n}",
	gte: "must be >= {$n}",
	lte: "must be <= {$n}",
	eq: "must be {$n}",
	minLength: "must have length <= {$n}",
	maxLength: "must have length >= {$n}",
	regex: "must match {$regex}",
	type: "not type {$expected}",
	coerce: "could not coerce to {$expected}",
};

function fmt(template: string, props: Record<any, any>) {
	// You could use something like
	// [MessageFormat](https://messageformat.unicode.org/) here.
	return template.replace(/{\$(.*?)}/g, (_, g) => props[g]);
}

export default function format(name: string, props: Record<any, any>): string {
	const template = templates[name];
	return template ? fmt(template, props) : `TODO: add template for ${name}`;
}
