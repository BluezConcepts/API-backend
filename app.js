const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const Database = require("./classes/database.js");

const app = express();
const port = 3000;

const router = express.Router();

// Enable CORS
app.use(
  cors({
    origin: "http://localhost:5173", // Allow requests from this origin
    methods: ["GET", "POST", "PUT", "DELETE"], // Allowed HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
  })
);

// Middleware om JSON-requests te parsen
app.use(bodyParser.json());

// GET campingspots
app.get("/campingspots", (req, res) => {
  const db = new Database();

  const query = `
  SELECT 
    cs.camping_spot_id, 
    cs.name AS camping_spot_name, 
    cs.location, 
    cs.price_per_night, 
    cs.capacity, 
    cs.availability_status,
    cs.description,
    COALESCE(AVG(r.rating), 0) AS average_rating,
    COALESCE(
        (SELECT i.image_url 
         FROM Image i 
         WHERE i.camping_spot_id = cs.camping_spot_id 
         ORDER BY i.upload_date DESC LIMIT 1),
        'https://via.placeholder.com/300x200'
    ) AS image_url,
    COALESCE(
        GROUP_CONCAT(DISTINCT t.name SEPARATOR ', '),
        'No tags available'
    ) AS tags,
    COALESCE(
        GROUP_CONCAT(DISTINCT a.name SEPARATOR ', '),
        'No amenities available'
    ) AS amenities
FROM 
    CampingSpot cs
LEFT JOIN 
    Review r 
ON 
    cs.camping_spot_id = r.camping_spot_id
LEFT JOIN 
    CampingSpotTag cst 
ON 
    cs.camping_spot_id = cst.camping_spot_id
LEFT JOIN 
    Tag t 
ON 
    cst.tag_id = t.tag_id
LEFT JOIN 
    CampingSpotAmenity csa
ON 
    cs.camping_spot_id = csa.camping_spot_id
LEFT JOIN 
    Amenity a
ON 
    csa.amenity_id = a.amenity_id
GROUP BY 
    cs.camping_spot_id
ORDER BY 
    average_rating DESC;

`;
  db.getQuery(query)
    .then((campingSpots) => {
      res.send(campingSpots);
    })
    .catch((err) => {
      console.error(err);
      res
        .status(500)
        .send("An error occurred while fetching camping spots with ratings.");
    });
});

//specifieke campingspot.
app.get("/campingspots/:id", (req, res) => {
  const db = new Database();
  // req.params.id;
  const query = `
  SELECT 
  cs.camping_spot_id, 
  cs.name AS camping_spot_name, 
  cs.location, 
  cs.price_per_night, 
  cs.capacity, 
  cs.availability_status,
  cs.description,
  COALESCE(AVG(r.rating), 0) AS average_rating,
  COALESCE(
      (SELECT i.image_url 
       FROM Image i 
       WHERE i.camping_spot_id = cs.camping_spot_id 
       ORDER BY i.upload_date DESC LIMIT 1),
      'https://via.placeholder.com/300x200'
  ) AS image_url,
  COALESCE(
      GROUP_CONCAT(DISTINCT t.name SEPARATOR ', '),
      NULL
  ) AS tags,
  COALESCE(
      GROUP_CONCAT(DISTINCT a.name SEPARATOR ', '),
      NULL
  ) AS amenities -- Add amenities here
FROM 
  CampingSpot cs
LEFT JOIN 
  Review r 
ON 
  cs.camping_spot_id = r.camping_spot_id
LEFT JOIN 
  CampingSpotTag cst 
ON 
  cs.camping_spot_id = cst.camping_spot_id
LEFT JOIN 
  Tag t 
ON 
  cst.tag_id = t.tag_id
LEFT JOIN 
  CampingSpotAmenity csa
ON 
  cs.camping_spot_id = csa.camping_spot_id
LEFT JOIN 
  Amenity a
ON 
  csa.amenity_id = a.amenity_id
WHERE 
  cs.camping_spot_id = '${req.params.id}'
GROUP BY 
  cs.camping_spot_id
ORDER BY 
  average_rating DESC;    
  `;
  db.getQuery(query).then((campingSpot) => {
    if (campingSpot[0]) {
      res.send(campingSpot[0]);
    } else {
      res.sendStatus(404);
    }
  });
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

//LOGIN CHECK

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Validate request body
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  try {
    const db = new Database();

    // Query to find the user by email and password
    const query = `
        SELECT user_id, name, email, is_owner 
        FROM User 
        WHERE email = ? AND password = ?`;

    const users = await db.getQuery(query, [email, password]);

    if (users.length === 0) {
      // No matching user found
      return res.status(404).json({
        message: "Invalid credentials. Please check your email and password.",
      });
    }

    const user = users[0];

    // Send success response
    res.status(200).json({
      message: "Login successful.",
      user: {
        userId: user.user_id,
        email: user.email,
        name: user.name,
        isOwner: user.is_owner, // Boolean to indicate if the user is an owner
      },
    });
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).json({ message: "An error occurred during login." });
  }
});

