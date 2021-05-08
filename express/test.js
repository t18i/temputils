const fetch = require("node-fetch");
const {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} = require("worker_threads");

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const multiCall = async (url, callCount) => {
  for (var i = 0; i < callCount; i++) {
    var success = 0;
    var fail = 0;
    var total = 0;
    var retries = 0;
    var random = Math.random();
    random = random * 1000;
    setTimeout(() => {}, random);
    const run = () => {
      fetch(url)
        .then((res) => {
          total++;
          if (res.status == 200) {
            success++;
          } else {
            fail++;
          }
          if (total == callCount) {
            parentPort.postMessage({
              total: total,
              success: success,
              fail: fail,
              retries: retries,
              type: "result",
            });
          }
        })
        .catch((e) => {
          retries++;
          run();
          //   total++;
          //   fail++;
          //   if (total == callCount) {
          //     parentPort.postMessage({
          //       total: total,
          //       success: success,
          //       fail: fail,
          //       type: "result",
          //     });
          //   }
        });
    };
    run();
  }
};

if (isMainThread) {
  var args = process.argv.slice(2);
  //console.log(args);
  if (args.length <= 0) {
    console.log("Please enter ip address of the database");
    process.exit();
  }
  const url = `http://${args[0]}:3000`;

  var calls = 100;
  var threadCount = 100;

  const threads = new Set();
  var result = {
    threads: threadCount,
    ip: args[0],
    callsPerThread: calls,
    totalcalls: threadCount * calls,
    callSendStart: new Date(),
    result: {
      total: 0,
      success: 0,
      fail: 0,
      retries: 0,
    },
  };
  //console.log(`Running with ${threadCount} threads...`);
  expectedcalls = threadCount * calls;
  for (let i = 0; i < threadCount; i++) {
    threads.add(
      new Worker(__filename, {
        workerData: { id: i, callsPerInstance: calls, url: url },
      })
    );
  }
  var c = 0;
  var mc = 0;

  for (let worker of threads) {
    worker.on("error", (err) => {
      throw err;
    });
    worker.on("exit", () => {
      threads.delete(worker);
      //console.log(`Thread exiting, ${threads.size} running...`);
    });
    worker.on("message", (msg) => {
      if (msg.type && msg.type == "result") {
        c++;
        result["result"].fail += msg.fail;
        result["result"].success += msg.success;
        result["result"].total += msg.total;
        result["result"].retries += msg.retries;
        if (c == threadCount) {
          result["callComplete"] = new Date();
          result["callCompleteTime"] =
            result["callComplete"].getTime() -
            result["callSendComplete"].getTime();
          result["error"] =
            (result["result"].fail * 100) / result["result"].total;
          console.log(result);
          process.exit();
        }
      } else if (msg.type && msg.type == "callDone") {
        mc++;
        if (mc == threadCount) {
          result["callSendComplete"] = new Date();
          result["callCompleteTime"] =
            result["callSendComplete"].getTime() -
            result["callSendStart"].getTime();
        }
      } else {
        //console.log(msg);
      }
    });
  }
  //sleep(5000);
} else {
  const run = async () => {
    var start = new Date();
    //console.log(workerData.writesPerInstance, "/************");
    multiCall(workerData.url, workerData.callsPerInstance);

    // parentPort.postMessage(
    //   `job completed, id: ${workerData.id}\nTIME TAKEN: ${
    //     t2 - t1
    //   }\nSTART TIME:${start}\nEND TIME:${new Date()}`
    // );
    parentPort.postMessage({ type: "callDone" });
  };
  run();
}
