-- Create Database
CREATE DATABASE IF NOT EXISTS CampingSpotsApp;
USE CampingSpotsApp;

-- Users Table
CREATE TABLE User (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    phone_number VARCHAR(20),
    is_owner BOOLEAN,
    profile_picture VARCHAR(255)
);

CREATE TABLE CampingSpot (
    camping_spot_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    location VARCHAR(255),
    price_per_night DECIMAL(10, 2),
    capacity INT,
    availability_status BOOLEAN DEFAULT TRUE, -- General availability of the spot
    owner_id INT,
    FOREIGN KEY (owner_id) REFERENCES User(user_id) ON DELETE CASCADE
);

-- Unavailable Dates Table
CREATE TABLE UnavailableDates (
    unavailable_date_id INT AUTO_INCREMENT PRIMARY KEY,
    camping_spot_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason ENUM('Owner Unavailability', 'Booking') DEFAULT 'Booking',
    FOREIGN KEY (camping_spot_id) REFERENCES CampingSpot(camping_spot_id) ON DELETE CASCADE
);

-- Bookings Table
CREATE TABLE Booking (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    camping_spot_id INT,
    start_date VARCHAR(60),
    end_date VARCHAR(60),
    total_price DECIMAL(10, 2),
    status ENUM('Pending', 'Accepted', 'Declined', 'Completed') DEFAULT 'Pending',
    capacity INT,
    FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE,
    FOREIGN KEY (camping_spot_id) REFERENCES CampingSpot(camping_spot_id) ON DELETE CASCADE
);

-- Reviews Table
CREATE TABLE Review (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    camping_spot_id INT,
    rating INT,
    comment TEXT,
    review_date DATE,
    FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE,
    FOREIGN KEY (camping_spot_id) REFERENCES CampingSpot(camping_spot_id) ON DELETE CASCADE
);

-- Images Table
CREATE TABLE Image (
    image_id INT AUTO_INCREMENT PRIMARY KEY,
    camping_spot_id INT,
    image_url VARCHAR(255),
    alt_text VARCHAR(255),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (camping_spot_id) REFERENCES CampingSpot(camping_spot_id) ON DELETE CASCADE
);

-- Favorites Table
CREATE TABLE Favorite (
    favorite_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    camping_spot_id INT,
    FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE,
    FOREIGN KEY (camping_spot_id) REFERENCES CampingSpot(camping_spot_id) ON DELETE CASCADE
);

-- Tags Table
CREATE TABLE Tag (
    tag_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255)
);