//REGISTER CHECK

app.post("/register", async (req, res) => {
  const { name, email, password, isOwner } = req.body;

  // Validate request body
  if (!name || !email || !password || typeof isOwner !== "boolean") {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const db = new Database();

    // Check if the email already exists
    const checkEmailQuery = "SELECT * FROM User WHERE email = ?";
    const users = await db.getQuery(checkEmailQuery, [email]);

    if (users.length > 0) {
      return res.status(409).json({
        message:
          "Email already in use. Try logging in or resetting your password.",
      });
    }

    // Insert new user
    const insertQuery = `
        INSERT INTO User (name, email, password, phone_number, is_owner, profile_picture)
        VALUES (?, ?, ?, ?, ?, ?)`;
    const defaultPhoneNumber = "0000000000"; // Placeholder for phone number
    const defaultProfilePicture = "default.jpg"; // Placeholder for profile picture

    await db.getQuery(insertQuery, [
      name,
      email,
      password,
      defaultPhoneNumber,
      isOwner,
      defaultProfilePicture,
    ]);

    res.status(201).json({ message: "Registration successful." });
  } catch (err) {
    console.error("Error during registration:", err);
    res.status(500).json({ message: "An error occurred during registration." });
  }
});

//backend query for feautered carousel homepage;
app.get("/featured-campingspots", async (req, res) => {
  const db = new Database();

  const query = `
      SELECT 
        cs.camping_spot_id AS id, 
        cs.name, 
        cs.location, 
        COALESCE(
          (SELECT image_url 
           FROM Image 
           WHERE camping_spot_id = cs.camping_spot_id 
           ORDER BY upload_date DESC LIMIT 1), 
          'https://via.placeholder.com/300x200'
        ) AS image
      FROM CampingSpot cs
      ORDER BY cs.camping_spot_id 
      LIMIT 5;
    `;

  try {
    const spots = await db.getQuery(query);
    res.status(200).json(spots);
  } catch (err) {
    console.error("Error fetching featured camping spots:", err);
    res.status(500).send("An error occurred while fetching camping spots.");
  }
});

// PROFILE SECTION CHANGE PASS
app.put("/profile/password", async (req, res) => {
  const db = new Database();
  const { userId, password, newPassword } = req.body;

  try {
    const query =
      "UPDATE User SET password = ? WHERE user_id = ? AND password = ?";
    const result = await db.getQuery(query, [newPassword, userId, password]);

    if (result.affectedRows === 0) {
      return res.status(400).json({ message: "Incorrect current password." });
    }

    res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update password." });
  }
});

//BOOKING endpoint
app.get("/my-bookings", async (req, res) => {
  const userId = req.query.userId;

  const query = `
      SELECT * FROM Booking WHERE user_id = ?
    `;

  try {
    const db = new Database();
    const bookings = await db.getQuery(query, [userId]);
    res.send(bookings);
    // res.status(200).json({ message: "Booking created successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to get bookings." });
  }
});

//create booking endpoint yayy

