const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// mongoDB
const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0-shard-00-00.gbi1i.mongodb.net:27017,cluster0-shard-00-01.gbi1i.mongodb.net:27017,cluster0-shard-00-02.gbi1i.mongodb.net:27017/?ssl=true&replicaSet=atlas-codyet-shard-0&authSource=admin&appName=Cluster0`;

const client = new MongoClient(uri, {
      serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
      }
});

// ---- IMPORTANT PART ----
// Serverless (Vercel) e proti request e notun function instance uthte pare,
// tai amra ekta cached connection promise rakhbo. Ekbar connect hoye gele
// porer request gula shei existing connection reuse korbe.
//
// KINTU: Vercel instance freeze hoye thakle, MongoDB Atlas er dik theke
// idle connection ta bondho hoye jete pare. Tokhon cached client thakleo
// oi connection "dead" - MongoNotConnectedError / MongoTopologyClosedError dey.
// Tai amra ekhon isConnected() check kori, dead hole notun connect kori.
let dbInstance = null;

async function getDB() {
      // Jodi client "connected" thake bole mone kori, seta actually
      // kaj korche kina check kori (topology closed hoye thakle eta false dibe)
      if (dbInstance) {
            try {
                  const topology = client.topology;
                  if (topology && topology.isConnected()) {
                        return dbInstance;
                  }
            } catch (e) {
                  // topology check e error hole dhore nebo connection dead
            }
            console.log("⚠️ Old connection dead, reconnecting...");
            dbInstance = null;
      }

      try {
            const connectedClient = await client.connect();
            dbInstance = connectedClient.db("posakBari");
            console.log("✅ MongoDB connected");
            return dbInstance;
      } catch (error) {
            console.error("❌ MongoDB connect failed:", error.message);
            dbInstance = null;
            throw error;
      }
}

// Home Route
app.get("/", (req, res) => {
      res.send("🚀 Posak Bari Backend Running...");
});

// ---- Routes (ekhon run() er baire, tai always registered thakbe) ----

app.get("/product", async (req, res) => {
      try {
            const db = await getDB();
            const productCollection = db.collection("productData");

            let query = {};
            if (req.query.category) {
                  query = { category: req.query.category };
            }

            const result = await productCollection.find(query).toArray();
            res.send(result);
      } catch (error) {
            console.error("Error fetching products:", error);
            res.status(500).send({ error: "Internal Server Error" });
      }
});

app.get("/product/:id", async (req, res) => {
      try {
            const db = await getDB();
            const productCollection = db.collection("productData");
            const id = req.params.id;

            const result = await productCollection.findOne({
                  _id: new ObjectId(id),
            });
            res.send(result);
      } catch (error) {
            console.error("Error fetching product:", error);
            res.status(500).send({ error: "Internal Server Error" });
      }
});

app.post('/addproduct', async (req, res) => {
      try {
            const db = await getDB();
            const productCollection = db.collection("productData");
            const result = await productCollection.insertOne(req.body);
            res.send(result);
      } catch (error) {
            console.error("Error adding product:", error);
            res.status(500).send({ error: "Internal Server Error" });
      }
});

app.delete('/product/:id', async (req, res) => {
      try {
            const db = await getDB();
            const productCollection = db.collection("productData");
            const query = { _id: new ObjectId(req.params.id) };
            const result = await productCollection.deleteOne(query);
            res.send(result);
      } catch (error) {
            console.error("Error deleting product:", error);
            res.status(500).send({ error: "Internal Server Error" });
      }
});

// order post
app.post('/ceheckout', async (req, res) => {
      try {
            const db = await getDB();
            const orderCollection = db.collection("orderData");
            const result = await orderCollection.insertOne(req.body);
            res.send(result);
      } catch (error) {
            console.error("Error creating checkout order:", error);
            res.status(500).send({ error: "Internal Server Error" });
      }
});

app.get("/ceheckout", async (req, res) => {
      try {
            const db = await getDB();
            const orderCollection = db.collection("orderData");
            const email = req.query.email;
            let query = {};

            if (email) {
                  query = { userEmail: email };
            }

            const result = await orderCollection.find(query).toArray();
            res.send(result);
      } catch (error) {
            console.error("Error fetching checkout orders:", error);
            res.status(500).send({ error: "Internal Server Error" });
      }
});

app.delete('/ceheckout/:id', async (req, res) => {
      try {
            const db = await getDB();
            const orderCollection = db.collection("orderData");
            const query = { _id: new ObjectId(req.params.id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
      } catch (error) {
            console.error("Error deleting checkout order:", error);
            res.status(500).send({ error: "Internal Server Error" });
      }
});

// user er sob cart item order status true kora
app.patch('/ceheckout/:email', async (req, res) => {
      try {
            const db = await getDB();
            const orderCollection = db.collection("orderData");
            const email = req.params.email;
            const filter = { userEmail: email, order: false };
            const updateDoc = { $set: { order: true } };
            const result = await orderCollection.updateMany(filter, updateDoc);
            res.send(result);
      } catch (error) {
            console.error("Error updating order status:", error);
            res.status(500).send({ message: "Failed to update order status" });
      }
});

// final order section
app.post('/order', async (req, res) => {
      try {
            const db = await getDB();
            const finalOrderCollection = db.collection("finalOrderData");
            const result = await finalOrderCollection.insertOne(req.body);
            res.send(result);
      } catch (error) {
            console.error("Error creating final order:", error);
            res.status(500).send({ error: "Internal Server Error" });
      }
});

app.get("/order", async (req, res) => {
      try {
            const db = await getDB();
            const finalOrderCollection = db.collection("finalOrderData");
            const email = req.query.email;
            let query = {};

            if (email) {
                  query = { "customer.email": email };
            }

            const result = await finalOrderCollection.find(query).toArray();
            res.send(result);
      } catch (error) {
            console.error("Error fetching final orders:", error);
            res.status(500).send({ error: "Internal Server Error" });
      }
});

app.patch('/order/:id', async (req, res) => {
      try {
            const db = await getDB();
            const finalOrderCollection = db.collection("finalOrderData");
            const id = req.params.id;
            const updatedStatus = req.body.status;

            const filter = { _id: new ObjectId(id) };
            const updateDoc = { $set: { status: updatedStatus } };

            const result = await finalOrderCollection.updateOne(filter, updateDoc);
            res.send(result);
      } catch (error) {
            console.error("Error updating status:", error);
            res.status(500).send({ error: "Failed to update status" });
      }
});

app.delete('/order/:id', async (req, res) => {
      try {
            const db = await getDB();
            const finalOrderCollection = db.collection("finalOrderData");
            const query = { _id: new ObjectId(req.params.id) };
            const result = await finalOrderCollection.deleteOne(query);
            res.send(result);
      } catch (error) {
            console.error("Error deleting final order:", error);
            res.status(500).send({ error: "Internal Server Error" });
      }

});



// add campaing /
app.post('/addcam', async (req, res) => {
      try {
            const db = await getDB();
            const addCampaignCollection = db.collection("addCampaign");
            const result = await productCollection.insertOne(req.body);
            res.send(result);
      } catch (error) {
            console.error("Error adding product:", error);
            res.status(500).send({ error: "Internal Server Error" });
      }
});






// Local development e chalate hole (Vercel deploy er jonno eta lagbe na,
// karon Vercel nijei server handle kore)
if (process.env.NODE_ENV !== 'production') {
      app.listen(PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${PORT}`);
      });
}

module.exports = app;