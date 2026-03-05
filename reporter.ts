import type { TestEvent } from "node:test/reporters";
import pc from "picocolors";

export default async function* customReporter(
	source: AsyncIterable<TestEvent>,
) {
	for await (const event of source) {
		switch (event.type) {
			case "test:pass":
				yield `${pc.green(`✓ ${event.data.name}`)} ${event.data.details.duration_ms}ms\n`;
				break;
			case "test:fail":
				yield `${pc.red(`✗ ${event.data.name}`)} ${event.data.details.duration_ms}ms\n`;
				yield `${event.data.file}:${event.data.line}:${event.data.column}\n`;
				yield `\t${event.data.details.error.message.replace(/\n/g, "\n\t")}\n`;
				break;
			case "test:stderr":
			case "test:stdout":
				yield event.data.message;
				break;
			// case 'test:diagnostic':
			// 	yield `${event.data.message}\n`;
			// 	break;
		}
	}
}