app.post("/create-booking", async (req, res) => {
  const { campingSpotId, startDate, endDate, guestCount, userId } = req.body;

  // Validate input
  if (!campingSpotId || !startDate || !endDate || !guestCount || !userId) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const db = new Database();

  try {
    // Fetch price per night for the camping spot
    const priceQuery = `
      SELECT price_per_night 
      FROM CampingSpot 
      WHERE camping_spot_id = ?
    `;
    const [priceResult] = await db.executeQuery(priceQuery, [campingSpotId]);

    if (priceResult.length === 0) {
      return res.status(404).json({ error: "Camping spot not found." });
    }

    const pricePerNight = priceResult[0].price_per_night;

    // Calculate the total price
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const duration = (endDateObj - startDateObj) / (1000 * 60 * 60 * 24); // Duration in days

    if (duration <= 0) {
      return res
        .status(400)
        .json({ error: "End date must be after the start date." });
    }

    console.error(pricePerNight);
    console.error(duration);

    const totalPrice = duration * pricePerNight;

    // Insert the booking into the database
    const createBookingQuery = `
      INSERT INTO Booking (camping_spot_id, start_date, end_date, total_price, status, capacity, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const bookingData = [
      campingSpotId,
      startDate,
      endDate,
      totalPrice,
      "Pending", // Default status
      guestCount,
      userId,
    ];

    const result = await db.executeQuery(createBookingQuery, bookingData);

    // if (result.affectedRows === 1) {
    return res
      .status(201)
      .json({ message: "Booking created successfully.", totalPrice });
    // } else {
    //   return res.status(500).json({ error: "Failed to create booking." });
    // }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "An error occurred while creating the booking." });
  }
});

//owner spots fetching
app.get("/owner-spots", async (req, res) => {
  const ownerId = req.query.ownerId;
  if (!ownerId) {
    return res.status(400).json({ message: "Owner ID is required" });
  }

  const query = `
    SELECT 
      cs.camping_spot_id,
      cs.name,
      cs.location,
      cs.price_per_night
    FROM CampingSpot cs
    WHERE cs.owner_id = ?;
  `;

  try {
    const db = new Database();
    const spots = await db.getQuery(query, [ownerId]);
    res.status(200).json(spots);
  } catch (err) {
    console.error("Error fetching camping spots:", err);
    res.status(500).json({ message: "Failed to fetch camping spots." });
  }
});

//PUSH POST AQCUIRED DATA FOR CREATING NEW CAMPING SPOT TO DATabASE
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

app.post("/create-campingspot", upload.array("images"), async (req, res) => {
  const {
    name,
    capacity,
    price_per_night,
    location,
    description,
    tags,
    amenities,
    owner_id,
  } = req.body;
  const images = req.files;

  try {
    const db = new Database();
    const query = `
      INSERT INTO CampingSpot (name, capacity, price_per_night, location, description, owner_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const queryResult = await db.getQuery(query, [
      name,
      capacity,
      price_per_night,
      location,
      description,
      owner_id,
    ]);

    // Ensure tags and amenities are arrays
    let parsedTags = Array.isArray(tags) ? tags : tags.split(",") || [];
    if (parsedTags[0] === "") {
      parsedTags = [];
    }
    let parsedAmenities = Array.isArray(amenities)
      ? amenities
      : amenities.split(",") || [];

    if (parsedAmenities[0] === "") {
      parsedAmenities = [];
    }

    // Update tags
    if (parsedTags && parsedTags.length > 0) {
      const insertTagsQuery = `
        INSERT INTO CampingSpotTag (camping_spot_id, tag_id) 
        VALUES ${parsedTags.map(() => "(?, ?)").join(", ")}
      `;
      const tagValues = parsedTags.flatMap((tagId) => [
        queryResult.insertId,
        tagId,
      ]);
      await db.getQuery(insertTagsQuery, tagValues);
    }

    // Update amenities
    if (parsedAmenities && parsedAmenities.length > 0) {
      const insertAmenitiesQuery = `
        INSERT INTO CampingSpotAmenity (camping_spot_id, amenity_id) 
        VALUES ${parsedAmenities.map(() => "(?, ?)").join(", ")}
      `;
      const amenityValues = parsedAmenities.flatMap((amenityId) => [
        queryResult.insertId,
        amenityId,
      ]);
      await db.getQuery(insertAmenitiesQuery, amenityValues);
    }

    // Handle file upload logic here (e.g., save file paths to database)
    res.status(201).send("Camping spot created successfully!");
  } catch (error) {
    console.error("Error creating camping spot:", error);
    res.status(500).send("Failed to create camping spot.");
  }
});

app.delete("/delete-campingspot/:id", async (req, res) => {
  const campingSpotId = req.params.id;

  if (!campingSpotId) {
    return res.status(400).json({ message: "Camping spot ID is required." });
  }

  try {
    const db = new Database();

    // Delete related images
    const deleteImagesQuery = `DELETE FROM Image WHERE camping_spot_id = ?`;
    await db.getQuery(deleteImagesQuery, [campingSpotId]);

    // Delete related tags
    const deleteTagsQuery = `DELETE FROM CampingSpotTag WHERE camping_spot_id = ?`;
    await db.getQuery(deleteTagsQuery, [campingSpotId]);

    // Delete related amenities
    const deleteAmenitiesQuery = `DELETE FROM CampingSpotAmenity WHERE camping_spot_id = ?`;
    await db.getQuery(deleteAmenitiesQuery, [campingSpotId]);

    // Delete the camping spot
    const deleteCampingSpotQuery = `DELETE FROM CampingSpot WHERE camping_spot_id = ?`;
    const result = await db.getQuery(deleteCampingSpotQuery, [campingSpotId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Camping spot not found." });
    }

    res.status(200).json({ message: "Camping spot deleted successfully." });
  } catch (error) {
    console.error("Error deleting camping spot:", error);
    res.status(500).json({ message: "Failed to delete camping spot." });
  }
});

app.put("/update-campingspot/:id", upload.array("images"), async (req, res) => {
  const {
    name,
    capacity,
    price_per_night,
    location,
    description,
    tags, // Should be an array of tag IDs
    amenities, // Should be an array of amenity IDs
  } = req.body;
  const images = req.files;
  const campingSpotId = req.params.id;

  try {
    const db = new Database();

    console.error("sakdjjlkafdsjlfdsa;jlkdfa;jkldfs");
    console.error(JSON.stringify(amenities));

    // Update the camping spot details
    const updateQuery = `
      UPDATE CampingSpot 
      SET name = ?, 
          capacity = ?, 
          price_per_night = ?, 
          location = ?, 
          description = ?
      WHERE camping_spot_id = ?
    `;
    await db.getQuery(updateQuery, [
      name,
      capacity,
      price_per_night,
      location,
      description,
      campingSpotId,
    ]);

    // Ensure tags and amenities are arrays
    let parsedTags = Array.isArray(tags) ? tags : tags.split(",") || [];
    if (parsedTags[0] === "") {
      parsedTags = [];
    }
    let parsedAmenities = Array.isArray(amenities)
      ? amenities
      : amenities.split(",") || [];

    if (parsedAmenities[0] === "") {
      parsedAmenities = [];
    }

    // Update tags
    const deleteTagsQuery = `DELETE FROM CampingSpotTag WHERE camping_spot_id = ?`;
    await db.getQuery(deleteTagsQuery, [campingSpotId]);

    console.error("weeeee");
    // console.error(JSON.stringify(parsed));

    if (parsedTags && parsedTags.length > 0) {
      const insertTagsQuery = `
        INSERT INTO CampingSpotTag (camping_spot_id, tag_id) 
        VALUES ${parsedTags.map(() => "(?, ?)").join(", ")}
      `;
      const tagValues = parsedTags.flatMap((tagId) => [campingSpotId, tagId]);
      await db.getQuery(insertTagsQuery, tagValues);
    }

    // Update amenities
    const deleteAmenitiesQuery = `DELETE FROM CampingSpotAmenity WHERE camping_spot_id = ?`;
    await db.getQuery(deleteAmenitiesQuery, [campingSpotId]);

    console.log("reeeeeeee");
    console.log(JSON.stringify(parsedAmenities));

    if (parsedAmenities && parsedAmenities.length > 0) {
      const insertAmenitiesQuery = `
        INSERT INTO CampingSpotAmenity (camping_spot_id, amenity_id) 
        VALUES ${parsedAmenities.map(() => "(?, ?)").join(", ")}
      `;
      const amenityValues = parsedAmenities.flatMap((amenityId) => [
        campingSpotId,
        amenityId,
      ]);
      await db.getQuery(insertAmenitiesQuery, amenityValues);
    }

    // Handle image uploads
    if (images && images.length > 0) {
      const deleteImagesQuery = `DELETE FROM Image WHERE camping_spot_id = ?`;
      await db.getQuery(deleteImagesQuery, [campingSpotId]);

      const insertImagesQuery = `
        INSERT INTO Image (camping_spot_id, image_url, alt_text) 
        VALUES ${images.map(() => "(?, ?, ?)").join(", ")}
      `;
      const imageValues = images.flatMap((image) => [
        campingSpotId,
        `/uploads/${image.filename}`,
        image.originalname,
      ]);
      await db.getQuery(insertImagesQuery, imageValues);
    }

    res.status(200).send("Camping spot updated successfully!");
  } catch (error) {
    console.error("Error updating camping spot:", error);
    res.status(500).send("Failed to update camping spot.");
  }
});

// get all bookings of specific campingspot

app.get("/camping-spot-bookings", async (req, res) => {
  const db = new Database();
  const { campingSpotId } = req.query;

  if (!campingSpotId) {
    return res.status(400).json({ message: "Camping spot ID is required." });
  }

  const query = `
    SELECT 
      b.booking_id,
      u.name AS user_name,
      u.email AS user_email,
      b.start_date,
      b.end_date,
      b.total_price,
      b.capacity,
      b.status
    FROM Booking b
    JOIN User u ON b.user_id = u.user_id
    WHERE b.camping_spot_id = ?;
  `;

  try {
    const db = new Database();
    const bookings = await db.getQuery(query, [campingSpotId]);
    res.status(200).json(bookings);
  } catch (err) {
    console.error("Error fetching bookings:", err);
    res.status(500).json({ message: "Failed to fetch bookings." });
  }
});

//accept booking
//const Database = require("./database");
//const db = new Database();

app.post("/accept-booking/:bookingId", async (req, res) => {
  const db = new Database();
  const { bookingId } = req.params;

  if (!bookingId) {
    return res.status(400).json({ message: "Booking ID is required." });
  }

  const query = `
    UPDATE Booking
    SET status = 'Accepted'
    WHERE booking_id = ?;
  `;

  try {
    const result = await db.executeQuery(query, [bookingId]);
    if (result[0].affectedRows === 0) {
      return res.status(404).json({ message: "Booking not found." });
    }
    res.status(200).json({ message: "Booking accepted successfully." });
  } catch (error) {
    console.error("Error accepting booking:", error);
    res.status(500).json({ message: "Failed to accept the booking." });
  }
});

//decline boookign req
app.post("/decline-booking/:bookingId", async (req, res) => {
  const db = new Database();
  const { bookingId } = req.params;

  if (!bookingId) {
    return res.status(400).json({ message: "Booking ID is required." });
  }

  const query = `
    UPDATE Booking
    SET status = 'Declined'
    WHERE booking_id = ?;
  `;

  try {
    const result = await db.executeQuery(query, [bookingId]);
    if (result[0].affectedRows === 0) {
      return res.status(404).json({ message: "Booking not found." });
    }
    res.status(200).json({ message: "Booking declined successfully." });
  } catch (error) {
    console.error("Error declining booking:", error);
    res.status(500).json({ message: "Failed to decline the booking." });
  }
});

//UNAVAILABILITY DATES
app.get("/unavailable-dates", async (req, res) => {
  const { campingSpotId } = req.query;
  if (!campingSpotId) {
    return res.status(400).json({ message: "Camping spot ID is required." });
  }

  const query = `
    SELECT start_date, end_date, reason 
    FROM UnavailableDates 
    WHERE camping_spot_id = ?;
  `;

  try {
    const db = new Database();
    const unavailableDates = await db.getQuery(query, [campingSpotId]);
    res.status(200).json(unavailableDates);
  } catch (err) {
    console.error("Error fetching unavailable dates:", err);
    res.status(500).json({ message: "Failed to fetch unavailable dates." });
  }
});
