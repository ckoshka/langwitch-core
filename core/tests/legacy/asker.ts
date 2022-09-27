import { Input } from "../deps.ts";
import { rpc } from "../resource/utils/ask.ts";

const server = await rpc(`nix-shell --command "bash" -p python310`);

for (;;) {
	await Input.prompt("Next command?").then(server.ask).then(console.log);
}
