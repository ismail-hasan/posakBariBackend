const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const multer = require('multer');
const cloudinary = require('cloudinary').v2;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());



cloudinary.config({
      cloud_name: 'usdt0zsd',
      api_key: '441784874433794',
      api_secret: '9ypR0EyywZ3Bz0EpswdceMamh5U'
});

const upload = multer({ storage: multer.memoryStorage() });


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

// // final order section
// app.post('/order', async (req, res) => {
//       try {
//             const db = await getDB();
//             const finalOrderCollection = db.collection("finalOrderData");
//             const result = await finalOrderCollection.insertOne(req.body);
//             res.send(result);
//       } catch (error) {
//             console.error("Error creating final order:", error);
//             res.status(500).send({ error: "Internal Server Error" });
//       }
// });


// oder section new add ?// final order section
app.post('/order', async (req, res) => {
      try {
            const db = await getDB();

            const finalOrderCollection = db.collection("finalOrderData");
            const productCollection = db.collection("productData");

            const { items } = req.body;

            if (!Array.isArray(items) || items.length === 0) {
                  return res.status(400).send({
                        success: false,
                        message: "Order items not found"
                  });
            }

            // ==========================================
            // 1. আগে সব product-এর stock check
            // ==========================================

            for (const item of items) {
                  const productId = item.productId;
                  const quantity = Number(item.quantity);

                  console.log("Checking product:", {
                        productId,
                        quantity
                  });

                  if (!productId || quantity <= 0) {
                        return res.status(400).send({
                              success: false,
                              message: "Invalid product or quantity"
                        });
                  }

                  const product = await productCollection.findOne({
                        _id: new ObjectId(productId)
                  });

                  console.log("Found product:", product);

                  if (!product) {
                        return res.status(404).send({
                              success: false,
                              message: "Product not found"
                        });
                  }

                  const currentStock = Number(product.stock || 0);

                  if (currentStock < quantity) {
                        return res.status(400).send({
                              success: false,
                              message: `${product.name} এর পর্যাপ্ত stock নেই। Available stock: ${currentStock}`
                        });
                  }
            }

            // ==========================================
            // 2. Stock কমানো
            // ==========================================

            for (const item of items) {
                  const productId = item.productId;
                  const quantity = Number(item.quantity);

                  const updateResult = await productCollection.updateOne(
                        {
                              _id: new ObjectId(productId),
                              stock: { $gte: quantity }
                        },
                        {
                              $inc: {
                                    stock: -quantity
                              }
                        }
                  );

                  console.log("Stock update result:", {
                        productId,
                        quantity,
                        matchedCount: updateResult.matchedCount,
                        modifiedCount: updateResult.modifiedCount
                  });

                  // Stock update না হলে order বন্ধ
                  if (updateResult.matchedCount === 0) {
                        return res.status(400).send({
                              success: false,
                              message: "Stock update করা যায়নি। আবার চেষ্টা করুন।"
                        });
                  }
            }

            // ==========================================
            // 3. Final Order Save
            // ==========================================

            const result = await finalOrderCollection.insertOne(req.body);

            res.send({
                  success: true,
                  insertedId: result.insertedId,
                  message: "Order placed successfully"
            });

      } catch (error) {
            console.error("Error creating final order:", error);

            res.status(500).send({
                  success: false,
                  error: "Internal Server Error"
            });
      }
});



// 




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

// new add addCampaign

app.post('/addcam', async (req, res) => {
      const db = await getDB();
      const addCampignCollection = db.collection("addCampign");
      const body = req.body
      const result = await addCampignCollection.insertOne(body)
      res.send(result)
})


app.get("/addcam", async (req, res) => {
      const db = await getDB();
      const addCampignCollection = db.collection("addCampign");
      let query = {};
      const result = await addCampignCollection.find(query).toArray();
      res.send(result);
});

// super deal 
app.post('/superdeal', async (req, res) => {
      const db = await getDB();
      const superDealCollection = db.collection("superDeal");
      const body = req.body
      const result = await superDealCollection.insertOne(body)
      res.send(result)
})


app.get("/superdeal", async (req, res) => {
      const db = await getDB();
      const superDealCollection = db.collection("superDeal");
      let query = {};
      const result = await superDealCollection.find(query).toArray();
      res.send(result);
});



app.delete('/superdeal/:id', async (req, res) => {
      const db = await getDB();
      const superDealCollection = db.collection("superDeal");
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await superDealCollection.deleteOne(query);
      res.send(result);
});

app.delete('/addcam/:id', async (req, res) => {
      const db = await getDB();
      const addCampignCollection = db.collection("addCampign");
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await addCampignCollection.deleteOne(query);
      res.send(result);
});


// manufetcure 

app.post('/manufacture', async (req, res) => {
      const db = await getDB();
      const manufactureOrderCollection = db.collection("manufactureOrder");
      const body = req.body
      const result = await manufactureOrderCollection.insertOne(body)
      res.send(result)
})



app.get("/manufacture", async (req, res) => {
      const db = await getDB();
      const manufactureOrderCollection = db.collection("manufactureOrder");
      let query = {};
      const result = await manufactureOrderCollection.find(query).toArray();
      res.send(result);
});


