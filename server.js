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
  detectorsCollection = database.collection("detectorsdb");
  console.log(database.databaseName, "is running ..");
  server.listen(3000, () => console.log("Server is running on localhost:3000"));
  await monitorPotholesPostion();
  // await monitorDetectorsPosition();
}
startServers().catch(console.dir);

/***** on websocket connection with a client ******/
io.on("connection", (socket) => {
  console.log("a user is connected");
  io.emit(
    "message",
    JSON.stringify({
      messageType: "simple text",
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

app.post("/addPothole", function (req, res) {
  var newPosPothole = req.body;
  if (newPosPothole.latitude != "" || newPosPothole.longitude != "") {
    potholesCollection.insertOne(newPosPothole);
    res.status(200).send("position added succuessfuly !!");
  } else {
    res.status(200).send("position is empty --> not added to the database");
  }
});

app.post("/createDetector", function (req, res) {
  console.log("detector creation", req.body);
  // detectorsCollection.insertOne();
});

/********   GPS Data  ************/
app.post("/addGpsPosition", function (req, res) {
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

async function monitorPotholesPostion(timeInMs = 100000, pipeline = []) {
  const changeStream = potholesCollection.watch(pipeline);
  changeStream.on("change", (next) => {
    const posPothole = {
      _id: next.fullDocument._id,
      latitude: next.fullDocument.latitude,
      longitude: next.fullDocument.longitude,
      image: next.fullDocument.image,
    };
    console.log("change stream : ", posPothole);
    console.log("sending the new pothole position");
    const socketMessage = {
      messageType: "pothole position",
      message: JSON.stringify(posPothole),
    };
    io.emit("message", `${JSON.stringify(socketMessage)}`);
  });
  // await closeChangeStream(timeInMs, changeStream);
}

/***  Getting GPS Postion  ***/

async function monitorDetectorsPosition(timeInMs = 100000, pipeline = []) {
  const changeStream = detectorsCollection.watch(pipeline);
  changeStream.on("change", (next) => {
    const posPothole = {
      _id: next.fullDocument._id,
      latitude: next.fullDocument.latitude,
      longitude: next.fullDocument.longitude,
      image: next.fullDocument.image,
    };
    console.log("change stream : ", posPothole);
    console.log("sending the new pothole position");
    const socketMessage = {
      messageType: "pothole position",
      message: JSON.stringify(posPothole),
    };
    io.emit("message", `${JSON.stringify(socketMessage)}`);
  });
  // await closeChangeStream(timeInMs, changeStream);
}

function closeChangeStream(timeInMs = 60000, changeStream) {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("Closing the change stream");
      changeStream.close();
      resolve();
    }, timeInMs);
  });
}
