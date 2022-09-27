import { unpack } from "../pure_deps.ts";
import { time } from "../resource/utils/utils.ts";

const data = await time(
	() => Deno.readFile("bulgarian.msgpack"),
);
const unpacked = await time(
	() => unpack(data),
);
