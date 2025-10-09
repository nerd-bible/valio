import { pipe, type Result } from "./pipe";

function defaultCoercion(input: any): Result<string> {
	return {
		success: true,
		output: String(input),
	};
}

export function string() {
	return {
		...pipe<any, string>("string"),
		isOutput: (data: any) => typeof data == "string",
		coerce(fn = defaultCoercion) {
			this.coerceFn = fn;
			return this;
		},

		regex(re: RegExp) {
			return this.refine((v) => (v.match(re) ? "" : `must match ${re.source}`));
		},
		nonempty() {
			return this.refine((v) => (v.length ? "" : `must be nonempty`));
		},
	};
}
