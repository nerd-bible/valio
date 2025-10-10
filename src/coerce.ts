export function toBoolean(opts: { true?: string[]; false?: string[] } = {}) {
	return (v) => {
		if (typeof v == "string") {
			if (opts.true?.includes(v)) return { output: true };
			if (opts.false?.includes(v)) return { output: false };
		}
		return { output: Boolean(v) };
	};
	// if (opts.true?.length && v) return { output: opts.true[0] };
	// if (opts.false?.length && !v) return { output: opts.false[0] };
	//
	// return { output: v ? "true" : "false" };
}
