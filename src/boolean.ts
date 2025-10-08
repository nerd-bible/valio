import { codec } from "./codec";
import { Pipe } from "./pipe";

class BooleanValidator extends Pipe<unknown, boolean> {
	type = "boolean" as const;

	isT(data: unknown) {
		return typeof data == "boolean";
	}
}

export function boolean() {
	return new BooleanValidator();
}

export function codecBoolean(opts: { true?: string[]; false?: string[] } = {}) {
	return codec(
		new BooleanValidator(),
		(v) => {
			if (typeof v == "string") {
				if (opts.true?.includes(v)) return { output: true };
				if (opts.false?.includes(v)) return { output: false };
			}
			return { output: Boolean(v) };
		},
		(v) => {
			if (opts.true?.length && v) return { output: opts.true[0] };
			if (opts.false?.length && !v) return { output: opts.false[0] };

			return { output: v ? "true" : "false" };
		},
	);
}
