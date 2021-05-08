const { exec } = require("child_process");
var arr = ["localhost", "localhost", "35.239.127.63"];
for (var i = 0; i < arr.length; i++) {
  exec(`node threads.js ${arr[i]}`, (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
  });
}
