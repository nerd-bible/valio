import { codec } from "./codec";
import { addError, Pipe } from "./pipe";

class NumberValidator extends Pipe<unknown, number> {
	type = "number" as const;

	isT(data: unknown) {
		return typeof data == "number";
	}
	min(n: number) {
		return this.refine((v) => (v > n ? "" : `must be > ${n}`));
	}
	max(n: number) {
		return this.refine((v) => (v < n ? "" : `must be < ${n}`));
	}
}

export function number() {
	return new NumberValidator();
}

export function codecNumber() {
	return codec(
		new NumberValidator(),
		(input, ctx) => {
			if (input == "NaN") return { output: NaN };
			const parsed = parseFloat(input as string);
			if (!isNaN(parsed)) return { output: parsed };

			addError(`${input} is not a number`, ctx);
			return { errors: ctx.errors! };
		},
		(output: number) => ({ output: output.toString() }),
	);
}
