require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
var jwt = require("jsonwebtoken"); //5/14/2025
// require('crypto').randomBytes(64).toString('hex')
// const serverless = require("serverless-http");

// email
const formData = require("form-data");
const Mailgun = require("mailgun.js");
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: "api",
  key: process.env.MAIL_GUN_API_KEY,
});

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// const uri = "mongodb+srv://<db_username>:<db_password>@cluster0.zof5niq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zof5niq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

//new

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // await global._mongoClientPromise;

    // connection
    const userCollection = client.db("KhabarKuriDb").collection("users");
    const menuCollection = client.db("KhabarKuriDb").collection("menu");
    const reviewCollection = client.db("KhabarKuriDb").collection("reviews");
    const cartCollection = client.db("KhabarKuriDb").collection("carts");
    const paymentCollection = client.db("KhabarKuriDb").collection("payments");
    const bookingCollection = client.db("KhabarKuriDb").collection("bookings");

    const notificationCollection = client
      .db("KhabarKuriDb")
      .collection("notifications");

    //new

    // jwt related apis
    app.post("/jwt", async (req, res) => {
      ////5/14/2025
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // midleware
    const verifyToken = (req, res, next) => {
      //5/15/2025
      // console.log("inside veryfy token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized Access!" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // use veryfy admin after veryfy token
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);

      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // users related api
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    //5/15/2025
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let isAdmin = false;
      if (user) {
        isAdmin = user?.role === "admin";
      }
      res.send({ isAdmin });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      // insert email if user doesn't exist
      // you can do this many ways(1. email unique, 2. upsert, 3, checking)
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exist", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(query, updatedDoc);
        res.send(result);
      }
    );

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // menu realted apis
    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });
    app.patch("/menu/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const query = { _id: id };
      const updatedDoc = {
        $set: {
          name: item.name,
          category: item.category,
          price: item.price,
          recipe: item.recipe,
          image: item.image,
        },
      };
      const result = await menuCollection.updateOne(query, updatedDoc);
      res.send(result);
    });
    // app.get("/menu/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };
    //   const result = await menuCollection.findOne(query);
    //   res.send(result);
    // });
    app.get("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const result = await menuCollection.findOne(query);
      res.send(result);
    });

    app.post("/menu", verifyToken, verifyAdmin, async (req, res) => {
      const item = req.body;
      const result = await menuCollection.insertOne(item);
      res.send(result);
    });
    app.delete("/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.deleteOne(query);
      res.send(result);
    });
    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    // carts collections
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });
    app.post("/carts", async (req, res) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result);
    });

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    // payment intent
    // app.post("/create-payment-intent", async (req, res) => {
    //   const { price } = req.body;
    //   const amount = parseInt(price * 100); // convert poysa
    //   console.log("ammount insiede intne", amount);
    //   const paymentIntent = await stripe.paymentIntent.create({
    //     amount: amount,
    //     currency: "usd",
    //     payment_method_types: ["card"],
    //   });
    //   res.send({
    //     clientSecret: paymentIntent.client_secret,
    //   });
    // });

    // user Related API

    // User stats endpoint
    app.get("/user-stats", verifyToken, async (req, res) => {
      try {
        const email = req.decoded.email;

        // Get total orders and amount spent
        const payments = await paymentCollection.find({ email }).toArray();
        const totalOrders = payments.length;
        const totalSpent = payments.reduce(
          (sum, payment) => sum + payment.price,
          0
        );
        const monthlyAverage =
          totalOrders > 0 ? totalSpent / (totalOrders / 3) : 0; // Assuming 3 months of data

        // Get favorite item (most ordered category)
        const orderStats = await paymentCollection
          .aggregate([
            { $match: { email } },
            { $unwind: "$menuItemIds" },
            {
              $lookup: {
                from: "menu",
                localField: "menuItemIds",
                foreignField: "_id",
                as: "menuItem",
              },
            },
            { $unwind: "$menuItem" },
            {
              $group: {
                _id: "$menuItem.category",
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 1 },
          ])
          .toArray();

        const favoriteItem = orderStats.length > 0 ? orderStats[0]._id : "None";

        res.send({
          totalSpent,
          totalOrders,
          monthlyAverage,
          favoriteItem,
        });
      } catch (error) {
        console.error("Error fetching user stats:", error);
        res.status(500).send({ message: "Error fetching user stats" });
      }
    });

    // Add review
    app.post("/reviews", verifyToken, async (req, res) => {
      try {
        const reviewData = req.body;
        const result = await reviewCollection.insertOne(reviewData);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error submitting review" });
      }
    });

    // Get user reviews
    app.get("/reviews/user/:email", verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        const reviews = await reviewCollection
          .find({ userEmail: email })
          .sort({ date: -1 })
          .toArray();
        res.send(reviews);
      } catch (error) {
        res.status(500).send({ message: "Error fetching reviews" });
      }
    });

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      console.log(price);

      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(price * 100), // amount in cents
          currency: "usd",
        });
        res.json({ clientSecret: paymentIntent.client_secret });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Stripe error" });
      }
    });

    // booking related API
    app.post("/bookings", verifyToken, async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    app.get("/bookings", verifyToken, async (req, res) => {
      const email = req.query.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "unauthorized access" });
      }
      const result = await bookingCollection.find({ email }).toArray();
      res.send(result);
    });

    app.get("/bookings/all", verifyToken, verifyAdmin, async (req, res) => {
      const result = await bookingCollection.find().toArray();
      res.send(result);
    });

    app.patch(
      "/bookings/status/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const status = req.body.status; // "approved", "rejected"
        const result = await bookingCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status } }
        );
        res.send(result);
      }
    );

    // payment related api
    app.get("/payments/:email", verifyToken, async (req, res) => {
      const query = { email: req.params.email };
      if (req.params.email != req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);

      // delete each item from the cart
      console.log("payment info", payment);
      const query = {
        _id: {
          $in: payment.cartIds.map((id) => new ObjectId(id)),
        },
      };
      const deleteResult = await cartCollection.deleteMany(query);

      // send user email about payment confirmation
      mg.messages
        .create(process.env.MAIL_SENDING_DOMAIN, {
          from: "Mailgun Sandbox <postmaster@sandboxbdfffae822db40f6b0ccc96ae1cb28f3.mailgun.org>",
          to: ["mdnajmulislam10992@gmail.com"],
          subject: "Khabar Kuri Order Confirmation",
          text: "Testing some Mailgun awesomness!",
          html: `
            <div>
              <h2>Thank you for your order</h2>
              <h4>Your Transaction Id: <strong>${payment.transactionId}</strong></h4>
              <p>We would like to get your feedback about the food</p>
            </div>
          `,
        })
        .then((msg) => console.log(msg)) // logs response data
        .catch((err) => console.log(err)); // logs any error`;

      res.send({ paymentResult, deleteResult });
    });

    // PATCH order status
    app.patch(
      "/payments/status/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const { status } = req.body;
        const result = await paymentCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status } }
        );
        res.send(result);
      }
    );
    // GET all payments (admin view)
    // app.get("/payments", verifyJWT, verifyAdmin, async (req, res) => {
    //   const result = await paymentCollection.find().toArray();
    //   res.send(result);
    // });
    app.get("/payments", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const result = await paymentCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching payments:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    // PUT /payments/:id
    // app.put("/payments/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const { status } = req.body;

    //   const result = await paymentCollection.updateOne(
    //     { _id: new ObjectId(id) },
    //     { $set: { status } }
    //   );
    //   res.send(result);
    // });

    app.put("/payments/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { status } = req.body;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ error: "Invalid ID" });
        }

        const order = await paymentCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!order) {
          return res.status(404).send({ error: "Order not found" });
        }

        const result = await paymentCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status } }
        );

        if (result.modifiedCount > 0) {
          await notificationCollection.insertOne({
            userEmail: order.email,
            message: `Your order "${order.transactionId}" status is updated to "${status}"`,
            status: status,
            read: false,
            createdAt: new Date(),
          });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating payment:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    // GET /notifications?email=user@example.com
    app.get("/notifications", async (req, res) => {
      const email = req.query.email;
      if (!email) return res.status(400).send({ error: "Email is required" });

      const result = await notificationCollection
        .find({ userEmail: email })
        .sort({ createdAt: -1 })
        .toArray();

      res.send(result);
    });

    // PATCH /notifications/mark-as-read?email=user@example.com
    app.patch("/notifications/mark-as-read", async (req, res) => {
      const email = req.query.email;

      if (!email) {
        return res.status(400).send({ error: "Email is required" });
      }

      try {
        const result = await notificationCollection.updateMany(
          { userEmail: email, read: false },
          { $set: { read: true } }
        );

        res.send({
          message: "Marked as read",
          modifiedCount: result.modifiedCount,
        });
      } catch (error) {
        console.error("Error marking notifications as read:", error);
        res.status(500).send({ error: "Failed to mark as read" });
      }
    });

    // stats or analytics 5/31/2025
    app.get("/admin-stats", verifyToken, verifyAdmin, async (req, res) => {
      const users = await userCollection.estimatedDocumentCount(); //faster count
      const menuItems = await menuCollection.estimatedDocumentCount();
      const orders = await paymentCollection.estimatedDocumentCount();
      //not best way
      // const payments = await paymentCollection.find().toArray();
      // const revenue =  payments.reduce((total,payment)=> total+payment.price,0)

      // best way
      const result = await paymentCollection
        .aggregate([
          {
            $group: {
              _id: null,
              totalRevinue: {
                $sum: "$price",
              },
            },
          },
        ])
        .toArray();
      const revenue = result.length > 0 ? result[0].totalRevinue : 0;
      res.send({
        users,
        menuItems,
        orders,
        revenue,
      });
    });

    // Order Status
    /**
     * ..........................
     *    Non - efficient way
     * 1. load all the paymnets
     * 2. for every menuItemsIds(which is an array), go find the item from menu collection
     * 3. for every item in the menu collection that you found from a payment entry(document)
     *
     */

    // using agregate pipeline
    //6/1/2025
    app.get("/order-stats", async (req, res) => {
      const result = await paymentCollection
        .aggregate([
          {
            $unwind: "$menuItemIds", //1st step where from ides collection to separate them
          },
          {
            $lookup: {
              from: "menu", // which collection will aggregate with main collection(payment)
              localField: "menuItemIds", // main filed id local key
              foreignField: "_id", // foreign key which is agregate collections id
              as: "menuItems",
            },
          },
          {
            $unwind: "$menuItems", // Convert menuItem array to object
          },
          {
            $group: {
              // Group by category
              _id: "$menuItems.category",
              quantity: {
                $sum: 1, // each heve 1
              },
              revenue: { $sum: "$menuItems.price" },
            },
          },
          {
            $project: {
              // Rename fields for clarity
              _id: 0, //ignore
              category: "$_id",
              quantity: "$quantity",
              revenue: "$revenue",
            },
          },
        ])
        .toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// Sample route
app.get("/", (req, res) => {
  res.send("Khabar Kuri server is running");
});

// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

/**
 * .......................................
 * naming convantion
 * app.get('/users')
 * app.get('/users/:id')
 * app.post('/users')
 * app.put('/users/:id')
 * app.patch('/users/:id')
 * app.delete('/users/:id')
 */