/// manufetcher id pathh

app.patch("/manufacture/:id", async (req, res) => {
      try {
            const db = await getDB();
            const manufactureOrderCollection = db.collection("manufactureOrder");
            const { id } = req.params;
            const { status } = req.body;

            if (!status) {
                  return res.status(400).send({
                        message: "Status is required",
                  });
            }

            const result = await manufactureOrderCollection.updateOne(
                  { _id: new ObjectId(id) },
                  {
                        $set: {
                              status: status,
                        },
                  }
            );

            if (result.matchedCount === 0) {
                  return res.status(404).send({
                        message: "Order not found",
                  });
            }

            res.send({
                  success: true,
                  message: "Order status updated successfully",
                  status: status,
            });
      } catch (error) {
            console.error("Status update error:", error);

            res.status(500).send({
                  success: false,
                  message: "Failed to update order status",
                  error: error.message,
            });
      }
});

app.delete("/manufacture/:id", async (req, res) => {
      try {

            const db = await getDB();
            const manufactureOrderCollection = db.collection("manufactureOrder");
            const { id } = req.params;

            const result = await manufactureOrderCollection.deleteOne({
                  _id: new ObjectId(id),
            });

            if (result.deletedCount === 0) {
                  return res.status(404).send({
                        success: false,
                        message: "Order not found",
                  });
            }

            res.send({
                  success: true,
                  message: "Order deleted successfully",
            });
      } catch (error) {
            console.error("Delete order error:", error);

            res.status(500).send({
                  success: false,
                  message: "Failed to delete order",
                  error: error.message,
            });
      }
});


// app.post('/upload', upload.single('image'), async (req, res) => {
//       try {
//             // ১. সবার আগে চেক করা ফাইল এসেছে কি না
//             if (!req.file) {
//                   return res.status(400).json({ error: 'কোনো ফাইল পাওয়া যায়নি!' });
//             }

//             // ২. ফ্রন্টএন্ড থেকে পাঠানো কালেকশনের নাম ধরা (না পাঠালে ডিফল্ট 'imageData' ধরবে)
//             const collectionName = req.body.collectionName || "imageData";

//             // ৩. ফাইলকে Base64 করে Cloudinary-তে পাঠানো
//             const fileStr = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
//             const uploadResponse = await cloudinary.uploader.upload(fileStr);

//             // ৪. ডাটাবেজ থেকে DB কানেক্ট করা এবং ডাইনামিক কালেকশন সেট করা
//             const db = await getDB();
//             const targetCollection = db.collection(collectionName);

//             // ৫. Cloudinary থেকে পাওয়া URL ডাটাবেজে সেভ করা
//             const imageDoc = {
//                   imageUrl: uploadResponse.secure_url,
//                   createdAt: new Date()
//             };
//             const result = await targetCollection.insertOne(imageDoc);

//             // ৬. সফল রেসপন্স পাঠানো
//             res.json({
//                   success: true,
//                   url: uploadResponse.secure_url,
//                   insertedId: result.insertedId
//             });

//       } catch (err) {
//             console.error("SERVER ERROR:", err);
//             res.status(500).json({ error: err.message || 'আপলোড বা ডাটাবেজে সেভ করতে সমস্যা হয়েছে!' });
//       }
// });
/////////////category//////////////////////////////
app.post('/upload', upload.single('image'), async (req, res) => {
      try {
            // ১. ফাইল এসেছে কি না চেক
            if (!req.file) {
                  return res.status(400).json({
                        error: 'কোনো ফাইল পাওয়া যায়নি!'
                  });
            }

            // ২. Image → Base64
            const fileStr = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

            // ৩. Cloudinary-তে Upload
            const uploadResponse = await cloudinary.uploader.upload(fileStr);

            // ৪. শুধু Cloudinary URL frontend-এ পাঠানো হবে
            // MongoDB-তে এখানে কোনো data save হবে না
            res.json({
                  success: true,
                  url: uploadResponse.secure_url
            });

      } catch (err) {
            console.error("SERVER ERROR:", err);

            res.status(500).json({
                  error:
                        err.message ||
                        'ছবি আপলোড করতে সমস্যা হয়েছে!'
            });
      }
});

///////////////////////////////////////

app.post('/category', async (req, res) => {
      const db = await getDB();
      const addCategoryCollection = db.collection("addCategory");
      const body = req.body
      const result = await addCategoryCollection.insertOne(body)
      res.send(result)
})


app.get("/category", async (req, res) => {
      const db = await getDB();
      const addCategoryCollection = db.collection("addCategory");
      let query = {};
      const result = await addCategoryCollection.find(query).toArray();
      res.send(result);
});


app.delete('/category/:id', async (req, res) => {
      const db = await getDB();
      const addCategoryCollection = db.collection("addCategory");
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await addCategoryCollection.deleteOne(query);
      res.send(result);
});





// Local development e chalate hole (Vercel deploy er jonno eta lagbe na,
// karon Vercel nijei server handle kore)
if (process.env.NODE_ENV !== 'production') {
      app.listen(PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${PORT}`);
      });
}

module.exports = app;