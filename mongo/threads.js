"use strict";
const {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} = require("worker_threads");
const { performance } = require("perf_hooks");
const MongoClient = require("mongodb").MongoClient;
var totalmessages = 0;
var expectedmessages = 0;
// Connection URL

// const url = "mongodb://localhost:27017";
// const url =
//   "mongodb://stressTest:orangerasna@35.202.10.119:27017/?authSource=admin&readPreference=primary&appname=MongoDB%20Compass&ssl=false";

const mongoWrite = async (writeCount, key, db) => {
  var totalmessages = 0;
  for (var i = 0; i < writeCount; i++) {
    var res = db.collection("test").insertOne(
      {
        key: key,
        count: i,
        data: { name: "John", age: 31, city: "New York" },
        data1: { name: "John", age: 31, city: "New York" },
        data2: { name: "John", age: 31, city: "New York" },
        data3: { name: "John", age: 31, city: "New York" },
        data4: { name: "John", age: 31, city: "New York" },
        data5: { name: "John", age: 31, city: "New York" },
      },
      function (err, res) {
        if (err) throw err;
        totalmessages++;
        if (totalmessages == writeCount) {
          parentPort.postMessage(`${key} completed ${new Date()}`);
          parentPort.postMessage("done");
        }
      }
    );
    if (i == writeCount - 1) {
      //console.log(key);
    }
  }
};

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function test(count) {
  for (var i = 0; i < count; i++) {
    await sleep(10);
  }
  //console.log("done ", count);
}
const writeTest = async (writesPerInstance, key, url) => {
  //console.log(writesPerInstance, "************");
  const client = await MongoClient.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }).catch((err) => {
    console.log(err);
  });

  const db = client.db("test");
  //   console.log("connected ,", writesPerInstance);
  mongoWrite(writesPerInstance, key, db).then((d) => {
    //console.log(`End Time :${new Date()}`);
  });
};

if (isMainThread) {
  var args = process.argv.slice(2);
  //console.log(args);
  if (args.length <= 0) {
    console.log("Please enter ip address of the database");
    process.exit();
  }
  const url =
    args[0] == "localhost"
      ? "mongodb://localhost:27017"
      : `mongodb://stressTest:orangerasna@${args[0]}:27017/?authSource=admin&readPreference=primary&appname=MongoDB%20Compass&ssl=false`;

  var writes = 1000;
  const threadCount = 2;
  const threads = new Set();
  var result = {
    threads: threadCount,
    ip: args[0],
    messagesPerThread: writes,
    totalmessages: threadCount * writes,
    messageSendStart: new Date(),
  };
  //console.log(`Running with ${threadCount} threads...`);
  expectedmessages = threadCount * writes;
  for (let i = 0; i < threadCount; i++) {
    threads.add(
      new Worker(__filename, {
        workerData: { count: 500, id: i, writesPerInstance: writes, url: url },
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
      if (msg == "done") {
        c++;
        if (c == threadCount) {
          result["writeComplete"] = new Date();
          result["writeCompleteTime"] =
            result["writeComplete"].getTime() -
            result["messageSendComplete"].getTime();
          console.log(result);
          process.exit();
        }
      } else if (msg == "msgDone") {
        mc++;
        if (mc == threadCount) {
          result["messageSendComplete"] = new Date();
          result["messageCompleteTime"] =
            result["messageSendComplete"].getTime() -
            result["messageSendStart"].getTime();
        }
      } else {
        //console.log(msg);
      }
    });
  }
} else {
  const run = async () => {
    var t1 = performance.now();
    var start = new Date();
    //console.log(workerData.writesPerInstance, "/************");
    writeTest(workerData.writesPerInstance, workerData.id, workerData.url);
    var t2 = performance.now();
    parentPort.postMessage(
      `job completed, id: ${workerData.id}\nTIME TAKEN: ${
        t2 - t1
      }\nSTART TIME:${start}\nEND TIME:${new Date()}`
    );
    parentPort.postMessage("msgDone");
  };
  run();
}
