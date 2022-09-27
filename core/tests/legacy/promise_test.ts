await new Promise((resolve, reject) => {
	reject(1);
	console.log("I continued executing after resolving");
}).then(console.log);
