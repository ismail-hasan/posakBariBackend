const { MongoClient, ServerApiVersion } = require('mongodb');
const { ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

//mongoDB

const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0-shard-00-00.gbi1i.mongodb.net:27017,cluster0-shard-00-01.gbi1i.mongodb.net:27017,cluster0-shard-00-02.gbi1i.mongodb.net:27017/?ssl=true&replicaSet=atlas-codyet-shard-0&authSource=admin&appName=Cluster0`;


const client = new MongoClient(uri, {
      serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
      }
});

async function run() {
      try {
            await client.connect();
            const db = client.db("posakBari");

            const productCollection = db.collection("productData");
            const orderCollection = db.collection("orderData");
            const finalOrderCollection = db.collection("finalOrderData");


            app.get("/product", async (req, res) => {
                  let query = {};

                  // Jodi URL e category thake, tahole query update hobe
                  if (req.query.category) {
                        query = { category: req.query.category };

                  }

                  const result = await productCollection.find(query).toArray();
                  res.send(result);
            });


            app.get("/product/:id", async (req, res) => {
                  const id = req.params.id;

                  const result = await productCollection.findOne({
                        _id: new ObjectId(id),
                  });

                  res.send(result);
            });


            app.post('/addproduct', async (req, res) => {
                  const body = req.body
                  const result = await productCollection.insertOne(body)
                  res.send(result)
            })


            app.delete('/product/:id', async (req, res) => {
                  const id = req.params.id;
                  const query = { _id: new ObjectId(id) };
                  const result = await productCollection.deleteOne(query);
                  res.send(result);
            });

            // order post
            app.post('/ceheckout', async (req, res) => {
                  const body = req.body
                  const result = await orderCollection.insertOne(body)
                  res.send(result)
            })


            app.get("/ceheckout", async (req, res) => {
                  try {
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
                  const id = req.params.id;
                  const query = { _id: new ObjectId(id) };
                  const result = await orderCollection.deleteOne(query);
                  res.send(result);
            });


            // final order section 

            app.post('/order', async (req, res) => {
                  const body = req.body
                  const result = await finalOrderCollection.insertOne(body)
                  res.send(result)
            })

            app.get("/order", async (req, res) => {
                  const email = req.query.email;
                  let query = {};

                  // যদি ইমেল থাকে, তবে শুধু সেই ইমেলের অর্ডারগুলো ফিল্টার করবে
                  if (email) {
                        query = { "customer.email": email }; // যেহেতু ফরমের ডাটা 'customer' অবজেক্টের ভেতরে ইমেল রাখা হয়েছে
                  }

                  const result = await finalOrderCollection.find(query).toArray();
                  res.send(result);
            });


            // ইউজারের সব কার্ট আইটেমের অর্ডার স্ট্যাটাস true করার রাউট
            app.patch('/ceheckout/:email', async (req, res) => {
                  try {
                        const email = req.params.email;
                        const filter = { userEmail: email, order: false };
                        const updateDoc = {
                              $set: { order: true }
                        };
                        const result = await orderCollection.updateMany(filter, updateDoc);
                        res.send(result);
                  } catch (error) {
                        console.error("Error updating order status:", error);
                        res.status(500).send({ message: "Failed to update order status" });
                  }
            });


            // order data update action 

            // অর্ডারের স্ট্যাটাস আপডেট করার রাউট (PATCH)
            app.patch('/order/:id', async (req, res) => {
                  try {
                        const id = req.params.id;
                        const updatedStatus = req.body.status; // ফ্রন্টএন্ড থেকে পাঠানো নতুন স্ট্যাটাস (যেমন: 'processing' বা 'complete')

                        const filter = { _id: new ObjectId(id) }; // MongoDB-এর ObjectId ব্যবহার করতে হবে
                        const updateDoc = {
                              $set: {
                                    status: updatedStatus
                              },
                        };

                        const result = await finalOrderCollection.updateOne(filter, updateDoc);
                        res.send(result);
                  } catch (error) {
                        console.error("Error updating status:", error);
                        res.status(500).send({ error: "Failed to update status" });
                  }
            });


            app.delete('/order/:id', async (req, res) => {
                  const id = req.params.id;
                  const query = { _id: new ObjectId(id) };
                  const result = await finalOrderCollection.deleteOne(query);
                  res.send(result);
            });








            await client.db("admin").command({ ping: 1 });
            console.log("Pinged your deployment. You successfully connected to MongoDB!");
      } finally {

            await client.close();
      }


}
run().catch(console.dir);


// Home Route
app.get("/", (req, res) => {
      res.send("🚀 Posak Bari Backend Running...");
});


// Start Server
app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

module.exports = app;