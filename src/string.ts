import { codec } from "./codec";
import { Pipe } from "./pipe";

export class StringValidator extends Pipe<unknown, string> {
	type = "string" as const;

	isT = (data: unknown) => typeof data == "string";
	regex = (re: RegExp) =>
		this.refine((v) => (v.match(re) ? "" : `must match ${re.source}`));
	nonempty = () => this.refine((v) => (v.length ? "" : `must be nonempty`));
}

export function string() {
	return new StringValidator();
}

export function codecString() {
	return codec(
		new StringValidator(),
		(input) => ({
			output: input?.toString() ?? Object.prototype.toString.call(input),
		}),
		(output) => ({ output }),
	);
}
