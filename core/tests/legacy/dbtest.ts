import { open } from "https://deno.land/x/lmdb@v2.2.3/mod.ts";

let myDB = open({
	path: "my-db",
	// any options go here, we can turn on compression like this:
	compression: true,
});
await myDB.put("greeting", { someText: "Hello, World!" });
myDB.get("greeting").someText; // 'Hello, World!'
// or
myDB.transaction(() => {
	myDB.put("greeting", { someText: "Hello, World!" });
	myDB.get("greeting").someText; // 'Hello, World!'
});

// DOESN'T WORK
