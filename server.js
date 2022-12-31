// import necessary modules
const express = require("express");
const app = express();

const cors = require("cors");
app.use(cors());

const bodyParser = require("body-parser");
app.use(bodyParser.json({ limit: "5mb" }));

const http = require("http");
const { MongoClient } = require("mongodb");
const { Server } = require("socket.io");

const io = new Server(3030, { cors: { origin: "*" } });
const server = http.createServer(app);
const uri =
  "mongodb+srv://zedDB:dAQZaszOuSSmsW0D@cluster0.dh0zyjw.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);

/*****   Start MongoDB & NodeJS Server  *****/
async function startServers() {
  database = client.db("PotholesDB");
  potholesCollection = database.collection("potholesdb");
  console.log(database.databaseName, "is running ..");
  server.listen(3000, () => console.log("Server is running on localhost:3000"));
}
startServers().catch(console.dir);

/***** on websocket connection with a client ******/
io.on("connection", (socket) => {
  console.log("a user is connected, ", socket);
  io.emit(
    "message",
    JSON.stringify({
      messageType: "simpleText",
      message: "Connection established with the server",
    })
  );
});

/* --------------------------------------------------------------------- */
/*** ↑↑ All servers are up and running ↑↑ - ↓↓ We are ready to consume the API ↓↓ ***/
/* ------------------------------------------------------------------- */

/* -------------------------- */
/* ------ SmartThings ------ */
/* ------------------------ */

/*********   Adding Pothole Data  **********/

app.post("/addPosPothole", function (req, res) {
  var newPosPothole = req.body;
  if (newPosPothole.latitude != "" || newPosPothole.longitude != "") {
    potholesCollection.insertOne(newPosPothole);
  }
  res.end();
});

/********   GPS Data  ************/
app.post("/gpsPosition", function (req, res) {
  console.log("GPS Position of the SmartThing", req.body);
});

/* ----------------------- */
/* ------ Frontend ------ */
/* --------------------- */

/*********   Getting Potholes positions  **********/

app.get("/", async (req, res) => {
  const data = await potholesCollection.find({});
  data.toArray().then((potholesArray) => {
    res.status(200).send(potholesArray);
  });
});

/*********   Getting Last Pothole position  **********/

async function monitorListingsUsingEventEmitter(
  timeInMs = 100000,
  pipeline = []
) {
  const changeStream = potholesCollection.watch(pipeline);
  changeStream.on("change", (next) => {
    const posPothole = {
      latitude: next.fullDocument.latitude,
      longitude: next.fullDocument.longitude,
      image: next.fullDocument.image,
    };
    console.log("change stream : ", posPothole);
    console.log("sending the new pothole position");
    const socketMessage = {
      messageType: "position",
      message: JSON.stringify(posPothole),
    };
    io.emit("message", `${JSON.stringify(socketMessage)}`);
  });
  // await closeChangeStream(timeInMs, changeStream);
}
await monitorListingsUsingEventEmitter();

function closeChangeStream(timeInMs = 60000, changeStream) {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("Closing the change stream");
      changeStream.close();
      resolve();
    }, timeInMs);
  });
}