-- CampingSpot-Tag Table
CREATE TABLE CampingSpotTag (
    camping_spot_id INT,
    tag_id INT,
    PRIMARY KEY (camping_spot_id, tag_id),
    FOREIGN KEY (camping_spot_id) REFERENCES CampingSpot(camping_spot_id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES Tag(tag_id) ON DELETE CASCADE
);

-- Amenities Table
CREATE TABLE Amenity (
    amenity_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    description TEXT
);

-- CampingSpot-Amenity Table
CREATE TABLE CampingSpotAmenity (
    camping_spot_id INT,
    amenity_id INT,
    PRIMARY KEY (camping_spot_id, amenity_id),
    FOREIGN KEY (camping_spot_id) REFERENCES CampingSpot(camping_spot_id) ON DELETE CASCADE,
    FOREIGN KEY (amenity_id) REFERENCES Amenity(amenity_id) ON DELETE CASCADE
);

-- Notifications Table
CREATE TABLE Notification (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    content TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE
);

-- TRIGGERS for unavailabilty after booking INSERT
DELIMITER $$

CREATE TRIGGER after_booking_insert
AFTER INSERT ON Booking
FOR EACH ROW
BEGIN
    INSERT INTO UnavailableDates (camping_spot_id, start_date, end_date, reason)
    VALUES (NEW.camping_spot_id, NEW.start_date, NEW.end_date, 'Booking');
END$$

DELIMITER ;


-- TRIGGERS for unavailabilty after booking DELETE

DELIMITER $$

CREATE TRIGGER after_booking_delete
AFTER DELETE ON Booking
FOR EACH ROW
BEGIN
    DELETE FROM UnavailableDates
    WHERE camping_spot_id = OLD.camping_spot_id
      AND start_date = OLD.start_date
      AND end_date = OLD.end_date
      AND reason = 'Booking';
END$$

DELIMITER ;



-- Insert Users
INSERT INTO User (name, email, password, phone_number, is_owner, profile_picture)
VALUES 
    ('Alice Camper', 'alice@example.com', 'password123', '0489123456', FALSE, 'alice.jpg'),
    ('Bob Owner', 'bob@example.com', 'password456', '0479123456', TRUE, 'bob.jpg'),
    ('Charlie Explorer', 'charlie@example.com', 'charliePass', '0498123456', FALSE, 'charlie.jpg'),
    ('Dana Wanderlust', 'dana@example.com', 'danaPass', '0468123456', FALSE, 'dana.jpg'),
    ('Fiona Nomad', 'fiona@example.com', 'fionaPass', '0478123456', TRUE, 'fiona.jpg');

-- Insert Camping Spots with owner_id
INSERT INTO CampingSpot (name, description, location, price_per_night, capacity, availability_status, owner_id)
VALUES
    ('Camp Sunny', 'A lovely spot in the Ardennes', 'Durbuy, Belgium', 30.00, 4, TRUE, 2),
    ('Forest Edge', 'Perfect for nature lovers', 'Ghent, Belgium', 25.00, 3, TRUE, 2),
    ('Seaside Retreat', 'Relax by the sea', 'Ostend, Belgium', 40.00, 5, FALSE, 2),
    ('Mountain View', 'A serene mountain campsite with stunning views', 'Spa, Belgium', 35.00, 6, TRUE, 5),
    ('Riverfront Haven', 'Camp by the river and enjoy kayaking', 'Dinant, Belgium', 45.00, 8, TRUE, 5);

-- Insert Bookings (only non-owners)
INSERT INTO Booking (user_id, camping_spot_id, start_date, end_date, total_price, status)
VALUES
    (1, 1, '2024-07-01', '2024-07-05', 120.00, 'Completed'),
    (3, 2, '2024-08-10', '2024-08-15', 125.00, 'Completed'),
    (4, 3, '2024-09-01', '2024-09-03', 80.00, 'Completed');

-- Insert Reviews
INSERT INTO Review (user_id, camping_spot_id, rating, comment, review_date)
VALUES
    (1, 1, 5, 'Great family-friendly camping spot!', '2024-07-06'),
    (3, 2, 4, 'Cozy place but a bit crowded.', '2024-08-16'),
    (4, 3, 5, 'Beautiful seaside location!', '2024-09-04');

-- Insert Images
INSERT INTO Image (camping_spot_id, image_url, alt_text)
VALUES
    (1, 'https://example.com/camp-sunny.jpg', 'Camp Sunny Image'),
    (2, 'https://example.com/forest-edge.jpg', 'Forest Edge Image'),
    (3, 'https://example.com/seaside-retreat.jpg', 'Seaside Retreat Image');

-- Insert Tags
INSERT INTO Tag (name)
VALUES
    ('Near a city'),
    ('Near a forest'),
    ('Near a lake'),
    ('Near the beach'),
    ('Mountain view'),
    ('Countryside'),
    ('Isolated'),
    ('Family-friendly'),
    ('Pet-friendly'),
    ('Close to hiking trails');

-- Insert Ameneties
INSERT INTO Amenity (name)
VALUES
    ('WiFi'),
    ('Sauna'),
    ('Air conditioning'),
    ('Electricity'),
    ('BBQ area'),
    ('Swimming pool'),
    ('Hot tub'),
    ('Shared kitchen'),
    ('Private bathroom'),
    ('Laundry facilities'),
    ('Playground'),
    ('Campfire allowed'),
    ('Parking'),
    ('Wheelchair accessible'),
    ('Pet-friendly');

-- Link Tags to Camping Spots
INSERT INTO CampingSpotTag (camping_spot_id, tag_id)
VALUES
    (1, 1), -- Camp Sunny -> Forest
    (2, 1), -- Forest Edge -> Forest
    (3, 2); -- Seaside Retreat -> Beach
    
-- Link ameneties to Camping Spots
INSERT INTO CampingSpotAmenity (camping_spot_id, amenity_id)
VALUES
    (1, 1), -- Camp Sunny -> Forest
    (1, 5),
    (2, 1), -- Forest Edge -> Forest
    (2, 5),
    (3, 1), -- Seaside Retreat -> Beach
    (3, 2);
    
    
-- insert unavailabilties
-- INSERT INTO UnavailableDates (camping_spot_id, start_date, end_date, reason)
-- VALUES
--     (1, '2025-01-01', '2025-01-05', 'Owner Unavailability'),
--     (1, '2025-01-10', '2025-01-15', 'Booking'),
--     (2, '2025-02-01', '2025-02-10', 'Owner Unavailability');
    
-- DELETE FROM Booking
-- WHERE booking_id = 1;


